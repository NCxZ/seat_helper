// Popup açıldığında saklanan değerleri geri yükle
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["departure", "arrival", "date", "time"], (data) => {
        if (data.departure) document.getElementById("departure").value = data.departure;
        if (data.arrival) document.getElementById("arrival").value = data.arrival;
        if (data.date) document.getElementById("date").value = data.date;
        if (data.time) document.getElementById("time").value = data.time;
    });
});

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

document.getElementById("set-request").addEventListener("click", () => {
    const responseElement = document.getElementById("response");

    // Form değerlerini al
    const departure = document.getElementById("departure").value;
    const arrival = document.getElementById("arrival").value;
    const dateInput = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    // Tarih formatını dönüştür (YYYY-MM-DD → DD.MM.YYYY)
    const [year, month, day] = dateInput.split("-");
    const formattedDate = `${day}.${month}.${year}`;

    // Zorunlu alanların kontrolü
    if (!departure || !arrival || !dateInput || !time) {
        responseElement.textContent = "Lütfen tüm alanları doldurun.";
        return;
    }

    responseElement.textContent = "Form dolduruluyor ve arama yapılıyor...";

    // Aktif sekmede form doldurma ve gönderme işlemi
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            responseElement.textContent = "TCDD sitesi açık bir sekmede bulunamadı.";
            return;
        }

        const activeTabId = tabs[0].id;

        // 1. Adım: Form Doldurma ve Gönderme
        chrome.scripting.executeScript(
            {
                target: { tabId: activeTabId },
                func: (departure, arrival, formattedDate) => {
                    // Form alanlarını doldur
                    document.getElementById("nereden").value = departure;
                    document.getElementById("nereye").value = arrival;
                    document.getElementById("trCalGid_input").value = formattedDate;

                    // Bilet arama formunu gönder
                    document.getElementById("btnSeferSorgula").click();
                },
                args: [departure, arrival, formattedDate],
            },
            () => {
                responseElement.textContent = "Sayfaya yönlendiriliyor...";

                // 2. Adım: Sayfa Yüklenmesini Bekleme ve Sefer Seçimi
                chrome.tabs.onUpdated.addListener(function onUpdated(tabId, changeInfo) {
                    if (tabId === activeTabId && changeInfo.status === "complete") {
                        // Sayfa tam olarak yüklendi
                        console.log("Sayfa tamamen yüklendi, uygun sefer aranıyor...");

                        // Sefer seçme fonksiyonu
                        chrome.scripting.executeScript(
                            {
                                target: { tabId: activeTabId },
                                func: (time) => {
                                    // Sayfa tamamen yüklendikten sonra işlemi başlat
                                    function waitForTableLoad(callback) {
                                        const observer = new MutationObserver(() => {
                                            // Tabloyu bekleyerek doğru satırı bul
                                            const rows = document.querySelectorAll("tbody#mainTabView\\:gidisSeferTablosu_data tr");
                                            if (rows.length > 0) {
                                                observer.disconnect();
                                                callback(); // Sayfa yüklendi, işlemi başlat
                                            }
                                        });

                                        observer.observe(document.body, { childList: true, subtree: true });
                                    }

                                    waitForTableLoad(() => {
                                        console.log("Sefer tablosu yüklendi, uygun sefer aranıyor...");

                                        // Sefer seçme fonksiyonu
                                        function selectMatchingSefer(time) {
                                            const rows = document.querySelectorAll("tbody#mainTabView\\:gidisSeferTablosu_data tr");
                                            for (const row of rows) {
                                                const seferSaatElement = row.querySelector("span.seferSorguTableBuyuk");
                                                if (!seferSaatElement) continue;

                                                const seferSaat = seferSaatElement.textContent.trim();
                                                console.log(`Kontrol edilen sefer saati: ${seferSaat}`);

                                                if (seferSaat === time) {
                                                    // "Seç" butonunu bulmak için doğru div'i seçiyoruz
                                                    const selectButton = row.querySelector("div.seferSecButton");
                                                    if (selectButton) {
                                                        selectButton.click();  // Butona tıkla
                                                        console.log(`Sefer ${seferSaat} seçildi.`);
                                                        return true; // Sefer seçildi
                                                    } else {
                                                        console.log(`Sefer ${seferSaat} seçilemedi: Buton bulunamadı.`);
                                                    }
                                                }
                                            }
                                            console.log("Uygun bir sefer bulunamadı.");
                                            return false; // Sefer seçilemedi
                                        }

                                        selectMatchingSefer(time);
                                    });
                                },
                                args: [time],
                            },
                            (results) => {
                                // Sefer seçme sonucuna göre mesaj göster
                                const wasSelected = results[0]?.result;
                                if (wasSelected) {
                                    responseElement.textContent = "Uygun sefer seçildi.";
                                } else {
                                    responseElement.textContent = "Uygun bir sefer bulunamadı.";
                                }
                            }
                        );
                    }
                });
            }
        );
    });
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
