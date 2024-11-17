document.getElementById("send-request").addEventListener("click", async () => {
    const responseElement = document.getElementById("response");

    // POST isteği için veri ve URL
    const postData = {
        "javax.faces.partial.ajax": "true",
        "javax.faces.source": "trCalGid",
        "javax.faces.partial.execute": "trCalGid trCalDon",
        "javax.faces.partial.render": "trCalDon trCalGid",
        "javax.faces.behavior.event": "dateSelect",
        "javax.faces.partial.event": "dateSelect",
        "biletAramaForm": "biletAramaForm",
        "tipradioIslemTipi": "0",
        "nereden": "İstanbul(Söğütlüçeşme)",
        "trCalGid_input": "16.11.2024",
        "tipradioSeyehatTuru": "1",
        "nereye": "Eskişehir",
        "syolcuSayisi_input": "1",
        "javax.faces.ViewState": ""
    };

    const url = "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/tcddWebContent.jsf";

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams(postData).toString()
        });

        const responseText = await response.text();
        responseElement.textContent = "Yanıt Alındı: " + responseText.slice(0, 100) + "..."; // Yanıtın ilk 100 karakteri
    } catch (error) {
        responseElement.textContent = "Hata: " + error.message;
    }
});
