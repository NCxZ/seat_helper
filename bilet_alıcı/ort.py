import requests
from bs4 import BeautifulSoup

# 1. Oturum ve ViewState Alma
def get_session_and_viewstate():
    session = requests.Session()  # Oturum oluştur
    url = "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/tcddWebContent.jsf"  # Başlangıç URL
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    }
    
    # İlk GET isteği
    response = session.get(url, headers=headers)
    
    if response.status_code == 200:
        # HTML yanıtını analiz et
        soup = BeautifulSoup(response.text, 'html.parser')
        view_state = soup.find('input', {'name': 'javax.faces.ViewState'}).get('value')  # ViewState'i çıkar
        print(f"ViewState Alındı: {view_state}")
        return session, view_state
    else:
        print(f"Başarısız GET isteği. Durum Kodu: {response.status_code}")
        return None, None

# 2. POST İsteği Yapma
def send_post_request(session, view_state):
    url = "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/tcddWebContent.jsf"  # POST yapılacak URL
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
    }
    cookies = {
        'yolcuTabId': 'yolcuTabId1731672784733',
        'JSESSIONID': session.cookies.get('JSESSIONID', ''),
    }

    # Data içeriği (dateSelect.py'den alındı)
    data = {
        'javax.faces.partial.ajax': 'true',
        'javax.faces.source': 'trCalGid',
        'javax.faces.partial.execute': 'trCalGid trCalDon',
        'javax.faces.partial.render': 'trCalDon trCalGid',
        'javax.faces.behavior.event': 'dateSelect',
        'javax.faces.partial.event': 'dateSelect',
        'biletAramaForm': 'biletAramaForm',
        'tipradioIslemTipi': '0',
        'nereden': 'İstanbul(Söğütlüçeşme)',
        'trCalGid_input': '16.11.2024',
        'tipradioSeyehatTuru': '1',
        'nereye': 'Eskişehir',
        'syolcuSayisi_input': '1',
        'javax.faces.ViewState': view_state,  # Dinamik olarak alınan ViewState ekleniyor
    }

    # POST isteği
    response = session.post(url, headers=headers, cookies=cookies, data=data)

    # Sonucu yazdır
    if response.status_code == 200:
        print("POST İsteği Başarılı:")
        print(response.text)
    else:
        print(f"Başarısız POST isteği. Durum Kodu: {response.status_code}")
        print(response.text)

# Ana kod
# Get Session
session, view_state = get_session_and_viewstate()

#Print Session Info
jsessionid = session.cookies.get('JSESSIONID', 'Bulunamadı')
yolcu_tab_id = session.cookies.get('yolcuTabId', 'Bulunamadı')
print(f"JSESSIONID: {jsessionid}")
print(f"YolcuTabId: {yolcu_tab_id}")

if session and view_state:
    send_post_request(session, view_state)
else: 
    print("session:" + str(session) + " viewstate:" + str(view_state))
