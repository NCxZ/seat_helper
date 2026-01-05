let monitoringInterval = null;
let currentConfig = null;
let isChecking = false;
let cachedTrains = null;

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
    cachedTrains = null;
    chrome.storage.local.set({ isMonitoring: true, monitoringConfig: config });

    console.log("Monitoring started with config:", config);
    checkSeats(); // Immediate check
    monitoringInterval = setInterval(checkSeats, 1000); // Check every 1 second
}

function stopMonitoring() {
    if (monitoringInterval) clearInterval(monitoringInterval);
    monitoringInterval = null;
    currentConfig = null;
    chrome.storage.local.set({ isMonitoring: false });
    console.log("Monitoring stopped.");
}

let bookingClasses = [];

async function fetchBookingClasses() {
    try {
        const response = await fetch("https://cdn-api-prod-ytp.tcddtasimacilik.gov.tr/datas/booking-classes.json?environment=dev&userId=1");
        if (response.ok) {
            bookingClasses = await response.json();
            console.log("Booking classes loaded:", bookingClasses.length);
        }
    } catch (e) {
        console.error("Failed to load booking classes:", e);
    }
}

// Call immediately
fetchBookingClasses();

async function checkSeats() {
    if (!currentConfig) return;
    if (isChecking) {
        console.log("Check skipped - previous check still in progress.");
        return;
    }
    isChecking = true;

    try {

        const { departure, arrival, apiDate, time, departureId, arrivalId, gender } = currentConfig;

        // Get token and headers
        const { authToken, apiHeaders } = await chrome.storage.local.get(["authToken", "apiHeaders"]);
        if (!authToken) {
            console.error("No auth token available. Please refresh TCDD page.");
            return;
        }

        // Optimized: Use cached trains if available, otherwise fetch
        let matchingTrains = [];

        if (cachedTrains && cachedTrains.length > 0) {
            matchingTrains = cachedTrains;
        } else {
            console.log("Fetching train list (First run only)...");
            const seferUrl = "https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability?environment=dev&userId=1";

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
                blTrainTypes: ["TURISTIK_TREN"]
            };

            // Ensure booking classes are loaded
            if (bookingClasses.length === 0) await fetchBookingClasses();

            const responseData = await postRequest(seferUrl, seferBody, authToken, apiHeaders);

            let allTrains = [];
            if (responseData && responseData.trainLegs && responseData.trainLegs.length > 0) {
                responseData.trainLegs.forEach(leg => {
                    if (leg.trainAvailabilities) {
                        leg.trainAvailabilities.forEach(availability => {
                            if (availability && Array.isArray(availability.trains)) {
                                allTrains.push(...availability.trains);
                            }
                        });
                    }
                });
            } else if (Array.isArray(responseData)) {
                allTrains = responseData;
            }

            if (allTrains.length === 0) {
                console.log("Check seats: No trains found.");
                return;
            }

            const matchesTimes = currentConfig.times || [currentConfig.time];
            matchingTrains = allTrains.filter(train => {
                let timeStr = "";
                if (train.segments && train.segments.length > 0) {
                    const d = new Date(train.segments[0].departureTime);
                    timeStr = d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
                }
                return matchesTimes.includes(timeStr);
            });

            if (matchingTrains.length > 0) {
                console.log(`Caching ${matchingTrains.length} matching trains for future checks.`);
                cachedTrains = matchingTrains;
            } else {
                console.warn("No matching trains found for the selected time.");
                return;
            }
        }

        for (const targetTrain of matchingTrains) {
            console.log(`Checking train: ${targetTrain.name} (${targetTrain.id})`);



            try {
                const seatMapUrl = "https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/seat-maps/load-by-train-id?environment=dev&userId=1";
                const seatMapBody = {
                    fromStationId: departureId,
                    toStationId: arrivalId,
                    trainId: targetTrain.id,
                    legIndex: 0
                };
                const seatMapData = await postRequest(seatMapUrl, seatMapBody, authToken, apiHeaders);

                if (seatMapData && seatMapData.seatMaps) {
                    let foundVagon = null;
                    let foundSeat = null;
                    let foundTrainCarId = null;

                    // Iterate over wagons in the response
                    for (let i = 0; i < seatMapData.seatMaps.length; i++) {
                        const wagon = seatMapData.seatMaps[i];
                        // User Logic: Check if availableSeatCount > 0
                        if (wagon.availableSeatCount > 0) {
                            // Get all sellable seats in this wagon
                            const allSeats = wagon.seatPrices || [];
                            // Get occupied/allocated seats
                            const occupiedSeats = wagon.allocationSeats || [];

                            // Filter: Purchasable = All - Occupied
                            const purchasableSeats = allSeats.filter(seat => {
                                // Check if this seat number exists in occupied list
                                const isOccupied = occupiedSeats.some(occ => occ.seatNumber === seat.seatNumber);
                                return !isOccupied;
                            });

                            if (purchasableSeats.length > 0) {
                                const vagonInfo = wagon.wagonNo || (i + 1);
                                console.log(`[${targetTrain.name} - ${vagonInfo}. Vagon] Purchasable Seats:`, JSON.stringify(purchasableSeats));
                                // Now filter by User Allowed Ticket Types (Classes)
                                const allowedClasses = currentConfig.allowedClasses || {};
                                console.log("Allowed Classes for Check:", JSON.stringify(allowedClasses));

                                const validSeat = purchasableSeats.find(seat => {
                                    // 1. Direct ID Match (New Logic)
                                    for (const key in allowedClasses) {
                                        const val = allowedClasses[key];
                                        if (val && typeof val === 'object' && val.checked && val.id === seat.cabinClassId) {
                                            return true;
                                        }
                                    }

                                    // 2. Fallback: Name Match (Old Logic)
                                    const classInfo = bookingClasses.find(bc => bc.cabinClass && bc.cabinClass.id === seat.cabinClassId);
                                    if (classInfo) {
                                        const val = allowedClasses[classInfo.name];
                                        if (val === true) return true; // Legacy boolean
                                        if (val && typeof val === 'object' && val.checked) return true; // New object match by name
                                    }
                                    return false;
                                });

                                if (validSeat) {
                                    // Found a valid match!
                                    // Wagon numbering logic: user said trainIndex 0 -> 1. vagon.
                                    // But usually wagon.wagonNo is available. Use it if present, else fallback.
                                    foundVagon = wagon.wagonNo || (i + 1).toString();
                                    foundSeat = validSeat.seatNumber;
                                    foundTrainCarId = wagon.trainCarId; // User said trainCarId is here

                                    console.log(`FOUND SPECIFIC SEAT: Vagon ${foundVagon}, Seat ${foundSeat}, ClassId: ${validSeat.cabinClassId}`);
                                    break;
                                }
                            }
                        }
                    }

                    if (foundVagon && foundSeat && foundTrainCarId) {
                        console.log(`STOPPING: Proceeding with Vagon ${foundVagon}, Seat ${foundSeat}`);
                        const configToUse = { ...currentConfig };

                        let targetTime = "Any";
                        if (targetTrain.segments && targetTrain.segments.length > 0) {
                            const d = new Date(targetTrain.segments[0].departureTime);
                            targetTime = d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
                        }

                        stopMonitoring();

                        // Found specific seat - Stop monitoring and proceed to booking
                        console.log("Proceeding to UI automation...");

                        notifyAndAct(configToUse, targetTrain.id, foundVagon, foundSeat, targetTime);
                        return;
                    }
                }
            } catch (e) {
                console.error("Error identifying specific seat:", e);
            }
        }

    } catch (err) {
        console.error("Check loop error:", err);
    } finally {
        isChecking = false;
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
    headers["unit-id"] = "3895";
    headers["channelId"] = "3";

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

async function notifyAndAct(config, seferId, vagonNo, koltukNo, targetTime) {
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
        args: [{ ...config, vagonNo, koltukNo, targetTime }]
    });
}

