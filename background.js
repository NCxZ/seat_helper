let monitoringInterval = null;
let currentConfig = null;

// Listen for network requests to capture the Authorization token
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const authHeader = details.requestHeaders.find(h => h.name.toLowerCase() === 'authorization');
        if (authHeader) {
            // Store ALL headers to ensure we mimic the browser request exactly (needed for unit-id etc.)
            const headers = {};
            details.requestHeaders.forEach(h => {
                // Filter out unsafe headers that browser might reject or auto-fill
                if (!['content-length', 'host', 'connection', 'origin', 'referer', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user', 'sec-fetch-dest', 'accept-encoding'].includes(h.name.toLowerCase())) {
                    headers[h.name] = h.value;
                }
            });

            chrome.storage.local.set({
                'authToken': authHeader.value,
                'apiHeaders': headers
            }, () => {
                console.log('Auth token and headers captured.');
            });
        }
    },
    { urls: ["*://web-api-prod-ytp.tcddtasimacilik.gov.tr/*"] },
    ["requestHeaders", "extraHeaders"]
);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_MONITORING") {
        startMonitoring(request.config);
        sendResponse({ status: "started" });
    } else if (request.action === "STOP_MONITORING") {
        stopMonitoring();
        sendResponse({ status: "stopped" });
    } else if (request.action === "FETCH_SEFERLER") {
        postRequest(request.url, request.body, request.token, request.apiHeaders)
            .then(data => sendResponse({ data: data }))
            .catch(err => sendResponse({ error: err.message }));
        return true; // Keep message channel open for async response
    } else if (request.action === "FETCH_STATIONS") {
        fetchStations()
            .then(data => sendResponse({ data: data }))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }
});

// Load state on startup
chrome.storage.local.get(['monitoringConfig', 'isMonitoring'], (data) => {
    if (data.isMonitoring && data.monitoringConfig) {
        startMonitoring(data.monitoringConfig);
    }
});

function startMonitoring(config) {
    if (monitoringInterval) clearInterval(monitoringInterval);
    currentConfig = config;
    chrome.storage.local.set({ isMonitoring: true, monitoringConfig: config });

    console.log("Monitoring started with config:", config);
    checkSeats(); // Immediate check
    monitoringInterval = setInterval(checkSeats, 10000); // Check every 10 seconds
}

function stopMonitoring() {
    if (monitoringInterval) clearInterval(monitoringInterval);
    monitoringInterval = null;
    currentConfig = null;
    chrome.storage.local.set({ isMonitoring: false });
    console.log("Monitoring stopped.");
}

async function checkSeats() {
    if (!currentConfig) return;

    const { departure, arrival, apiDate, time, departureId, arrivalId } = currentConfig;

    // Get token and headers
    const { authToken, apiHeaders } = await chrome.storage.local.get(["authToken", "apiHeaders"]);
    if (!authToken) {
        console.error("No auth token available. Please refresh TCDD page.");
        return;
    }

    const seferUrl = "https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability?environment=dev&userId=1";

    // Reconstruct body for new API
    // Note: apiDate should be "DD-MM-YYYY HH:mm:ss" formatted from popup
    const seferBody = {
        searchRoutes: [{
            departureStationId: departureId,
            departureStationName: departure,
            arrivalStationId: arrivalId,
            arrivalStationName: arrival,
            departureDate: apiDate
        }],
        passengerTypeCounts: [{ id: 0, count: 1 }],
        searchReservation: false,
        searchType: "DOMESTIC",
        blTrainTypes: []
    };

    try {
        const responseData = await postRequest(seferUrl, seferBody, authToken, apiHeaders);
        if (!responseData || !Array.isArray(responseData)) {
            console.log("Check seats: Invalid response or no trains", responseData);
            return;
        }

        // The response is an array of train availabilities directly or wrapped? 
        // Based on subagent, it contains trainLegs and trainAvailabilities.
        // Let's assume responseData IS the list of result objects.

        // Find the target train by time.
        // The API returns 'departureDate' usually as "YYYY-MM-DDTHH:mm:ss" or similar ISO?
        // Subagent said "departureDate: 31-12-2025 21:00:00".
        // We need to match the time "HH:mm" from config.time.

        // Flatten the structure if needed, but likely responseData is [ { trainAvailabilityId:..., trainLegs: [...] } ]

        const targetSefer = responseData.find(sefer => {
            // Find departure time in trainLegs[0]
            if (!sefer.trainLegs || sefer.trainLegs.length === 0) return false;

            // Extract time from departureDate string. 
            // Format seen: "31-12-2025 21:00:00" -> This looks like DD-MM-YYYY HH:mm:ss in request, but response might be ISO?
            // Let's assume response matches standard or construct a Date.
            // Safe parsing:
            const leg = sefer.trainLegs[0];
            const dDate = leg.departureDate; // e.g. "2025-12-31T06:00:00" or generic

            // Use simple string match if format is consistent, or Date parse
            // If date is "YYYY-MM-DDTHH:mm:ss", splice.
            // If date is "DD-MM-YYYY HH:mm:ss", splice.

            // Let's try to parse into "HH:mm"
            let timeStr = "";
            if (dDate.includes("T")) {
                timeStr = dDate.split("T")[1].substring(0, 5);
            } else {
                // Assume "DD-MM-YYYY HH:mm:ss" -> split space, get 2nd part
                const parts = dDate.split(" ");
                if (parts.length > 1) {
                    timeStr = parts[1].substring(0, 5);
                }
            }

            return timeStr === time;
        });

        if (targetSefer) {
            console.log(`Checking train at ${time}`);

            // Check trainAvailabilities
            // Structure assumption: targetSefer.trainAvailabilities is array of objects { classId, remainingSeatCount?, ... }
            // Subagent said "Capacities: Business (16 seats)".

            // We'll iterate and look for ANY positive capacity.
            if (targetSefer.trainAvailabilities) {
                const hasSeat = targetSefer.trainAvailabilities.some(av => {
                    // Check common keys for capacity
                    const cap = av.capacity || av.remainingSeatCount || av.emptySeatCount || 0;
                    return cap > 0;
                });

                if (hasSeat) {
                    console.log(`FOUND SEATS for ${time}!`);
                    stopMonitoring();
                    // Pass 0, 0 as dummy vagon/seat since we don't know exact ones yet.
                    notifyAndAct(currentConfig, targetSefer.trainAvailabilityId, "Any", "Found");
                    return;
                }
            }
        }

    } catch (err) {
        console.error("Check loop error:", err);
    }
}

