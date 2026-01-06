let stationsList = {};
let authToken = null;
let apiHeaders = {};
let allFetchedTrains = []; // Store full train data globally

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

    // 2. Load Stations and Restore Inputs
    await loadStations(); // This will now also call restoreInputs internally to ensure sync

    // 4. Set minimum date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    document.getElementById("date").setAttribute("min", todayStr);

    // 5. Listeners
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
    // Listen for log messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "LOG") {
            log(request.message);
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

            // Restore inputs AFTER options are added to DOM
            restoreInputs();

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

    // Calculate API Date (Previous Day 21:00:00)
    const dObj = new Date(Number(year), Number(month) - 1, Number(day));
    dObj.setDate(dObj.getDate() - 1);
    const prevD = String(dObj.getDate()).padStart(2, '0');
    const prevM = String(dObj.getMonth() + 1).padStart(2, '0');
    const prevY = dObj.getFullYear();
    const apiDate = `${prevD}-${prevM}-${prevY} 21:00:00`;

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
        blTrainTypes: ["TURISTIK_TREN"]
    };

    allFetchedTrains = []; // Reset

    // Delegate API call to background to avoid CORS/Fetch issues in Popup
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "FETCH_SEFERLER",
            url: "https://web-api-prod-ytp.tcddtasimacilik.gov.tr/tms/train/train-availability?environment=dev&userId=1",
            body: body,
            token: authToken,
            apiHeaders: apiHeaders // Pass headers if available
        }, (response) => {
            if (chrome.runtime.lastError) {
                log("Bağlantı Hatası: " + chrome.runtime.lastError.message);
                resolve();
                return;
            }

            if (response.error) {
                log("API Hatası: " + response.error);
                resolve();
                return;
            }

            const data = response.data;
            const timeContainer = document.getElementById("time-checkbox-container");
            timeContainer.innerHTML = "";

            if (data && data.trainLegs && data.trainLegs.length > 0) {
                data.trainLegs.forEach(leg => {
                    if (leg.trainAvailabilities) {
                        leg.trainAvailabilities.forEach(item => {
                            if (item.trains && item.trains.length > 0) {
                                item.trains.forEach(train => {
                                    if (train.segments && train.segments.length > 0) {
                                        const trSegment = train.segments[0];
                                        const timestamp = trSegment.departureTime;
                                        const d = new Date(timestamp);
                                        const timeStr = d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });

                                        // Collect all possible cabin classes from this train object
                                        const classesFound = [];

                                        // Source 1: cabinClassAvailabilities
                                        if (train.cabinClassAvailabilities) {
                                            train.cabinClassAvailabilities.forEach(cc => {
                                                if (cc.cabinClass && cc.cabinClass.name) classesFound.push(cc);
                                            });
                                        }

                                        // Source 2: availableFareInfo (more comprehensive in some API versions)
                                        if (train.availableFareInfo) {
                                            train.availableFareInfo.forEach(fare => {
                                                if (fare.cabinClasses) {
                                                    fare.cabinClasses.forEach(cc => {
                                                        if (cc.cabinClass && cc.cabinClass.name) {
                                                            // Prevent duplicates within the same train object
                                                            if (!classesFound.find(existing => existing.cabinClass.name === cc.cabinClass.name)) {
                                                                classesFound.push(cc);
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }

                                        // Check if we already have a train at this time
                                        let existingTrain = allFetchedTrains.find(t => t.timeStr === timeStr);
                                        if (existingTrain) {
                                            // Merge new classes into existing train entry
                                            classesFound.forEach(newCC => {
                                                if (!existingTrain.cabinClassAvailabilities.find(ecc => ecc.cabinClass.name === newCC.cabinClass.name)) {
                                                    existingTrain.cabinClassAvailabilities.push(newCC);
                                                }
                                            });
                                        } else {
                                            // Add as new entry
                                            allFetchedTrains.push({
                                                ...train,
                                                cabinClassAvailabilities: classesFound,
                                                timeStr: timeStr
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }

            if (allFetchedTrains.length > 0) {
                // Sort by time
                allFetchedTrains.sort((a, b) => {
                    const depA = a.segments[0].departureTime;
                    const depB = b.segments[0].departureTime;
                    return depA - depB;
                });

                allFetchedTrains.forEach(train => {
                    const label = document.createElement("label");
                    label.className = "checkbox-label";
                    const cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.value = train.timeStr;
                    cb.className = "time-checkbox";
                    cb.addEventListener("change", updateCabinClasses);
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(` ${train.timeStr}`));
                    timeContainer.appendChild(label);
                });
                log(`${allFetchedTrains.length} sefer bulundu.`);
            } else {
                log("Bu tarih/güzergah için sefer bulunamadı.");
                timeContainer.innerHTML = '<span style="font-size:11px; color:#999;">Sefer Yok</span>';
            }
            updateCabinClasses(); // Clear or update classes
            resolve();
        });
    });
}

function updateCabinClasses() {
    const timeCheckboxes = document.querySelectorAll(".time-checkbox");
    const container = document.getElementById("class-checkbox-container");

    // Get selected times
    const selectedTimes = Array.from(timeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    if (selectedTimes.length === 0) {
        container.innerHTML = '<span style="font-size:11px; color:#999;">Önce sefer seçin</span>';
        return;
    }

    if (!allFetchedTrains || allFetchedTrains.length === 0) {
        container.innerHTML = '<span style="font-size:11px; color:#999;">Sefer bulunamadı</span>';
        return;
    }

    // Capture currently checked classes to restore them
    const previouslyChecked = new Set();
    container.querySelectorAll("input:checked").forEach(cb => previouslyChecked.add(cb.value));

    const allClassNames = new Set();
    allFetchedTrains.forEach(train => {
        // Filter: Only include classes from trains that are selected by time
        if (selectedTimes.includes(train.timeStr)) {
            if (train.cabinClassAvailabilities) {
                train.cabinClassAvailabilities.forEach(cc => {
                    if (cc.cabinClass && cc.cabinClass.name) {
                        allClassNames.add(cc.cabinClass.name);
                    }
                });
            }
        }
    });

    if (allClassNames.size === 0) {
        container.innerHTML = '<span style="font-size:11px; color:#999;">Seçili seferler için sınıf bilgisi bulunamadı</span>';
        return;
    }

    container.innerHTML = "";

    // Sort classes for better UX (Economy/Pulman first)
    const sortedClasses = Array.from(allClassNames).sort((a, b) => {
        const priority = ["EKONOMİ", "PULMAN", "BİSİNES", "ÖRTÜLÜ KUŞETLİ", "YATAKLI"];
        const indexA = priority.indexOf(a);
        const indexB = priority.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    sortedClasses.forEach(name => {
        const label = document.createElement("label");
        label.className = "checkbox-label";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = name;
        cb.id = `class-${name.replace(/\s+/g, '-').toLowerCase()}`;

        // Restore check OR default check common ones if nothing was selected before
        if (previouslyChecked.has(name) || (previouslyChecked.size === 0 && (name === "EKONOMİ" || name === "PULMAN"))) {
            cb.checked = true;
        }

        label.appendChild(cb);
        label.appendChild(document.createTextNode(` ${name}`));
        container.appendChild(label);
    });
}

function startMonitoring() {
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateVal = document.getElementById("date").value;
    const timeCheckboxes = document.querySelectorAll(".time-checkbox");
    const times = Array.from(timeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    const gender = document.getElementById("gender").value;

    if (!departure || !arrival || !dateVal || times.length === 0) {
        log("Lütfen tüm alanları doldurun ve en az bir sefer seçin.");
        return;
    }

    // Prepare Config
    const [year, month, day] = dateVal.split("-");
    const dObj = new Date(Number(year), Number(month) - 1, Number(day));
    dObj.setDate(dObj.getDate() - 1);
    const prevD = String(dObj.getDate()).padStart(2, '0');
    const prevM = String(dObj.getMonth() + 1).padStart(2, '0');
    const prevY = dObj.getFullYear();
    const calculatedApiDate = `${prevD}-${prevM}-${prevY} 21:00:00`;
    const formattedDate = dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    // Collect checked classes
    const classCheckboxes = document.querySelectorAll("#class-checkbox-container input[type='checkbox']");
    const allowedClasses = {};
    classCheckboxes.forEach(cb => {
        let foundId = null;
        // Try to find the ID for this class name from the fetched trains
        if (allFetchedTrains && allFetchedTrains.length > 0) {
            for (const train of allFetchedTrains) {
                if (train.cabinClassAvailabilities) {
                    const match = train.cabinClassAvailabilities.find(cc => cc.cabinClass && cc.cabinClass.name === cb.value);
                    if (match && match.cabinClass) {
                        foundId = match.cabinClass.id;
                        break;
                    }
                }
            }
        }
        allowedClasses[cb.value] = { checked: cb.checked, id: foundId };
    });

    const config = {
        departure,
        arrival,
        departureId: stationsList[departure],
        arrivalId: stationsList[arrival],
        date: formattedDate,
        apiDate: calculatedApiDate,
        simpleDate: `${day}.${month}.${year}`,
        inputDate: dateVal,
        times,
        gender,
        allowedClasses
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
    const timeCheckboxes = document.querySelectorAll(".time-checkbox");
    const selectedTimes = Array.from(timeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // Also save checked classes
    const classCheckboxes = document.querySelectorAll("#class-checkbox-container input[type='checkbox']");
    const savedClasses = {};
    classCheckboxes.forEach(cb => {
        savedClasses[cb.value] = cb.checked;
    });

    const data = {
        departure: document.getElementById("departure").value,
        arrival: document.getElementById("arrival").value,
        date: document.getElementById("date").value,
        times: selectedTimes,
        gender: document.getElementById("gender").value,
        savedClasses: savedClasses
    };
    chrome.storage.local.set({ savedInputs: data });
}

function restoreInputs() {
    chrome.storage.local.get(['savedInputs', 'isMonitoring', 'monitoringConfig'], (res) => {
        let d = res.savedInputs;

        // If monitoring is active, use the active config instead of last saved inputs
        if (res.isMonitoring && res.monitoringConfig) {
            const mc = res.monitoringConfig;
            let restoredDate = mc.inputDate;

            // Fallback for older configs: try to get correct YYYY-MM-DD from simpleDate (DD.MM.YYYY)
            if (!restoredDate && mc.simpleDate) {
                const parts = mc.simpleDate.split('.');
                if (parts.length === 3) {
                    restoredDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            d = {
                departure: mc.departure,
                arrival: mc.arrival,
                date: restoredDate || mc.date, // mc.date is a last resort label
                times: mc.times || [],
                gender: mc.gender,
                savedClasses: mc.allowedClasses || {}
            };
        }

        if (d) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            if (d.date && d.date.includes('-')) {
                const parts = d.date.split('-');
                if (parts.length === 3) {
                    const savedDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    if (savedDate < today) {
                        d.date = todayStr;
                    }
                } else {
                    d.date = todayStr;
                }
            } else {
                d.date = todayStr;
            }

            if (d.departure) document.getElementById("departure").value = d.departure;
            if (d.arrival) document.getElementById("arrival").value = d.arrival;
            if (d.date) document.getElementById("date").value = d.date;
            if (d.gender) document.getElementById("gender").value = d.gender;

            if (d.departure && d.date && authToken) {
                fetchSeferTimes().then(() => {
                    // Restore time checkboxes
                    if (d.times && Array.isArray(d.times)) {
                        d.times.forEach(t => {
                            const cb = document.querySelector(`.time-checkbox[value='${t}']`);
                            if (cb) cb.checked = true;
                        });
                    }
                    updateCabinClasses();
                    // Restore class checkboxes
                    const classesToRestore = d.savedClasses || {};
                    Object.keys(classesToRestore).forEach(className => {
                        const cb = document.querySelector(`#class-checkbox-container input[value='${className}']`);
                        if (cb) {
                            const val = classesToRestore[className];
                            if (val === true || (typeof val === 'object' && val.checked)) {
                                cb.checked = true;
                            } else {
                                cb.checked = false;
                            }
                        }
                    });
                });
            }
        }
    });
}