// this function runs IN THE PAGE context
async function automateBooking(config) {
    const { vagonNo, koltukNo, targetTime } = config;
    console.log("Automation started with config:", config, "Target Time:", targetTime);

    // Ensure we use the specific train time found by the monitor
    config.time = targetTime || config.time || (config.times ? config.times[0] : "");

    const selectors = {
        fromInput: "#fromTrainInput",
        toInput: "#toTrainInput",
        dateInput: "input[placeholder='GidişTarihi']",
        searchBtn: "#searchSeferButton",
        trainRow: (time) => `button[id^='gidis'][id$='btn']`, // We'll filter this by time in code
        selectBtn: ".btn-danger", // "Seçin" button
        continueBtn: ".btnContinue",
        vagonButton: "button.btnWagon, .wagonMap button, button.vagonText",
        seatCheckbox: (no) => `input.ui-wagon-item-checkbox[value='${no}'], input[id*='${no}'], label[for*='${no}'], [data-seat-no='${no}']`
    };

    const waitFor = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const target = document.querySelector(selector);
                if (target) {
                    observer.disconnect();
                    resolve(target);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error("Timeout waiting for " + selector));
            }, timeout);
        });
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const fillStation = async (inputSelector, value) => {
        console.log(`Filling station: ${value} into ${inputSelector}`);
        const input = await waitFor(inputSelector);

        // Wait if disabled (especially for 'To' input)
        let attempts = 0;
        while (input.disabled && attempts < 50) {
            await sleep(100);
            attempts++;
        }

        input.focus();
        input.value = ""; // Clear first
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Type character by character to trigger search
        for (const char of value) {
            input.value += char;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            await sleep(5);
        }

        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Optimize wait: check for dropdown items or timeout fast
        try { await waitFor('.dropdown-item.station', 300); } catch (e) { }
        await sleep(100);

        // User suggested: Press ArrowDown then Enter to select from autocomplete
        console.log(`Sending ArrowDown and Enter to ${inputSelector}`);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
        await sleep(100);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        await sleep(200);

        // TCDD site uses .dropdown-item.station buttons - Backup click if Enter didn't select it
        const items = Array.from(document.querySelectorAll('.dropdown-item.station')).filter(el => {
            const loc = el.querySelector('.textLocation');
            const text = (loc ? loc.innerText : el.innerText).toUpperCase();
            // Match the station name
            return text.includes(value.toUpperCase()) && el.offsetParent !== null;
        });

        if (items.length > 0) {
            console.log(`Clicking dropdown item for ${value} as fallback/confirmation`);
            items[0].click();
            await sleep(200);
        }
    };

    try {
        // Step 1: Search Form
        let fromEl = document.querySelector(selectors.fromInput);
        if (!fromEl) {
            // Check if we are already on results page
            const resultsCheck = document.querySelector(selectors.continueBtn) || document.querySelector("button[id^='gidis']");
            if (resultsCheck) {
                console.log("Already on results page, skipping search form.");
            } else {
                alert("Ana sayfada değilsiniz veya form bulunamadı. Lütfen TCDD anasayfasına gidin.");
                return;
            }
        } else {
            console.log("Filling search form...");
            await fillStation(selectors.fromInput, config.departure);
            await fillStation(selectors.toInput, config.arrival);

            const dateEl = document.querySelector(selectors.dateInput);
            if (dateEl) {
                console.log(`Selecting date using Datepicker UI: ${config.simpleDate}`);
                const [targetDay] = config.simpleDate.split('.'); // Get "05" from "05.01.2026"
                const dayInt = parseInt(targetDay, 10).toString();

                dateEl.focus();
                dateEl.click(); // Open Datepicker
                await sleep(300);

                // Find the day in the calendar grid (handles multiple months if visible)
                const calendarTables = document.querySelectorAll('.calendar-table');
                let daySelected = false;

                if (calendarTables.length > 0) {
                    // Usually the first calendar is the current/target month if we just opened it
                    const firstCalendar = calendarTables[0];
                    const dayElements = Array.from(firstCalendar.querySelectorAll('span, td'));

                    // Filter for the exact day number. We avoid 'next-month' or 'prev-month' classes if present
                    const dayToClick = dayElements.find(el =>
                        el.textContent.trim() === dayInt &&
                        !el.classList.contains('off') && // commonly used for other month days
                        el.offsetParent !== null
                    );

                    if (dayToClick) {
                        console.log(`Clicking day ${dayInt} in calendar.`);
                        dayToClick.click();
                        daySelected = true;
                    }
                }

                if (!daySelected) {
                    console.warn("Could not find day in datepicker, falling back to basic value set.");
                    dateEl.value = config.simpleDate;
                    dateEl.dispatchEvent(new Event('input', { bubbles: true }));
                    dateEl.dispatchEvent(new Event('change', { bubbles: true }));
                }

                await sleep(300);
                document.body.click(); // Ensure overlay is closed
            }

            const searchBtn = document.querySelector(selectors.searchBtn);
            if (searchBtn) {
                console.log("Clicking Search Button...");
                await sleep(200);
                searchBtn.click();
                // Wait for the results page to start loading and old results to clear
                await sleep(500);
            } else {
                throw new Error("Arama butonu bulunamadı.");
            }
        }

        // Step 2: Select Train in Results
        console.log("Waiting for results...");
        await waitFor("button[id^='gidis']", 20000);
        await sleep(500); // Wait for full render

        const trainButtons = Array.from(document.querySelectorAll("button[id^='gidis'][id$='btn']"));
        let targetButton = null;

        console.log(`Searching for train at ${config.time}...`);
        for (const btn of trainButtons) {
            const timeEl = btn.querySelector('time');
            const btnText = btn.innerText;
            if ((timeEl && timeEl.innerText.includes(config.time)) || btnText.includes(config.time)) {
                targetButton = btn;
                break;
            }
        }

        if (targetButton) {
            console.log("Found train button, clicking to expand...");
            targetButton.click();
            await sleep(500);

            // TCDD results page expands a section containing vagon types and a "Seçin" button
            const expandedAreaId = targetButton.getAttribute('data-target') || targetButton.id.replace('btn', '');
            const expandedArea = document.querySelector(expandedAreaId) || targetButton.closest('.card').querySelector('.collapse');

            if (expandedArea) {
                // Step 2.1: Select Vagon Type (Economy/Business etc.)
                const vagonTypeButtons = Array.from(expandedArea.querySelectorAll('button.btnTicketType'));
                const allowed = config.allowedClasses || {};

                let vagonSelected = false;
                for (const vBtn of vagonTypeButtons) {
                    const typeText = vBtn.innerText.toUpperCase();
                    // Match against allowed classes (e.g. "EKONOMİ", "BUSINESS"/"BUSİNESS")
                    const isAllowed = Object.keys(allowed).some(cls =>
                        allowed[cls] === true &&
                        (typeText.includes(cls.toUpperCase()) || cls.toUpperCase().includes(typeText.replace('İ', 'I')))
                    );

                    if (isAllowed && !vBtn.classList.contains('disabled')) {
                        console.log(`Selecting vagon type: ${typeText}`);
                        vBtn.click();
                        vagonSelected = true;
                        await sleep(300);
                        break;
                    }
                }

                if (!vagonSelected && vagonTypeButtons.length > 0) {
                    console.warn("None of the allowed classes were selectable or found, proceeding with default.");
                }

                // Step 2.2: Click "Seçin" button
                const selectBtn = expandedArea.querySelector('button.btn-danger') || await waitFor(selectors.selectBtn);
                if (selectBtn) {
                    console.log("Clicking 'Seçin' button...");
                    selectBtn.click();
                    await sleep(300);
                }
            }

            // Step 2.3: Look for "Devam Et" button to move to seat selection
            try {
                const continueBtn = await waitFor(selectors.continueBtn, 5000);
                console.log("Clicking Continue button...");
                continueBtn.click();
            } catch (e) {
                console.warn("Continue button not found immediately, might be on next page or handled.");
            }
        } else {
            throw new Error(`Saat ${config.time} için uygun sefer bulunamadı.`);
        }

        // Step 3: Seat Selection Page
        console.log(`Waiting for seat selection page... Target: Vagon ${vagonNo}, Seat ${koltukNo}`);
        try {
            // Try to wait for any of the vagon buttons to appear
            await waitFor(selectors.vagonButton, 20000);
        } catch (e) {
            console.warn("Vagon butonları standart seçiciyle bulunamadı, alternatif aranıyor...");
            // Manual fallback wait if the specific selector fails
            await sleep(5000);
        }
        await sleep(1500); // Give extra time for layout to stabilize

        // Select Vagon
        const vagonButtons = Array.from(document.querySelectorAll(selectors.vagonButton));
        let vagonBtnFound = false;
        console.log(`Looking for Vagon: ${vagonNo} among ${vagonButtons.length} buttons`);

        for (const b of vagonButtons) {
            const bText = b.textContent.trim().toUpperCase();
            const target = vagonNo.toString().toUpperCase();

            // Match "2" with "2. VAGON" or "2.VAGON" or exact match
            const isMatch = bText === target ||
                bText.startsWith(target + ".") ||
                bText.startsWith(target + " ") ||
                bText.includes(target + ". VAGON");

            if (isMatch) {
                console.log(`MATCH FOUND! Clicking Vagon button: ${bText}`);
                b.click();
                vagonBtnFound = true;
                break;
            }
        }

        if (!vagonBtnFound && vagonButtons.length > 0) {
            console.warn(`Vagon ${vagonNo} tam olarak bulunamadı. Metinler:`, vagonButtons.map(b => b.textContent.trim()));
            // Try fallback: click by index if vagonNo is small and button text contains it
            const fallback = vagonButtons.find(b => b.textContent.includes(vagonNo.toString()));
            if (fallback) {
                console.log("Using non-exact fallback for vagon selection...");
                fallback.click();
                vagonBtnFound = true;
            } else {
                console.log("Falling back to first wagon.");
                vagonButtons[0].click();
            }
        }

        await sleep(500);

        // Select Seat
        console.log(`Attempting to select seat: ${koltukNo}`);

        const findSeatElement = (seatNo) => {
            const noLower = seatNo.toLowerCase();
            // Strategy 1: seatNumber div
            const seatNumberDivs = Array.from(document.querySelectorAll('.seatNumber'));
            const matchingSeatDiv = seatNumberDivs.find(div => div.textContent.trim().toLowerCase() === noLower);
            if (matchingSeatDiv) return matchingSeatDiv.closest('.seatMapClick');

            // Strategy 2: Checkbox/Input value
            const input = document.querySelector(selectors.seatCheckbox(seatNo));
            if (input) return input.closest('.seatMapClick') || input;

            return null;
        };

        const isSeatSelected = () => {
            // Check if any expected input is checked
            const checkedInput = document.querySelector("input[name='seatIds']:checked, input.ui-wagon-item-checkbox:checked");

            // Legacy form check
            const genderForm = document.querySelector("#cinsiyet_secimi_form");
            const isGenderFormVisible = genderForm && genderForm.offsetParent !== null;

            // New Popover check (Crucial fix)
            const popoverBody = document.querySelector(".popover-body");
            const isPopoverVisible = popoverBody && popoverBody.offsetParent !== null;

            console.log("Selection Check:", { checkedInput: !!checkedInput, isGenderFormVisible, isPopoverVisible });

            return !!checkedInput || isGenderFormVisible || isPopoverVisible;
        };

        let seatEl = findSeatElement(koltukNo);
        let selectionSuccess = false;

        if (seatEl) {
            console.log(`Found element for ${koltukNo}, clicking...`);
            // seatEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Removed as requested
            // await sleep(500); // Removed wait

            // Robust Click
            seatEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            seatEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            seatEl.click();
            seatEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

            await sleep(100); // Wait for potential network request/UI update

            if (isSeatSelected()) {
                console.log(`Seat ${koltukNo} successfully selected.`);
                selectionSuccess = true;
            } else {
                console.warn(`Click on ${koltukNo} did not result in selection. Maybe occupied.`);
            }
        } else {
            console.warn(`Specific seat element for ${koltukNo} not found.`);
        }

        // --- NO FALLBACK: Only specific seat selection is allowed ---
        // If the specific seat was not found or selectable, we stop here.

        if (!selectionSuccess) {
            alert("Otomasyon: İstenen koltuk ve diğer alternatifler seçilemedi. Lütfen manuel seçiniz.");
            return;
        }

        // Step 4: Gender Selection
        if (config.gender) {
            console.log("Handling gender selection for:", config.gender);
            // Wait for gender popover to appear
            await sleep(50);

            const isWomen = config.gender === "Kadın" || config.gender === "W";
            try {
                // Robust approach: Look for specific images anywhere in the document
                let genderBtn = null;
                // Retry getting buttons by position
                for (let k = 0; k < 15; k++) {
                    const btns = document.querySelectorAll(".popover-body .popoverBtn");
                    if (btns.length >= 2) {
                        // Index 0: Women, Index 1: Men
                        if (isWomen) {
                            genderBtn = btns[0];
                        } else {
                            genderBtn = btns[1];
                        }
                        break;
                    }
                    await sleep(200);
                }

                if (genderBtn) {
                    console.log("Gender button found. Clicking...");
                    genderBtn.click();
                } else {
                    console.warn(`Gender button (positional) not found after wait.`);
                }

            } catch (err) {
                console.error("Error selecting gender:", err);
            }
        }


        // Final Success Message
        console.log("Booking automation completed successfully.");
        // Play sound or notification if possible (in context usually not allowed, but alert works)
        // We use a non-blocking notification approach primarily, but alert stops the user to pay attention

        // Check if there is a confirm button or if the user just needs to pay
        // alert("Bilet seçildi! Ödeme adımına geçebilirsiniz.");

        // Create a visual indicator on the page
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '20px';
        overlay.style.right = '20px';
        overlay.style.backgroundColor = '#4CAF50';
        overlay.style.color = 'white';
        overlay.style.padding = '20px';
        overlay.style.zIndex = '99999';
        overlay.style.fontSize = '16px';
        overlay.style.borderRadius = '5px';
        overlay.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        overlay.innerText = "BİLET SEÇİLDİ! Lütfen Ödeme Yapın.";
        document.body.appendChild(overlay);

        // Remove after 5 seconds
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 5000);

    } catch (e) {
        console.error("Automation error:", e);
        alert("Otomasyon sırasında hata: " + e.message);
    }
}

async function fetchStations() {
    console.log("Fetching stations from API...");

    try {
        const response = await fetch("https://cdn-api-prod-ytp.tcddtasimacilik.gov.tr/datas/stations.json?environment=dev&userId=1", {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Station fetch failed: ${response.status}`);
        }

        const data = await response.json();

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