async function postRequest(url, body, token, savedHeaders = {}) {
    console.log(`Sending POST to ${url}`);

    // Merge saved headers with required overrides
    const headers = { ...savedHeaders };
    headers["Content-Type"] = "application/json";
    headers["Authorization"] = token; // Ensure token is fresh

    // Force specific headers to bypass origin checks
    headers["Origin"] = "https://ebilet.tcddtasimacilik.gov.tr";
    headers["Referer"] = "https://ebilet.tcddtasimacilik.gov.tr/";
    headers["unit-id"] = "3895"; // CRITICAL: Missing in previous logs
    headers["channelId"] = "3";
    // headers["Sec-Fetch-Site"] = "same-site";
    // headers["Sec-Fetch-Mode"] = "cors";

    console.log("Final Headers for Request:", JSON.stringify(headers));

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });

    console.log(`Response Status: ${response.status}`);

    if (response.status === 401) {
        // Try to read body if possible
        try {
            const errText = await response.text();
            console.error("401 Unauthorized Body:", errText);
        } catch (e) { }

        stopMonitoring();
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Oturum Süresi Doldu',
            message: 'Lütfen TCDD bilet sayfasını yenileyerek oturumunuzu tazeleyin.'
        });
        throw new Error("Unauthorized");
    }

    if (!response.ok) throw new Error(response.statusText);
    return response.json();
}

async function notifyAndAct(config, seferId, vagonNo, koltukNo) {
    // Notify User
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Bilet Bulundu!',
        message: `Koltuk: ${koltukNo}, Vagon: ${vagonNo}. TCDD sekmesi açılıyor.`
    });

    // Find or Open TCDD Tab
    const tabs = await chrome.tabs.query({ url: "*://ebilet.tcddtasimacilik.gov.tr/*" });
    let tabId;
    if (tabs.length > 0) {
        tabId = tabs[0].id;
        await chrome.tabs.update(tabId, { active: true });
    } else {
        const tab = await chrome.tabs.create({ url: "https://ebilet.tcddtasimacilik.gov.tr/" });
        tabId = tab.id;
        // Wait for load
        await new Promise(r => setTimeout(r, 5000));
    }

    // Inject Script to Automate
    // Note: We need to pass the parameters
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: automateBooking,
        args: [config, vagonNo, koltukNo]
    });
}

