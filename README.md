# TCDD Koltuk Takip Asistanı

Bu Chrome eklentisi, TCDD Taşımacılık (ebilet.tcddtasimacilik.gov.tr) web sitesi üzerinde aradığınız trende yer kalmadığı durumlarda otomatik olarak **koltuk takibi** yapar ve yer açıldığında sizin adınıza **otomatik seçim** gerçekleştirir.

## Özellikler

*   **Otomatik Takip:** Seçtiğiniz kalkış/varış istasyonu, tarih ve **saat(ler)** için arka planda sürekli sorgulama yapar.
*   **Hızlı Sorgulama (1 Saniye):** Koltuk durumunu her saniye kontrol ederek boşluğu en hızlı şekilde yakalar.
*   **Akıllı Koltuk Seçimi:**
    *   Sadece "Satılabilir" (boş) olan koltukları tespit eder.
    *   **Bilet Tipi Filtreleme:** Ekonomi, Pulman, Örtülü Kuşet vb. istediğiniz vagon tiplerini seçebilirsiniz. İstemediğiniz pahalı veya farklı sınıfları otomatik eler.
*   **Otomatik Rezervasyon Adımları:**
    *   Uygun koltuk bulunduğunda sizi otomatik olarak bilet sayfasına yönlendirir (veya yeni sekme açar).
    *   İstasyonları doldurur, tarihi seçer ve seferi bulur.
    *   Vagonu seçer ve boşalan o **özel koltuğu** (Örn: Vagon 2, Koltuk 14C) otomatik olarak işaretler.
    *   Varsa cinsiyet seçimini (Kadın/Erkek) otomatik yapar.
    *   İşlem tamamlandığında sesli/görsel bildirim verir ve "Ödeme Yapın" aşamasına getirir.
*   **Kullanıcı Dostu Arayüz:**
    *   Son yapılan aramaları hatırlar.
    *   Sefer saatlerini ve vagon sınıflarını (Ekonomi, Business vs.) dinamik olarak listeler.
    *   Oturum (Token) kontrolü yapar ve süre dolduğunda uyarır.

## Nasıl Kullanılır?

1.  **Kurulum:**
    *   Bu klasörü bir yere indirin.
    *   Chrome tarayıcısında `chrome://extensions` adresine gidin.
    *   Sağ üstten "Geliştirici Modu"nu açın.
    *   "Paketlenmemiş öğe yükle" butonuna tıklayıp bu klasörü seçin.

2.  **Başlatma:**
    *   TCDD (https://ebilet.tcddtasimacilik.gov.tr/) sayfasına gidin ve giriş yapın (Token yakalanması için gereklidir).
    *   Eklenti simgesine tıklayın.
    *   Nereden, Nereye ve Tarih seçimi yapın.
    *   Listelenen **Sefer Saatlerinden** takip etmek istediklerinizi seçin.
    *   Alt kısımda açılan **Vagon Tiplerinden** (Ekonomi, Pulman vb.) size uyanları işaretleyin.
    *   **"Başlat"** butonuna basın.

3.  **Takip Süreci:**
    *   Eklenti arka planda çalışır. TCDD sekmesini kapatmayın (arka planda açık kalabilir).
    *   Yer bulunduğu anda siteyi ön plana getirir ve işlemleri otomatik yapar.
    *   Siz sadece çıkan "BİLET SEÇİLDİ" uyarısından sonra ödemenizi yaparsınız.

## Güvenlik

*   Eklenti kişisel verilerinizi (şifre, kimlik no vb.) **kaydetmez**.
*   Sadece tarayıcınızdaki aktif oturum anahtarını (Token) kullanır.
*   Tüm işlemler sizin tarayıcınız üzerinden TCDD sunucularıyla doğrudan yapılır.

## Notlar

*   Bilgisayarınızın ve internet bağlantınızın hızı, otomatik tıklama işlemlerinin başarısını etkileyebilir.
*   TCDD web sitesinde yapılan tasarım değişiklikleri eklentinin çalışmasını etkileyebilir.
