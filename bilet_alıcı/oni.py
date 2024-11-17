import requests
from bs4 import BeautifulSoup
import time

# Global değişkenler
BASE_URL = "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/tcddWebContent.jsf"
SEFER_URL = "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/int_sat_001.jsf"

tabId = "yolcuTabId1731711913111"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
}

#Date Select
DATA_DATESELECT = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'trCalGid',
    'javax.faces.partial.execute': 'trCalGid trCalDon',
    'javax.faces.partial.render': 'trCalDon trCalGid',
    'javax.faces.behavior.event': 'dateSelect',
    'javax.faces.partial.event': 'dateSelect',
    'biletAramaForm': 'biletAramaForm',
    'tipradioIslemTipi': '0',
    'nereden': 'Eskişehir',
    'trCalGid_input': '18.11.2024',
    'tipradioSeyehatTuru': '1',
    'nereye': 'İstanbul(Söğütlüçeşme)',
    'syolcuSayisi_input': '1',
    'javax.faces.ViewState': '',  # ViewState buraya eklenecek
}

DATA_SEARCHBTN = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'btnSeferSorgula',
    'javax.faces.partial.execute': 'btnSeferSorgula biletAramaForm',
    'javax.faces.partial.render': 'msg biletAramaForm',
    'btnSeferSorgula': 'btnSeferSorgula',
    'biletAramaForm': 'biletAramaForm',
    'tipradioIslemTipi': '0',
    'nereden': 'Eskişehir',
    'trCalGid_input': '18.11.2024',
    'tipradioSeyehatTuru': '1',
    'nereye': 'İstanbul(Söğütlüçeşme)',
    'syolcuSayisi_input': '1'
}

DATA_SEFERSELECT = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:gidisSeferTablosu:7:j_idt117',
    'javax.faces.partial.execute': 'mainTabView:gidisSeferTablosu:7:j_idt117',
    'javax.faces.partial.render': 'mainTabView:gidisSeferTablosu',
    'javax.faces.behavior.event': 'valueChange',
    'javax.faces.partial.event': 'change',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '',
    'mainTabView:gidisSeferTablosu:0:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:0:j_idt109:0:somVagonTipiGidis1_input': '17001',
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
    'mainTabView:gidisSeferTablosu:5:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:6:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:7:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:7:j_idt117_input': 'on',
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
    'mainTabView:gidisSeferTablosu:21:j_idt109:0:somVagonTipiGidis1_input': '17002',
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
    'javax.faces.ViewState': '6967748850758432472:6412488861067437895',
}


DATA_DEVAMBTN = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:btnDevam44',
    'javax.faces.partial.execute': 'mainTabView:btnDevam44 mainTabView:pgidisSeferleri mainTabView:pdonusSeferleri',
    'javax.faces.partial.render': 'int_sat_001_form mainTabView:kriterSecimi mainTabView:koltukSecimi mainTabView:vagonTabPanel',
    'mainTabView:btnDevam44': 'mainTabView:btnDevam44',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '',
    'mainTabView:gidisSeferTablosu:0:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:0:j_idt109:0:somVagonTipiGidis1_input': '17001',
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
    'mainTabView:gidisSeferTablosu:5:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:5:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:6:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:6:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:7:seferBilgileriDataList:0:soBiletTipi': '1',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_input': '17002',
    'mainTabView:gidisSeferTablosu:7:j_idt109:0:somVagonTipiGidis1_focus': '',
    'mainTabView:gidisSeferTablosu:7:j_idt117_input': 'on',
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
    'mainTabView:gidisSeferTablosu:21:j_idt109:0:somVagonTipiGidis1_input': '17002',
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
    'javax.faces.ViewState': '523801034903612009:-8180314892298323029',
}

DATA_VAGONSELECT = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:j_idt206:1:gidisVagonlariGost',
    'javax.faces.partial.execute': 'mainTabView:j_idt206:1:gidisVagonlariGost mainTabView:vagonTabPanel mainTabView:pgYolcuBilgileri',
    'javax.faces.partial.render': 'mainTabView:pgKoltukAtamalariVagon msg mainTabView:dtBiletRezBilgileri',
    'mainTabView:j_idt206:1:gidisVagonlariGost': 'mainTabView:j_idt206:1:gidisVagonlariGost',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '',
    'mainTabView:yonSecimTabView:koltukSecimTabViewGidis_activeIndex': '0',
    'mainTabView:yonSecimTabView_activeIndex': '0',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuSoyIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:yolcutcno': '',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_input': '1',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_focus': '',
    'mainTabView:dtBiletRezBilgileri:0:dogTar2': '',
    'mainTabView:imIletisimCep': '',
    'mainTabView:imIletisimEposta': '',
    'mainTabView:tipradioIletisimTuru': '0',
    'mainTabView_activeIndex': '1',
    'otBrowser': 'Chrome 131',
    'adSoyad': '',
    'id_forwardGroupIndex': '',
    'somSonKullanmaTarihiAy_input': '',
    'somSonKullanmaTarihiAy_focus': '',
    'somSonKullanmaTarihiYil_input': '',
    'somSonKullanmaTarihiYil_focus': '',
    'cvvNo': '',
    'j_idt520_active': '0',
    'javax.faces.ViewState': '6967748850758432472:6412488861067437895',
}

