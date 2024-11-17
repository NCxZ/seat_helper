import requests

cookies = {
    'yolcuTabId': 'yolcuTabId1731623980844',
    'NSC_WJQ_UTN_FZCJT-HJTF_TTM': 'ffffffffaf10661a45525d5f4f58455e445a4a423660',
    'JSESSIONID': '0000HEIZx0xn3qikiQaMj1XVmLJ:18kkguf9b',
}

headers = {
    'Accept': 'application/xml, text/xml, */*; q=0.01',
    'Accept-Language': 'tr-TR,tr;q=0.5',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    # 'Cookie': 'yolcuTabId=yolcuTabId1731623980844; NSC_WJQ_UTN_FZCJT-HJTF_TTM=ffffffffaf10661a45525d5f4f58455e445a4a423660; JSESSIONID=0000HEIZx0xn3qikiQaMj1XVmLJ:18kkguf9b',
    'Faces-Request': 'partial/ajax',
    'Origin': 'https://ebilet.tcddtasimacilik.gov.tr',
    'Referer': 'https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-GPC': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Chromium";v="130", "Brave";v="130", "Not?A_Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
}

data = 'javax.faces.partial.ajax=true&javax.faces.source=mainTabView%3AbtnDevam2&javax.faces.partial.execute=mainTabView%3AbtnDevam2+mainTabView%3AdtBiletRezBilgileri+mainTabView%3ApgSayfaDegistirme2+mainTabView%3ApgIletisimBilgileriSec&javax.faces.partial.render=int_sat_001_form+mainTabView%3AyonSecimTabView&mainTabView%3AbtnDevam2=mainTabView%3AbtnDevam2&int_sat_001_form=int_sat_001_form&pb=09%3A28&mainTabView%3AyonSecimTabView%3AkoltukSecimTabViewGidis_activeIndex=0&mainTabView%3AyonSecimTabView_activeIndex=0&10h_selection=10h&mainTabView%3AdtBiletRezBilgileri%3A0%3AiptYolcuIsmi=Fatih&mainTabView%3AdtBiletRezBilgileri%3A0%3AiptYolcuSoyIsmi=Y%C4%B1ld%C4%B1z&mainTabView%3AdtBiletRezBilgileri%3A0%3Ayolcutcno=13510943286&mainTabView%3AdtBiletRezBilgileri%3A0%3AtipradioCinsiyet=E&mainTabView%3AdtBiletRezBilgileri%3A0%3AsoTarife_input=1&mainTabView%3AdtBiletRezBilgileri%3A0%3AsoTarife_focus=&mainTabView%3AdtBiletRezBilgileri%3A0%3AdogTar2=01%2F12%2F1997&mainTabView%3AimIletisimCep=0(507)+970-5475&mainTabView%3AimIletisimEposta=su.yutmus.paluk%40gmail.com&mainTabView%3AtipradioIletisimTuru=0&mainTabView_activeIndex=1&otBrowser=Chrome+130&adSoyad=&id_forwardGroupIndex=&somSonKullanmaTarihiAy_input=&somSonKullanmaTarihiAy_focus=&somSonKullanmaTarihiYil_input=&somSonKullanmaTarihiYil_focus=&cvvNo=&j_idt520_active=0&javax.faces.ViewState=1254990900990130996%3A-5098289061989580433'

#devam butonu
response = requests.post(
    'https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf',
    cookies=cookies,
    headers=headers,
    data=data,
)