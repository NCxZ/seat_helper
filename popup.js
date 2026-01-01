let stationsList = {};
let authToken = null;
let apiHeaders = {};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check for Auth Token and Headers
    const data = await chrome.storage.local.get(["authToken", "apiHeaders"]);
    if (data.authToken) {
        if (data.apiHeaders) apiHeaders = data.apiHeaders;

        if (data.authToken.startsWith("Basic")) {
            console.log("Legacy token detected, clearing...");
            authToken = null;
            chrome.storage.local.remove("authToken");
            updateStatus("Token Yok! Lütfen TCDD sayfasını yenileyin.", "red");
        } else {
            authToken = data.authToken;
            updateStatus("Token Hazır", "green");
        }
    } else {
        updateStatus("Token Yok! Lütfen TCDD sayfasını yenileyin.", "red");
    }

    // 2. Load Stations
    await loadStations();

    // 3. Restore previous inputs
    restoreInputs();

    // 4. Listeners
    document.getElementById("btn-start").addEventListener("click", startMonitoring);
    document.getElementById("btn-stop").addEventListener("click", stopMonitoring);
    document.getElementById("swap-locations").addEventListener("click", swapLocations);
    document.getElementById("date").addEventListener("change", fetchSeferTimes);
    document.getElementById("departure").addEventListener("change", fetchSeferTimes);
    document.getElementById("arrival").addEventListener("change", fetchSeferTimes);

    // Check if monitoring
    chrome.storage.local.get(['isMonitoring'], (res) => {
        if (res.isMonitoring) {
            setRunningState(true);
        }
    });

    // Listen for storage changes (token update)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.authToken) {
            authToken = changes.authToken.newValue;
            updateStatus("Token Yakalandı!", "green");
        }
    });
});

async function loadStations() {
    updateStatus("İstasyonlar Yükleniyor...", "orange");

    chrome.runtime.sendMessage({ action: "FETCH_STATIONS" }, (response) => {
        if (chrome.runtime.lastError) {
            log("İstasyon listesi yükleme hatası: " + chrome.runtime.lastError.message);
            console.error(chrome.runtime.lastError);
            updateStatus("İstasyon Hatası", "red");
            return;
        }

        if (response && response.error) {
            log("İstasyon listesi sunucudan alınamadı: " + response.error);
            updateStatus("İstasyon Hatası", "red");
            return;
        }

        const stationsArray = response.data;
        stationsList = {};
        const stationNames = [];

        if (Array.isArray(stationsArray)) {
            stationsArray.forEach(s => {
                stationsList[s.name] = s.id;
                stationNames.push(s.name);
            });

            // Sort keys
            stationNames.sort((a, b) => a.localeCompare(b, "tr"));

            const depSelect = document.getElementById("departure");
            const arrSelect = document.getElementById("arrival");

            // Clear existing options
            depSelect.innerHTML = '<option value="" disabled selected>Nereden</option>';
            arrSelect.innerHTML = '<option value="" disabled selected>Nereye</option>';

            stationNames.forEach(name => {
                depSelect.add(new Option(name, name));
                arrSelect.add(new Option(name, name));
            });

            log("İstasyon listesi güncellendi.");
            // Restore status if token is ok
            if (authToken) updateStatus("Token Hazır", "green");
            else updateStatus("Token Yok!", "red");

        } else {
            log("Gelen istasyon verisi hatalı formatta.");
            console.error(response);
        }
    });
}

function updateStatus(text, color) {
    const el = document.getElementById("status-text");
    const icon = document.getElementById("status-icon");
    el.textContent = text;
    icon.style.color = color;
    icon.textContent = color === "green" ? "🟢" : "🔴";
}

function log(msg) {
    const box = document.getElementById("message-log");
    const line = document.createElement("div");
    line.textContent = `> ${msg}`;
    box.prepend(line);
}

function swapLocations() {
    const dep = document.getElementById("departure");
    const arr = document.getElementById("arrival");
    const temp = dep.value;
    dep.value = arr.value;
    arr.value = temp;
    fetchSeferTimes();
}

