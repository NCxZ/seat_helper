<<<<<<< HEAD
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
=======
//import stations.json
let stationsList = {}; // JSON verisini tutmak için değişken

// JSON dosyasını oku ve değişkene ata
const loadStations = async () => {
    try {
        const response = await fetch('./stations.json');
        if (!response.ok) {
            throw new Error(`Hata: ${response.status} - ${response.statusText}`);
        }
        stationsList = await response.json();
        console.log('Stations data yüklendi:', stationsList);
    } catch (error) {
        console.error('Stations JSON dosyası yüklenirken hata oluştu:', error);
    }
};


// API çağrısı yapmak için yardımcı fonksiyon
const postRequest = async (url, body) => {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": "Basic ZGl0cmF2b3llYnNwOmRpdHJhMzQhdm8u", // Basic auth token burada
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log("API yanıtı:", data);
        return data;
    } catch (error) {
        console.error("API çağrısı sırasında hata:", error.message);
        throw error;
    }
};

const getStationId = (stationName) => {
	if (stationsList[stationName]) return stationsList[stationName];
	
};

document.addEventListener("DOMContentLoaded", async () => {
	loadStations();
    chrome.storage.local.get(["date", "gender"], (data) => {
        
        if (data.date) document.getElementById("date").value = data.date;
        
		if (data.gender) document.getElementById("gender").value = data.gender;
    });

    // API çağrısı için gerekli URL ve body
    const stationUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/istasyon/istasyonYukle";
    const stationbody = {
        "kanalKodu": "3",
        "dil": 1,
        "tarih": "Nov 10, 2011 12:00:00 AM",
        "satisSorgu": true
    };

    // DOM elemanlarına referanslar
    const departure = document.getElementById("departure");
    const arrival = document.getElementById("arrival");

    // İstasyon verilerini asenkron olarak al
    const stationsData = await fetchStationsData(stationUrl, stationbody);

    // İstasyonlar verisi alındıktan sonra dropdown'ları güncelle
    if (stationsData) {
        Object.keys(stationsData).forEach(stationName => {
            const option = new Option(stationName, stationName); // Burası düzeltilecekstationsData[stationName]
            departure.options.add(option);
            arrival.options.add(option.cloneNode(true));
        });
    }

    // Varsayılan değerler
	chrome.storage.local.get(["departure", "arrival", "date","time"], (data) => {
        
        if (data.departure) document.getElementById("departure").value = data.departure;
    if (data.arrival) document.getElementById("arrival").value = data.arrival;
	fetchAndPopulateTimes(data.departure,data.arrival,data.date);
	if (data.time) document.getElementById("time").value = data.time;
	
    });
	
});

// API çağrısı fonksiyonu
const fetchStationsData = async (stationUrl, stationbody) => {
    try {
        const response = await fetch(stationUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic ZGl0cmF2b3llYnNwOmRpdHJhMzQhdm8u" // Authorization header (gerekiyorsa)
            },
            body: JSON.stringify(stationbody),
        });

        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        if (data && data.istasyonBilgileriList) {
            return data.istasyonBilgileriList.reduce((acc, station) => {
                acc[station.istasyonAdi] = station.istasyonId;
                return acc;
            }, {});
        }
        console.error("İstasyon verisi alınamadı.");
        return null;
    } catch (error) {
        console.error("API çağrısı sırasında hata:", error.message);
        return null;
    }
};