DATA_SEATSELECT = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'mainTabView:j_idt214',
    'javax.faces.partial.execute': 'mainTabView:dtBiletRezBilgileri mainTabView:j_idt214',
    'javax.faces.partial.render': 'msg mainTabView:olAtanacakYolcu mainTabView:pAtanacakYolcu mainTabView:dtBiletRezBilgileri mainTabView:pgYolcuBilgileri cinsiyet_secimi_form mainTabView:yonSecimTabView mainTabView:pgKoltukAtamalariVagon',
    'javax.faces.behavior.event': 'seatSelect',
    'javax.faces.partial.event': 'seatSelect',
    'mainTabView:j_idt214_number': '9h',
    'int_sat_001_form': 'int_sat_001_form',
    'pb': '',
    'mainTabView:yonSecimTabView:koltukSecimTabViewGidis_activeIndex': '0',
    'mainTabView:yonSecimTabView_activeIndex': '0',
    '9h_selection': '9h',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:iptYolcuSoyIsmi': '',
    'mainTabView:dtBiletRezBilgileri:0:yolcutcno': '',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_input': '1',
    'mainTabView:dtBiletRezBilgileri:0:soTarife_focus': '',
    'mainTabView:dtBiletRezBilgileri:0:dogTar2': '',
    'mainTabView:imIletisimCep': '',
    'mainTabView:imIletisimEposta': '',
    'mainTabView:tipradioIletisimTuru': '0',
    'mainTabView_activeIndex': '1',
    'otBrowser': 'Chrome 131',
    'adSoyad': '',
    'id_forwardGroupIndex': '',
    'somSonKullanmaTarihiAy_input': '',
    'somSonKullanmaTarihiAy_focus': '',
    'somSonKullanmaTarihiYil_input': '',
    'somSonKullanmaTarihiYil_focus': '',
    'cvvNo': '',
    'j_idt520_active': '0',
    'javax.faces.ViewState': '-2361939651785179721:-6207518556976007661',
}

DATA_GENDERSELECT = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'j_idt548',
    'javax.faces.partial.execute': 'j_idt548',
    'javax.faces.partial.render': 'mainTabView:dtBiletRezBilgileri msg mainTabView:pgYolcuBilgileri mainTabView:olAtanacakYolcu mainTabView:pAtanacakYolcu mainTabView:pgKoltukAtamalariVagon',
    'javax.faces.behavior.event': 'valueChange',
    'javax.faces.partial.event': 'change',
    'cinsiyet_secimi_form': 'cinsiyet_secimi_form',
    'j_idt548_input': 'on',
    'javax.faces.ViewState': '-2361939651785179721:-6207518556976007661',
}

# 1. Oturum ve ViewState Alma
def get_session_and_viewstate(base_url, headers):
    session = requests.Session()  # Oturum oluştur
    response = session.get(base_url, headers=headers)
    
    if response.status_code == 200:
        # HTML yanıtını analiz et
        soup = BeautifulSoup(response.text, 'html.parser')
        view_state = soup.find('input', {'name': 'javax.faces.ViewState'}).get('value')  # ViewState'i çıkar
        session.cookies.set('yolcuTabId', tabId)
        print(f"ViewState Alındı: {view_state}")
        return session, view_state
    else:
        print(f"Başarısız GET isteği. Durum Kodu: {response.status_code}")
        return None, None

# 2. POST İsteği Yapma
def send_post_request(session, base_url, headers, data):
    data['javax.faces.ViewState'] = view_state
    # POST isteği
    response = session.post(base_url, headers=headers, data=data)

    # Sonucu yazdır
    if response.status_code == 200:
        print("POST İsteği Başarılı:")
        print(response.text[:3000])
    else:
        print(f"Başarısız POST isteği. Durum Kodu: {response.status_code}")
        print(response.text)

# Ana kod
# Session ve ViewState al
session, view_state = get_session_and_viewstate(BASE_URL, HEADERS)

# Session bilgilerini yazdır
if session:
    jsessionid = session.cookies.get('JSESSIONID', 'Bulunamadı')
    yolcu_tab_id = session.cookies.get('yolcuTabId', 'Bulunamadı')
    
    print(f"JSESSIONID: {jsessionid}")
    print(f"YolcuTabId: {yolcu_tab_id}")

# Eğer session ve viewstate alınmışsa POST isteği yap
if session and view_state:
    # ViewState'i data içine ekle
    print("Date Select:")
    data = DATA_DATESELECT.copy()
    send_post_request(session, BASE_URL, HEADERS, data)
    
    print("Search:")
    data_search = DATA_SEARCHBTN.copy()
    send_post_request(session, BASE_URL, HEADERS, data_search)
    
    session, view_state = get_session_and_viewstate(SEFER_URL, HEADERS)
    time.sleep(1)
    print("Sefer select:")
    data_seferselect = DATA_SEFERSELECT
    send_post_request(session, SEFER_URL, HEADERS, data_seferselect)
    
    print("Devam Buton")
    data_devambtn = DATA_DEVAMBTN
    send_post_request(session, SEFER_URL, HEADERS, data_devambtn)
    
    print("Vagon Select")
    data_vagonsel = DATA_VAGONSELECT
    send_post_request(session, SEFER_URL, HEADERS, data_vagonsel)
    
    print("Seat Select")
    data_seatsel = DATA_SEATSELECT
    send_post_request(session, SEFER_URL, HEADERS, data_seatsel)
    
    print("Gender Select")
    data_gendersel = DATA_GENDERSELECT
    send_post_request(session, SEFER_URL, HEADERS, data_gendersel)
else:
    print("Oturum veya ViewState alınamadı.")