async function fetchSeferTimes() {
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateVal = document.getElementById("date").value;

    if (!departure || !arrival || !dateVal) {
        log("Lütfen kalkış, varış ve tarih seçiniz.");
        return;
    }

    if (!authToken) {
        log("Hata: Yetkilendirme tokenı yok! Lütfen önce TCDD bilet sayfasını (ebilet.tcddtasimacilik.gov.tr) yan sekmede açın ve yenileyin.");
        updateStatus("Token Bekleniyor", "red");
        return;
    }

    // Convert date to API format
    const [year, month, day] = dateVal.split("-");
    const apiDate = `${day}-${month}-${year} 00:00:00`;
    const formattedDate = `${day}.${month}.${year}`;

    log(`${departure} -> ${arrival} (${formattedDate}) aranıyor...`);

    const departureId = stationsList[departure];
    const arrivalId = stationsList[arrival];

    if (!departureId || !arrivalId) {
        log("Hata: İstasyon ID'si bulunamadı. İstasyon listesi yüklenmemiş olabilir.");
        return;
    }

    const body = {
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

    // Delegate API call to background to avoid CORS/Fetch issues in Popup
    chrome.runtime.sendMessage({
        action: "FETCH_SEFERLER",
        url: "https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability?environment=dev&userId=1",
        body: body,
        token: authToken,
        apiHeaders: apiHeaders // Pass headers if available
    }, (response) => {
        if (chrome.runtime.lastError) {
            log("Bağlantı Hatası: " + chrome.runtime.lastError.message);
            return;
        }

        if (response.error) {
            log("API Hatası: " + response.error);
            return;
        }

        const data = response.data;
        const timeSelect = document.getElementById("time");
        timeSelect.innerHTML = "";

        // Helper to extract trains from new or old structure
        let foundTrains = [];

        if (data.trainLegs && data.trainLegs.length > 0 && data.trainLegs[0].trainAvailabilities) {
            // New Structure
            const availabilities = data.trainLegs[0].trainAvailabilities;
            availabilities.forEach(item => {
                if (item.trains && item.trains.length > 0) {
                    // Usually 1 train per availability for direct trips
                    // If connecting, maybe multiple. We'll take the first one's departure.
                    // The first train in the chain starts the journey.
                    const mainTrain = item.trains[0];

                    // Find departure time. 
                    // It is in mainTrain.trainSegments[0].departureTime (ISO format)
                    if (mainTrain.trainSegments && mainTrain.trainSegments.length > 0) {
                        const depTime = mainTrain.trainSegments[0].departureTime;
                        foundTrains.push({
                            departureDate: depTime,
                            // Keep original data if needed? No, just time for now.
                        });
                    }
                }
            });
        } else if (Array.isArray(data) && data.length > 0) {
            // Old/Other Structure (fallback)
            data.forEach(sefer => {
                if (sefer.trainLegs && sefer.trainLegs.length > 0) {
                    foundTrains.push({
                        departureDate: sefer.trainLegs[0].departureDate
                    });
                }
            });
        }

        if (foundTrains.length > 0) {
            // Sort by time
            foundTrains.sort((a, b) => a.departureDate.localeCompare(b.departureDate));

            foundTrains.forEach(train => {
                const dDate = train.departureDate;
                // Format: "2026-01-02T03:40:00" or "31-12-2025 21:00:00"

                let timeStr = "";
                if (dDate.includes("T")) {
                    // ISO format: 2026-01-02T03:40:00
                    timeStr = dDate.split("T")[1].substring(0, 5);
                } else {
                    // "DD-MM-YYYY HH:mm:ss"
                    const parts = dDate.split(" ");
                    if (parts.length > 1) {
                        timeStr = parts[1].substring(0, 5);
                    } else {
                        timeStr = dDate.substring(11, 16);
                    }
                }

                if (timeStr) {
                    timeSelect.add(new Option(timeStr, timeStr));
                }
            });
            log(`${foundTrains.length} sefer bulundu.`);
        } else {
            log("Bu tarih/güzergah için sefer bulunamadı.");
            console.log("Raw Data:", data);
            timeSelect.add(new Option("Sefer Yok", ""));
        }
    });
}

function startMonitoring() {
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateVal = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const gender = document.getElementById("gender").value;

    if (!departure || !arrival || !dateVal || !time) {
        log("Lütfen tüm alanları doldurun.");
        return;
    }

    // Prepare Config
    const [year, month, day] = dateVal.split("-");
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const fullDateStr = `${formattedDate}`; // Just the date part, the API body creator in background adds the rest or we pass full.
    // Wait, background logic used `${date} 00:00:00 AM`. I should pass the formatted date string "Dec 30, 2025".

    const config = {
        departure,
        arrival,
        departureId: stationsList[departure],
        arrivalId: stationsList[arrival],
        arrivalId: stationsList[arrival],
        date: formattedDate, // for API (legacy/display)
        apiDate: `${day}-${month}-${year} 00:00:00`,
        simpleDate: `${day}.${month}.${year}`, // for UI automation (DD.MM.YYYY)
        time,
        gender
    };

    chrome.runtime.sendMessage({ action: "START_MONITORING", config: config }, (res) => {
        setRunningState(true);
        saveInputs();
    });
}

function stopMonitoring() {
    chrome.runtime.sendMessage({ action: "STOP_MONITORING" }, (res) => {
        setRunningState(false);
    });
}

function setRunningState(isRunning) {
    const btnStart = document.getElementById("btn-start");
    const btnStop = document.getElementById("btn-stop");

    if (isRunning) {
        btnStart.style.display = "none";
        btnStop.style.display = "block";
        updateStatus("Takip Başladı", "green");
    } else {
        btnStart.style.display = "block";
        btnStop.style.display = "none";
        updateStatus("Durduruldu", "orange");
    }
}

function saveInputs() {
    const data = {
        departure: document.getElementById("departure").value,
        arrival: document.getElementById("arrival").value,
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        gender: document.getElementById("gender").value
    };
    chrome.storage.local.set({ savedInputs: data });
}

function restoreInputs() {
    chrome.storage.local.get(['savedInputs'], (res) => {
        if (res.savedInputs) {
            const d = res.savedInputs;
            if (d.departure) document.getElementById("departure").value = d.departure;
            if (d.arrival) document.getElementById("arrival").value = d.arrival;
            if (d.date) document.getElementById("date").value = d.date;
            if (d.gender) document.getElementById("gender").value = d.gender;

            // Trigger fetch to populate times if possible
            if (d.departure && d.date && authToken) fetchSeferTimes().then(() => {
                if (d.time) document.getElementById("time").value = d.time;
            });
        }
    });
}