// this function runs IN THE PAGE context
async function automateBooking(config, vagonNo, koltukNo) {
    console.log("Automation started...", config);

    const waitFor = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) return resolve(document.querySelector(selector));
            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject("Timeout waiting for " + selector);
            }, timeout);
        });
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    try {
        // Step 1: Search Form
        const fromInput = document.getElementById("nereden");
        const toInput = document.getElementById("nereye");
        const dateInput = document.getElementById("trCalGid_input");
        const searchBtn = document.getElementById("btnSeferSorgula");

        if (!fromInput || !toInput) {
            alert("Ana sayfada değilsiniz veya form bulunamadı.");
            return;
        }

        fromInput.value = config.departure;
        toInput.value = config.arrival;

        // Date format handling: config.originalDateFormatted is assumed to be passed or reconstruct it.
        // Assuming config.date is "Short Month Day, Year Time" format used in API, we need "DD.MM.YYYY" for UI?
        // Let's rely on the user having the correct simple date format in config if possible, or parse it.
        // Actually, let's use the one passed in config.simpleDate (we should add this to config).
        if (config.simpleDate) dateInput.value = config.simpleDate;

        searchBtn.click();

        // Step 2: Select Train
        await waitFor("tbody#mainTabView\\:gidisSeferTablosu_data");
        await sleep(1000); // Allow render

        const rows = document.querySelectorAll("tbody#mainTabView\\:gidisSeferTablosu_data tr");
        let trainFound = false;

        for (const row of rows) {
            const timeEl = row.querySelector("span.seferSorguTableBuyuk");
            if (timeEl && timeEl.textContent.trim() === config.time) {
                const btn = row.querySelector("div.seferSecButton");
                if (btn) {
                    btn.click();
                    trainFound = true;
                    break;
                }
            }
        }

        if (!trainFound) throw new Error("Train not found in list");

        // Wait for Continue button and click
        const continueBtn = await waitFor("[id='mainTabView:btnDevam44']");
        continueBtn.click();

        // Step 3: Select Wagon
        // Wait for wagons to load
        await waitFor("div.vagonHaritaDiv");
        await sleep(2000);

        // This part is tricky because vagon indices might not match 1:1 with displayed text or order.
        // We usually need to find the button that has text "Vagon <vagonNo>" or similar?
        // Or if we know the index. The previous code used index.
        // Let's try to find by text if possible, or fallback to index.

        // Actually, the API gives vagonSiraNo. The UI usually lists them.
        // Let's assume the previous logic of `mainTabView:j_idt206:${vagonNo - 1}:gidisVagonlariGost` was correct for INDEX based.
        // But vagonSiraNo might be just an ID.
        // Let's look for any element containing the text of the vagon number?

        // Safe bet: Try the dynamic ID approach from old code, but wrap in try/catch or search.
        // Let's iterate buttons.
        const vagonButtons = document.querySelectorAll("button.vagonText");
        let vagonBtn = null;
        // Basic search
        vagonButtons.forEach(b => {
            if (b.textContent.includes(vagonNo.toString())) vagonBtn = b;
        });

        if (vagonBtn) {
            vagonBtn.click();
        } else {
            console.warn("Could not match vagon number exactly, trying index assumption...");
            // Fallback to old selector attempt
            // Note: ID selectors with colons need escaping
            const fallbackSelector = `[id='mainTabView:j_idt206:${vagonNo - 1}:gidisVagonlariGost']`;
            const fbBtn = document.querySelector(fallbackSelector);
            if (fbBtn) fbBtn.click();
        }

        // Step 4: Select Seat
        await sleep(2000); // Wait for seat map
        // Seat checkboxes typically have value=koltukNo
        const seatCheckbox = document.querySelector(`input.ui-wagon-item-checkbox[value='${koltukNo}']`);
        if (seatCheckbox) {
            seatCheckbox.click();
            // Scroll to it
            seatCheckbox.scrollIntoView();
        } else {
            throw new Error(`Seat ${koltukNo} not found in UI`);
        }

        // Step 5: Gender
        await sleep(1000);
        // Prompt user or auto select if we had gender info. Config should have it.
        if (config.gender) {
            const form = await waitFor("form#cinsiyet_secimi_form");
            // Male: 2nd child? Female: 3rd? Need verification.
            // Usually buttons have text "Erkek" or "Kadın".
            const buttons = form.querySelectorAll("button");
            for (const b of buttons) {
                if (config.gender === "Erkek" && b.textContent.includes("Bay")) b.click();
                if (config.gender === "Kadın" && b.textContent.includes("Bayan")) b.click();
            }
        }

        alert("Bilet Bulundu ve Seçildi! Lütfen ödeme adımına ilerleyin.");

    } catch (e) {
        console.error("Automation error:", e);
        alert("Otomasyon hatası: " + e.message);
    }
}

async function fetchStations() {
    console.log("Fetching stations from API...");

    try {
        // The station list is hosted on a CDN and does not require complex auth headers.
        // It seems to be a static file.
        // URL: https://cdn-api-prod-ytp.tcddtasimacilik.gov.tr/datas/stations.json?environment=dev&userId=1

        const response = await fetch("https://cdn-api-prod-ytp.tcddtasimacilik.gov.tr/datas/stations.json?environment=dev&userId=1", {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Station fetch failed: ${response.status}`);
        }

        const data = await response.json();

        // This endpoint returns current valid stations array directly: [{name:..., id:...}, ...]
        if (Array.isArray(data)) {
            return data;
        } else if (data && data.stations) {
            return data.stations;
        } else {
            throw new Error("Invalid station data structure");
        }
    } catch (error) {
        console.error("Station fetch error:", error);
        throw error;
    }
}
