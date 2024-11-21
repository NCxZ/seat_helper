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

// "Kur" düğmesine basıldığında işlemler
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
                responseElement.textContent = "İşlem tamamlandı, sonuçlar yükleniyor...";
            }
        );
    });
});

// "İstasyonları Değiştir" düğmesine basıldığında çalışacak işlem
document.getElementById("swap-locations").addEventListener("click", () => {
    const departureInput = document.getElementById("departure");
    const arrivalInput = document.getElementById("arrival");

    // Kalkış ve varış istasyonlarını değiştir
    const temp = departureInput.value;
    departureInput.value = arrivalInput.value;
    arrivalInput.value = temp;

    saveFormValues(); // Değişiklikleri kaydet
});