// Sefer saatlerini al ve dropdown’a ekle
const fetchAndPopulateTimes = async (departure, arrival, date) => {
	const responseElement = document.getElementById("response");
    const seferUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/sefer/seferSorgula";
	const departureId = getStationId(departure);
	const arrivalId = getStationId(arrival);
    const [year, month, day] = date.split("-");
    const formattedDate = `${day}.${month}.${year}`;
    date = new Date(`${year}-${month}-${day}`);
    const apiFormattedDate = `${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()}, ${date.getFullYear()} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;

    const seferBody = {
        kanalKodu: 3,
        dil: 0,
        seferSorgulamaKriterWSDVO: {
            satisKanali: 3,
            binisIstasyonu: departure,
            inisIstasyonu: arrival,
            binisIstasyonId: departureId, // İstasyon ID'leri burada güncellenecek
            inisIstasyonId: arrivalId, // İstasyon ID'leri burada güncellenecek
            binisIstasyonu_isHaritaGosterimi: "False",
            inisIstasyonu_isHaritaGosterimi: "False",
            seyahatTuru: 1,
            gidisTarih: `${apiFormattedDate} 00:00:00 AM`,
            bolgeselGelsin: "False",
            islemTipi: 0,
            yolcuSayisi: 1,
            aktarmalarGelsin: "True",
        },
    };

    try {
        const seferResponse = await postRequest(seferUrl, seferBody);

        if (
            seferResponse &&
            seferResponse.cevapBilgileri &&
            seferResponse.cevapBilgileri.cevapKodu === "000" &&
            seferResponse.seferSorgulamaSonucList
        ) {
            const timesDropdown = document.getElementById("time");
            timesDropdown.innerHTML = ""; // Eski seçenekleri temizle

            // Saatleri sıralama
            const sortedSeferList = seferResponse.seferSorgulamaSonucList.sort((a, b) => {
                return new Date(a.binisTarih) - new Date(b.binisTarih);
            });

            // Sıralı saatleri dropdown'a ekleme
            sortedSeferList.forEach((sefer) => {
                const timeOption = new Option(
                    new Date(sefer.binisTarih).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    new Date(sefer.binisTarih).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                );
                timesDropdown.options.add(timeOption);
            });

            console.log("Sıralı sefer saatleri dropdown’a eklendi.");
			responseElement.textContent = "Sefer saatleri listelendi.";
        } else {
            console.error("Sefer saatleri alınamadı veya API yanıtı beklenmeyen formatta.");
			responseElement.textContent = "Sefer saatleri alınamadı.";
        }
    } catch (error) {
        console.error("Sefer saatleri sorgulanırken hata oluştu:", error);
    }
};


// Kalkış, varış ve tarih seçildiğinde sefer saatlerini getir
const saveFormValuesAndFetchTimes = async () => {
	const responseElement = document.getElementById("response");
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const date = document.getElementById("date").value;
	
	responseElement.textContent = "...";
	
    chrome.storage.local.set({ departure, arrival, date }, async () => {
        console.log("Değerler saklandı:", { departure, arrival, date });

        if (departure && arrival && date) {
            console.log("Sefer sorgulama başlatılıyor...");
            await fetchAndPopulateTimes(departure, arrival, date);
        }
    });
};

const saveFormValues = () => {
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
	const gender = document.getElementById("gender").value;
	
	const responseElement = document.getElementById("response");
	responseElement.textContent = "...";

    chrome.storage.local.set({ departure, arrival, date, time, gender }, () => {
        console.log("Değerler saklandı:", { departure, arrival, date, time, gender });
    });
};

// Form değerlerini kaydet ve sefer sorgula
document.getElementById("departure").addEventListener("change", saveFormValuesAndFetchTimes);
document.getElementById("arrival").addEventListener("change", saveFormValuesAndFetchTimes);
document.getElementById("date").addEventListener("change", saveFormValuesAndFetchTimes);
document.getElementById("gender").addEventListener("input", saveFormValues);

// executeScript işlemini Promise olarak saran fonksiyon
const executeScriptPromise = (tabId, func, args = []) => {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                func,
                args,
            },
            (results) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                } else {
                    resolve(results);
                }
            }
        );
    });
};


// Koltuk kontrol fonksiyonu
const checkSeatsLoop = async (seferUrl, vagonUrl, departure, arrival, formattedDate, time) => {
	const departureId = getStationId(departure);
	const arrivalId = getStationId(arrival);
	
    while (true) {
        console.log("Koltuk uygunluğu kontrol ediliyor...");

        const seferBody = {
            kanalKodu: 3,
            dil: 0,
            seferSorgulamaKriterWSDVO: {
                satisKanali: 3,
                binisIstasyonu: departure,
                inisIstasyonu: arrival,
                binisIstasyonId: departureId,
                inisIstasyonId: arrivalId,
                binisIstasyonu_isHaritaGosterimi: "False",
                inisIstasyonu_isHaritaGosterimi: "False",
                seyahatTuru: 1,
                gidisTarih: `${formattedDate} 00:00:00 AM`,
                bolgeselGelsin: "False",
                islemTipi: 0,
                yolcuSayisi: 1,
                aktarmalarGelsin: "True",
            },
        };

        let seferResponse;
        try {
            seferResponse = await postRequest(seferUrl, seferBody);
        } catch (error) {
            console.error("Sefer sorgulama API hatası:", error.message);
            continue;
        }

        if (!seferResponse || !seferResponse.cevapBilgileri || seferResponse.cevapBilgileri.cevapKodu !== "000") {
            console.warn("API yanıtı beklenen formatta değil veya hata içeriyor.");
            continue;
        }

        for (const sefer of seferResponse.seferSorgulamaSonucList || []) {
            const seferTime = new Date(sefer.binisTarih).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            if (seferTime === time) {
                console.log(`Sefer bulundu: ${seferTime}`);
                for (const vagon of sefer.vagonTipleriBosYerUcret) {
                    for (const vagonDetail of vagon.vagonListesi) {
                        const vagonSiraNo = vagonDetail.vagonSiraNo;

                        const vagonBody = {
                            kanalKodu: "3",
                            dil: 0,
                            seferBaslikId: sefer.seferId,
                            vagonSiraNo: vagonSiraNo,
                            binisIst: departure,
                            InisIst: arrival,
                        };

                        let vagonResponse;
                        try {
                            vagonResponse = await postRequest(vagonUrl, vagonBody);
                        } catch (error) {
                            console.error("Vagon kontrol API hatası:", error.message);
                            continue;
                        }

                        if (!vagonResponse || !vagonResponse.cevapBilgileri || vagonResponse.cevapBilgileri.cevapKodu !== "000") {
                            console.warn("Vagon yanıtı beklenen formatta değil veya hata içeriyor.");
                            continue;
                        }

                        for (const seat of vagonResponse.vagonHaritasiIcerikDVO.koltukDurumlari || []) {
                            if (seat.durum === 0 && !seat.koltukNo.endsWith("h")) {
                                console.log(`Uygun koltuk bulundu: Koltuk ${seat.koltukNo}, Vagon ${vagonSiraNo}`);
                                return { vagon: vagonSiraNo, koltuk: seat.koltukNo, seferId: sefer.seferId };
                            }
                        }
                    }
                }
            }
        }

        console.log("Uygun koltuk bulunamadı. Tekrar deneniyor...");
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
};


// TCDD sayfasında işlemleri başlatma
const startTCDDProcess = async (tabId, departure, arrival, formattedDate, time, vagon, koltuk, gender, responseElement) => {
    console.log("TCDD tabında işlemler başlatılıyor...");

    // 1. Sefer Sorgulama ve "Devam" Butonuna Tıklama
    await executeScriptPromise(tabId, (departure, arrival, formattedDate) => {
        document.getElementById("nereden").value = departure;
        document.getElementById("nereye").value = arrival;
        document.getElementById("trCalGid_input").value = formattedDate;
        document.getElementById("btnSeferSorgula").click();
    }, [departure, arrival, formattedDate]);

    await new Promise((resolve) => {
        const listener = (tabId, changeInfo) => {
            if (changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });

    console.log("Sefer seçimi başlatılıyor...");
    const wasSelected = await executeScriptPromise(tabId, (time) => {
        function waitForTableLoad(callback) {
            const observer = new MutationObserver(() => {
                const rows = document.querySelectorAll("tbody#mainTabView\\:gidisSeferTablosu_data tr");
                if (rows.length > 0) {
                    observer.disconnect();
                    callback();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        return new Promise((resolve) => {
            waitForTableLoad(() => {
                const rows = document.querySelectorAll("tbody#mainTabView\\:gidisSeferTablosu_data tr");
                for (const row of rows) {
                    const seferSaatElement = row.querySelector("span.seferSorguTableBuyuk");
                    if (seferSaatElement && seferSaatElement.textContent.trim() === time) {
                        const selectButton = row.querySelector("div.seferSecButton");
                        if (selectButton) {
                            selectButton.click();
                            resolve(true);
                            return;
                        }
                    }
                }
                resolve(false);
            });
        });
    }, [time]);

    if (!wasSelected) {
        responseElement.textContent = "Uygun bir sefer bulunamadı.";
        return;
    }

    console.log("Devam butonuna tıklanıyor...");
    await executeScriptPromise(tabId, () => {
        const continueButton = document.getElementById("mainTabView:btnDevam44");
        if (continueButton) {
            continueButton.click();
            console.log("Devam butonuna tıklandı.");
        } else {
            throw new Error("Devam butonu bulunamadı.");
        }
    });


    // 2. Vagon Seçimi
    console.log("Vagon seçimi başlatılıyor...");
    await executeScriptPromise(tabId, (vagon) => {
        function waitForVagonTableLoad(callback) {
            const observer = new MutationObserver(() => {
                const vagonButtons = document.querySelectorAll("button.vagonText");
                if (vagonButtons.length > 0) {
                    observer.disconnect();
                    callback();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        return new Promise((resolve) => {
            waitForVagonTableLoad(() => {
                const vagonButtonId = `mainTabView:j_idt206:${vagon - 1}:gidisVagonlariGost`;
                const vagonButton = document.getElementById(vagonButtonId);

                if (vagonButton) {
                    vagonButton.click();
                    console.log(`Vagon ${vagon} seçildi.`);
                    resolve(true);
                } else {
                    console.error(`Vagon ${vagon} seçimi için buton bulunamadı.`);
                    resolve(false);
                }
            });
        });
    }, [vagon]);

    console.log("Koltuk seçimi başlatılıyor...");
    const seatSelected = await executeScriptPromise(tabId, (koltuk) => {
        function waitForSeatTableLoad(callback) {
            const observer = new MutationObserver(() => {
                const seatCheckboxes = document.querySelectorAll("input.ui-wagon-item-checkbox");
                if (seatCheckboxes.length > 0) {
                    observer.disconnect();
                    callback();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        return new Promise((resolve) => {
            waitForSeatTableLoad(() => {
                const seatCheckbox = Array.from(document.querySelectorAll("input.ui-wagon-item-checkbox")).find(
                    (element) => element.value === koltuk
                );

                if (seatCheckbox) {
                    seatCheckbox.click();
                    console.log(`Koltuk ${koltuk} seçildi.`);
                    resolve(true);
                } else {
                    console.error(`Koltuk ${koltuk} seçimi için eleman bulunamadı.`);
                    resolve(false);
                }
            });
        });
    }, [koltuk]);

    if (!seatSelected) {
        throw new Error(`Koltuk ${koltuk} seçilemedi.`);
    }

    responseElement.textContent = "Koltuk seçimi tamamlandı. Cinsiyet ekranı kontrol ediliyor...";

    // 4. Cinsiyet Seçimi
    console.log("Cinsiyet seçimi kontrol ediliyor...");
    await executeScriptPromise(tabId, (gender) => {
        function waitForCinsiyetScreen(callback) {
            const observer = new MutationObserver(() => {
                const form = document.querySelector("form#cinsiyet_secimi_form");
                if (form) {
                    observer.disconnect();
                    callback();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        return new Promise((resolve) => {
            waitForCinsiyetScreen(() => {
				console.log(gender);
                const maleButton = document.getElementById("cinsiyet_secimi_form").children[1];
				const femaleButton = document.getElementById("cinsiyet_secimi_form").children[2];
                if (gender === "Erkek" && maleButton) { //gender === "Erkek" && maleButton
                    maleButton.click();
                    console.log("Cinsiyet olarak 'Bay' seçildi.");
                    resolve(true);
				} else if (gender === "Kadın" && femaleButton){
					femaleButton.click();
                    console.log("Cinsiyet olarak 'Bayan' seçildi.");
                    resolve(true);
                } else {
                    console.error("Cinsiyet seçimi için 'Bay' butonu bulunamadı.");
                    resolve(false);
                }
            });
        });
    }, [gender]);

    responseElement.textContent = "Cinsiyet seçimi tamamlandı.";
};


// "Kur" butonuna basıldığında işlemleri başlat
document.getElementById("set-request").addEventListener("click", async () => {
    const responseElement = document.getElementById("response");

    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateInput = document.getElementById("date").value;
    const time = document.getElementById("time").value;
	const gender = document.getElementById("gender").value;

    const [year, month, day] = dateInput.split("-");
    const formattedDate = `${day}.${month}.${year}`;
    const date = new Date(`${year}-${month}-${day}`);
    const apiFormattedDate = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

    const seferUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/sefer/seferSorgula";
    const vagonUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/vagon/vagonHaritasindanYerSecimi";
	
	//Bu arada istasyon adı/istasyon id'si bilgilerini içeren dosya kullanılarak seçilmiş departure ve arrival için departureId ve arrivalId değerleri atanmalı.
	responseElement.textContent = "Koltuk arama başladı. Vagonlar taranıyor...";
	
    try {
        const { vagon, koltuk, seferId } = await checkSeatsLoop(seferUrl, vagonUrl, departure, arrival, apiFormattedDate, time);
        responseElement.textContent = "Uygun koltuk bulundu. TCDD sayfasında işlemler başlatılıyor...";
		const tabs = await new Promise((resolve, reject) =>
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
				tabs.length ? resolve(tabs) : reject("TCDD sitesi açık bir sekmede bulunamadı.")
				)
			);
        await startTCDDProcess(tabs[0].id, departure, arrival, formattedDate, time, vagon, koltuk, gender, responseElement);
    } catch (error) {
        responseElement.textContent = `Hata: ${error}`;
        console.error("Hata:", error);
    }
});

document.getElementById("swap-locations").addEventListener("click", () => {
    const departureInput = document.getElementById("departure");
    const arrivalInput = document.getElementById("arrival");

    // Kalkış ve varış istasyonlarını değiştir
    const temp = departureInput.value;
    departureInput.value = arrivalInput.value;
    arrivalInput.value = temp;

    saveFormValuesAndFetchTimes(); // Değişiklikleri kaydet
});


//Kalkış saat aralıklı olmalı. birden çok sefer taranmalı.
//Alınacak koltuğun seçimi için bay/bağyan seçimin eklentide yapılmalı.
//İki koltuk yan yana bulma seçeneği.
>>>>>>> 731572c9d701a644634e0dd59428fe2ebab950b1
