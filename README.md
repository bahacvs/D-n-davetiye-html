# Melis & Baha · Düğün Davetiyesi + LCV (RSVP)

Tek sayfalık, mobil öncelikli düğün davetiyesi. Üst kısımda davetiye, altında katılım
(LCV/RSVP) formu, en altta mekan konumu + yol tarifi butonu bulunur. Form verileri bir
Google Apps Script Web App aracılığıyla bir Google Sheet'e yazılır.

- **Etkinlik:** 17 Temmuz 2026 Cuma · 19.00
- **Mekan:** Atagarden Kır Düğünü, Beylikdüzü / İstanbul

## Dosyalar

```
index.html            → Davetiye + LCV formu + konum (vanilla HTML/CSS/JS, bağımlılık yok)
apps-script/Code.gs   → Google Apps Script backend (Sheet'e yazar)
apps-script/KURULUM.md → Backend kurulum talimatı (adım adım)
```

## Mimari

1. **Frontend:** Statik `index.html`. Framework, build adımı veya npm bağımlılığı yok.
2. **Backend:** Google Apps Script Web App. Form `fetch` ile JSON POST eder.
3. **Veri:** Google Sheet — `Zaman Damgası | Ad | Soyad | Katılım Durumu | Kişi Sayısı | Kaynak Parmak İzi`

Form ad, soyad, katılım durumu (Katılıyorum / Katılmıyorum) ve kişi sayısı toplar.
"Katılmıyorum" seçilince kişi sayısı alanı gizlenir ve Sheet'e `0` yazılır.

## Kurulum

### 1. Backend (Google Sheet + Apps Script)

Ayrıntılı adımlar için: **[apps-script/KURULUM.md](apps-script/KURULUM.md)**

Özet: Google Sheet oluştur → Uzantılar → Apps Script → `Code.gs`'i yapıştır →
Web App olarak deploy et (Erişim: Herkes) → çıkan URL'i kopyala.

### 2. URL'i siteye bağla

`index.html` içindeki şu satırı, kopyaladığın Web App URL'i ile güncelle:

```js
var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

### 3. Yayınla (deploy)

Statik bir sayfa olduğu için herhangi bir statik host çalışır.

**Vercel:**
1. [vercel.com](https://vercel.com) → **Add New → Project** → bu GitHub reposunu içe aktar.
2. Framework Preset: **Other** · Build Command: boş · Output Directory: `.` (kök).
3. **Deploy**. Verilen URL'i davetlilerle paylaş.

**GitHub Pages (alternatif):**
1. Repo → **Settings → Pages**.
2. Source: **Deploy from a branch** → Branch: yayın branch'in → `/root` (kök) → **Save**.
3. Birkaç dakika içinde `https://<kullanıcı>.github.io/d-n-davetiye-html/` yayında olur.

> Not: URL'i (`APPS_SCRIPT_URL`) `index.html`'e yapıştırıp commit etmeden deploy edersen
> form çalışmaz; önce backend kurulumunu tamamla.

## Güvenlik

- Frontend'de hiçbir secret yok — yalnızca yazma yapan public Web App URL'i.
- Sayfa misafir listesini **asla okumaz/göstermez** (`doGet` yalnızca `{"status":"ok"}` döner).
- Honeypot (bot tuzağı), sunucu tarafı validasyon, rate limit, duplicate güncelleme ve
  formül enjeksiyonu koruması Apps Script'te uygulanır. Ayrıntı: `apps-script/KURULUM.md`.

## Yerelde önizleme

```bash
# Basit bir statik sunucu (Python 3)
python3 -m http.server 8000
# Tarayıcıda: http://localhost:8000
```

Backend URL'i girilmeden form gönderimi denenirse "Form henüz yapılandırılmadı" uyarısı
gösterilir; tasarım ve akış yine de önizlenebilir.
