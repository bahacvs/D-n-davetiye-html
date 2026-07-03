# Google Apps Script Kurulumu (Adım Adım)

Bu doküman, LCV formundan gelen verilerin bir Google Sheet'e yazılması için gereken
backend kurulumunu anlatır. Toplam süre ~10 dakika. Kod bilgisi gerekmez.

---

## 1) Google Sheet oluştur

1. [sheets.new](https://sheets.new) adresine git → boş bir tablo açılır.
2. Tabloya bir isim ver, örn. **"Melis & Baha LCV"**.
   > Kolon başlıklarını elle eklemene gerek yok — script ilk kayıtta `LCV` sayfasını
   > ve başlıkları (`Zaman Damgası | Ad | Soyad | Katılım Durumu | Kişi Sayısı | Kaynak Parmak İzi`)
   > otomatik oluşturur.

## 2) Apps Script'i aç

1. Aynı tabloda üst menüden **Uzantılar → Apps Script**'e tıkla.
2. Açılan editörde soldaki `Code.gs` dosyasının içindeki her şeyi sil.
3. Bu depodaki [`Code.gs`](./Code.gs) dosyasının **tüm içeriğini** kopyalayıp yapıştır.
4. Sağ üstten **Kaydet** (💾) simgesine bas.

## 3) Web App olarak deploy et

1. Sağ üstte **Dağıt (Deploy) → Yeni dağıtım** butonuna tıkla.
2. "Dağıtım türünü seç" (dişli ikonu) → **Web uygulaması**'nı seç.
3. Ayarları şöyle yap:
   - **Açıklama:** LCV endpoint (istediğini yazabilirsin)
   - **Çalıştıran (Execute as):** *Ben (kendi hesabın)*
   - **Erişebilecek kişiler (Who has access):** **Herkes (Anyone)**
     > Bu, formun herkesten kayıt alabilmesi için gereklidir. Endpoint yalnızca **yazma**
     > yapar; misafir listesini asla dışarı vermez (`doGet` sadece `{"status":"ok"}` döner).
4. **Dağıt**'a bas. İlk seferde Google **yetkilendirme** ister:
   - "Yetkileri incele" → hesabını seç → "Gelişmiş" → "…proje adına git (güvenli değil)" →
     "İzin ver". (Bu senin kendi script'in olduğu için normaldir.)
5. Deploy tamamlanınca sana bir **Web uygulaması URL'i** verir. Şuna benzer:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   **Bu URL'i kopyala.**

## 4) URL'i siteye bağla

1. Depodaki [`../index.html`](../index.html) dosyasını aç.
2. Aşağıdaki satırı bul (script bölümünün başında):
   ```js
   var APPS_SCRIPT_URL = "BURAYA_APPS_SCRIPT_WEB_APP_URL_YAPISTIRIN";
   ```
3. Tırnak içindeki metni, 3. adımda kopyaladığın **Web App URL'i** ile değiştir:
   ```js
   var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Kaydet ve siteyi tekrar deploy et (bkz. ana [`README.md`](../README.md)).

---

## Fotoğraf yükleme (Drive'a kaydetme)

Site, misafirlerin düğün fotoğraflarını yüklemesine izin verir. Fotoğraflar, bu script'in
sahibi olan Google hesabının **Drive'ında `Düğün Fotoğrafları` klasörüne** kaydedilir
(klasör ilk yüklemede otomatik oluşur). Fotoğraf verisi aynı Web App endpoint'ine gider;
`type: "photo"` alanıyla LCV kaydından ayrılır.

**Bu özelliği açmak için script'i güncelleyip yeniden yayınla:**

1. Depodaki güncel [`Code.gs`](./Code.gs) içeriğini kopyala, Apps Script editöründeki her
   şeyi silip yapıştır → **Kaydet**.
2. **URL'i korumak için** (site aynı URL'i kullanıyor): **Dağıt → Dağıtımları yönet →**
   mevcut dağıtımın yanındaki ✏️ (Düzenle) → **Sürüm: Yeni sürüm** → **Dağıt**.
   > ⚠️ "Yeni dağıtım" AÇMA — o yeni bir URL üretir. Mevcut dağıtımı "yeni sürüm" olarak
   > güncelle ki `/exec` URL'i değişmesin.
3. İlk kez **Drive yetkisi** istenir (script artık Drive'a dosya yazacağı için):
   "Yetkileri incele → hesabını seç → Gelişmiş → …proje adına git → İzin ver".
4. Bitti. Sitede ek bir değişiklik gerekmez.

**Güvenlik/sınırlar:** Yalnızca resim dosyaları (`image/*`) kabul edilir; dosya başına
~15 MB sınır vardır; dosya adları temizlenir. Fotoğraflar senin Drive kotanı kullanır
(ücretsiz 15 GB). Site, fotoğrafları yalnızca **yükler**; hiçbir fotoğrafı veya klasörü
dışarıya listelemez/göstermez.

---

## Zaman Kapsülü (1. yıla mesaj)

Misafirler siteden çifte bir mesaj bırakır; mesajlar **"Zaman Kapsülü"** sayfasına yazılır
ve **1. evlilik yıldönümünde** (`ANNIVERSARY`) tek seferde çifte (`COUPLE_EMAIL`) e-postayla
gönderilir.

**Kurulum:**

1. `Code.gs` içindeki `COUPLE_EMAIL` ve `ANNIVERSARY` değerlerini kontrol et/güncelle.
2. Manifest'e e-posta iznini ekle: `appsscript.json` → `oauthScopes` listesine
   `"https://www.googleapis.com/auth/script.send_mail"` ekle.
3. Editörde `doGet`'i çalıştırıp yeni izni onayla → **Dağıt → Dağıtımları yönet → Yeni sürüm**.
4. **Yıldönümü tetikleyicisini kur** (mesajların otomatik gitmesi için):
   - Sol menü → **Tetikleyiciler (⏰) → Tetikleyici ekle**
   - Fonksiyon: **`kapsulKontrol`** · Olay kaynağı: **Zamana dayalı** · **Gün zamanlayıcı**
     (örn. her sabah). Bu fonksiyon her gün tarihi kontrol eder; yıldönümü gelince mesajları
     bir kez gönderir, sonra kendini tekrar göndermez.
   - Alternatif: yıldönümünde **`kapsulGonder_`** fonksiyonunu elle bir kez çalıştır.

Formu doldurup gönder → Google Sheet'te **LCV** sayfasına yeni bir satır düşmeli.

Apps Script editöründen de test edebilirsin. **Editörde** yeni bir fonksiyon ekleyip
çalıştırarak örnek gövdeleri deneyebilirsin:

```js
function test_gecerli() {
  var e = { postData: { contents: JSON.stringify({
    ad: 'Ayşe', soyad: 'Yılmaz', durum: 'Katılıyorum', kisi: 2, web: ''
  }) } };
  Logger.log(doPost(e).getContent()); // beklenen: {"ok":true}
}

function test_honeypot() {
  var e = { postData: { contents: JSON.stringify({
    ad: 'Bot', soyad: 'Test', durum: 'Katılıyorum', kisi: 2, web: 'spam'
  }) } };
  Logger.log(doPost(e).getContent()); // {"ok":true} ama Sheet'e YAZMAZ
}

function test_gecersiz_ad() {
  var e = { postData: { contents: JSON.stringify({
    ad: 'A', soyad: 'Yılmaz', durum: 'Katılıyorum', kisi: 2, web: ''
  }) } };
  Logger.log(doPost(e).getContent()); // {"ok":false,"error":"Geçersiz ad.",...}
}

function test_kisi_asimi() {
  var e = { postData: { contents: JSON.stringify({
    ad: 'Ayşe', soyad: 'Yılmaz', durum: 'Katılıyorum', kisi: 20, web: ''
  }) } };
  Logger.log(doPost(e).getContent()); // {"ok":false,...}
}

function test_duplicate() {
  // Aynı ad+soyad tekrar → yeni satır EKLEMEZ, mevcut satırı günceller.
  var e = { postData: { contents: JSON.stringify({
    ad: 'Ayşe', soyad: 'Yılmaz', durum: 'Katılmıyorum', kisi: 0, web: ''
  }) } };
  Logger.log(doPost(e).getContent()); // {"ok":true}
}

function test_foto() {
  // 1x1 saydam PNG (base64). Çalıştırınca Drive'da "Düğün Fotoğrafları"
  // klasörü oluşur ve içine küçük bir test görseli düşer.
  var png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  var e = { postData: { contents: JSON.stringify({
    type: 'photo', ad: 'Test', filename: 'test.png', mime: 'image/png', data: png1x1, web: ''
  }) } };
  Logger.log(doPost(e).getContent()); // beklenen: {"ok":true}
}
```

> **Not:** Rate limit aynı veriden 60 sn'de 1 kayda izin verir. Test fonksiyonlarını arka
> arkaya çalıştırırken aynı ad/soyad/durum/kişi kombinasyonu için `{"error":"Çok sık deneme..."}`
> görebilirsin; bu beklenen davranıştır, farklı isimle veya biraz bekleyip dene.

---

## Güvenlik notları

- **Frontend'de secret yok.** Sadece Web App URL'i bulunur; bu URL public olabilir çünkü
  endpoint yalnızca yazar ve sunucu tarafında korumalıdır.
- **IP hakkında:** Apps Script çağıran kullanıcının gerçek IP'sini vermez. Bu yüzden rate
  limit, **gönderilen alanların hash'inden** üretilen bir "parmak izi" ile yapılır
  (aynı veriyi 60 sn içinde tekrar tekrar gönderen istekleri sınırlar). Bu, IP tabanlı bir
  limit değildir; davetiye ölçeğinde spam'i engellemek için yeterlidir.
- **Formül enjeksiyonu:** `=`, `+`, `-`, `@` ile başlayan hücre değerlerinin başına `'`
  eklenir, böylece Sheet bunları formül olarak çalıştırmaz.
- **Duplicate:** Aynı ad+soyad ikinci kez gönderilirse eski satır güncellenir (kişi
  sayısını/durumunu değiştirebilirler), yeni satır eklenmez.

## Veri kolonları

| Zaman Damgası | Ad | Soyad | Katılım Durumu | Kişi Sayısı | Kaynak Parmak İzi |
|---|---|---|---|---|---|
| 2026-07-02 14:33 | Ayşe | Yılmaz | Katılıyorum | 2 | a1b2c3d4e5f6a7b8 |

"Katılmıyorum" seçilen kayıtlarda **Kişi Sayısı = 0** yazılır.
