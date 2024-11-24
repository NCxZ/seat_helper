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

document.addEventListener("DOMContentLoaded", async () => {
    chrome.storage.local.get(["date", "time"], (data) => {
        
        if (data.date) document.getElementById("date").value = data.date;
        if (data.time) document.getElementById("time").value = data.time;
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
            const option = new Option(stationName, stationsData[stationName]); // Burası düzeltilecek
            departure.options.add(option);
            arrival.options.add(option.cloneNode(true));
        });
    }

    // Varsayılan değerler
	chrome.storage.local.get(["departure", "arrival"], (data) => {
        
        if (data.departure) document.getElementById("departure").value = data.departure;
    if (data.arrival) document.getElementById("arrival").value = data.arrival;
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


// Değerleri saklama
const saveFormValues = () => {
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    chrome.storage.local.set({ departure, arrival, date, time }, () => {
        console.log("Değerler saklandı:", { departure, arrival, date, time });
    });
};

// Değerleri saklama işlemi her input değiştiğinde tetiklenir
document.getElementById("departure").addEventListener("input", saveFormValues);
document.getElementById("arrival").addEventListener("input", saveFormValues);
document.getElementById("date").addEventListener("input", saveFormValues);
document.getElementById("time").addEventListener("input", saveFormValues);

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
const checkSeatsLoop = async (seferUrl, vagonUrl, departure, departureId, arrival, arrivalId, formattedDate, time) => {
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
};


// TCDD sayfasında işlemleri başlatma
const startTCDDProcess = async (tabId, departure, arrival, formattedDate, time, vagon, koltuk, responseElement) => {
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
    await executeScriptPromise(tabId, () => {
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
                const maleButton = document.getElementById("j_idt548");
                if (maleButton) {
                    maleButton.click();
                    console.log("Cinsiyet olarak 'Bay' seçildi.");
                    resolve(true);
                } else {
                    console.error("Cinsiyet seçimi için 'Bay' butonu bulunamadı.");
                    resolve(false);
                }
            });
        });
    });

    responseElement.textContent = "Cinsiyet seçimi tamamlandı.";
};


// "Kur" butonuna basıldığında işlemleri başlat
document.getElementById("set-request").addEventListener("click", async () => {
    const responseElement = document.getElementById("response");

    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateInput = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    const [year, month, day] = dateInput.split("-");
    const formattedDate = `${day}.${month}.${year}`;
    const date = new Date(`${year}-${month}-${day}`);
    const apiFormattedDate = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`;

    const seferUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/sefer/seferSorgula";
    const vagonUrl = "https://api-yebsp.tcddtasimacilik.gov.tr/vagon/vagonHaritasindanYerSecimi";
	
	//Bu arada istasyon adı/istasyon id'si bilgilerini içeren dosya kullanılarak seçilmiş departure ve arrival için departureId ve arrivalId değerleri atanmalı.
	const [departureId, arrivalId] = [234516254, 15917435912];

    try {
        const { vagon, koltuk, seferId } = await checkSeatsLoop(seferUrl, vagonUrl, departure, departureId, arrival, arrivalId, apiFormattedDate, time);
        responseElement.textContent = "Uygun koltuk bulundu. TCDD sayfasında işlemler başlatılıyor...";
		const tabs = await new Promise((resolve, reject) =>
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>
				tabs.length ? resolve(tabs) : reject("TCDD sitesi açık bir sekmede bulunamadı.")
				)
			);
        await startTCDDProcess(tabs[0].id, departure, arrival, formattedDate, time, vagon, koltuk, responseElement);
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

    saveFormValues(); // Değişiklikleri kaydet
});


//Kalkış saat aralıklı olmalı. birden çok sefer taranmalı.
//Alınacak koltuğun seçimi için bay/bağyan seçimin eklentide yapılmalı.
//İki koltuk yan yana bulma seçeneği.