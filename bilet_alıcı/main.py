import requests

cookies = {
    'yolcuTabId': 'yolcuTabId1731672784733',
    'JSESSIONID': '0000GgRC_i3u5-SzfxdYtUrCAfu:18l6o8jct',
    'NSC_WJQ_UTN_FZCJT-HJTF_TTM': 'ffffffffaf10661a45525d5f4f58455e445a4a423660',
}

#yolcuTabId=yolcuTabId1731623980844; NSC_WJQ_UTN_FZCJT-HJTF_TTM=ffffffffaf10661a45525d5f4f58455e445a4a423660; JSESSIONID=0000HEIZx0xn3qikiQaMj1XVmLJ:18kkguf9b

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

data = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:j_idt214',
    'javax.faces.partial.execute': 'mainTabView:dtBiletRezBilgileri mainTabView:j_idt214',
    'javax.faces.partial.render': 'msg mainTabView:olAtanacakYolcu mainTabView:pAtanacakYolcu mainTabView:dtBiletRezBilgileri mainTabView:pgYolcuBilgileri cinsiyet_secimi_form mainTabView:yonSecimTabView mainTabView:pgKoltukAtamalariVagon',
    'javax.faces.behavior.event': 'seatSelect',
    'javax.faces.partial.event': 'seatSelect',
    'mainTabView:j_idt214_number': '10h',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '10:00',
    'mainTabView:yonSecimTabView:koltukSecimTabViewGidis_activeIndex': '0',
    'mainTabView:yonSecimTabView_activeIndex': '0',
    '10h_selection': '10h',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuSoyIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:yolcutcno': '',
    'mainTabView:dtBiletRezBilgileri:0:tipradioCinsiyet': 'E',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_input': '1',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_focus': '',
    'mainTabView:dtBiletRezBilgileri:0:dogTar2': '',
    'mainTabView:imIletisimCep': '',
    'mainTabView:imIletisimEposta': '',
    'mainTabView:tipradioIletisimTuru': '0',
    'mainTabView_activeIndex': '1',
    'otBrowser': 'Chrome 130',
    'adSoyad': '',
    'id_forwardGroupIndex': '',
    'somSonKullanmaTarihiAy_input': '',
    'somSonKullanmaTarihiAy_focus': '',
    'somSonKullanmaTarihiYil_input': '',
    'somSonKullanmaTarihiYil_focus': '',
    'cvvNo': '',
    'j_idt520_active': '0',
    'javax.faces.ViewState': '-65585493772639868:6462001012456953307',
}

response = requests.post(
    'https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf',
    cookies=cookies,
    headers=headers,
    data=data,
)

print(response.text)