import requests

cookies = {
    'yolcuTabId': 'yolcuTabId1731672784733',
    'JSESSIONID': '0000GgRC_i3u5-SzfxdYtUrCAfu:18l6o8jct',
    'NSC_WJQ_UTN_FZCJT-HJTF_TTM': 'ffffffffaf10661a45525d5f4f58455e445a4a423660',
}

headers = {
    'Accept': 'application/xml, text/xml, */*; q=0.01',
    'Accept-Language': 'tr-TR,tr;q=0.7',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    # 'Cookie': 'yolcuTabId=yolcuTabId1731672784733; JSESSIONID=0000GgRC_i3u5-SzfxdYtUrCAfu:18l6o8jct; NSC_WJQ_UTN_FZCJT-HJTF_TTM=ffffffffaf10661a45525d5f4f58455e445a4a423660',
    'Faces-Request': 'partial/ajax',
    'Origin': 'https://ebilet.tcddtasimacilik.gov.tr',
    'Referer': 'https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-GPC': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
}

data = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:gidisSeferTablosu:4:j_idt117',
    'javax.faces.partial.execute': 'mainTabView:gidisSeferTablosu:4:j_idt117',
    'javax.faces.partial.render': 'mainTabView:gidisSeferTablosu',
    'javax.faces.behavior.event': 'valueChange',
    'javax.faces.partial.event': 'change',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '',
    'mainTabView:gidisSeferTablosu:0:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:0:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:0:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:1:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:1:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:1:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:2:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:2:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:2:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:3:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:3:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:3:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:4:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:4:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:4:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:4:j_idt117_input': 'on',
    'mainTabView:gidisSeferTablosu:5:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:6:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:7:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:8:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:8:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:8:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:9:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:9:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:9:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:10:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:10:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:10:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:11:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:11:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:11:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:12:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:12:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:12:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:13:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:13:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:13:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:14:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:14:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:14:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:15:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:15:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:15:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:16:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:16:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:16:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:17:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:17:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:17:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:18:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:18:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:18:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:19:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:19:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:19:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:20:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:20:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:20:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:21:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:21:j_idt109:0:somVagonTipiGidis1_input': '17001',
    'mainTabView:gidisSeferTablosu:21:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView_activeIndex': '0',
    'otBrowser': 'Chrome 131',
    'adSoyad': '',
    'id_forwardGroupIndex': '',
    'somSonKullanmaTarihiAy_input': '',
    'somSonKullanmaTarihiAy_focus': '',
    'somSonKullanmaTarihiYil_input': '',
    'somSonKullanmaTarihiYil_focus': '',
    'cvvNo': '',
    'j_idt520_active': '0',
    'javax.faces.ViewState': '-7909605755664983329:7754186944457311909',
}

response = requests.post(
    'https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf',
    cookies=cookies,
    headers=headers,
    data=data,
)

print(response.text)