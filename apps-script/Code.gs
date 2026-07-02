/**
 * Melis & Baha Düğün LCV (RSVP) — Google Apps Script Backend
 * ----------------------------------------------------------
 * Bu script, davetiye sayfasındaki formdan gelen katılım bilgilerini
 * bağlı olduğu Google Sheet'e satır olarak yazar.
 *
 * Sheet kolonları (otomatik oluşturulur):
 *   Zaman Damgası | Ad | Soyad | Katılım Durumu | Kişi Sayısı | Kaynak Parmak İzi
 *
 * Kurulum için bkz: KURULUM.md
 *
 * Güvenlik özellikleri:
 *   - Honeypot (bot tuzağı)
 *   - Sunucu tarafı validasyon
 *   - Rate limit (aynı parmak izinden 60 sn'de 1 kayıt)
 *   - Aynı Ad+Soyad için satır güncelleme (duplicate önleme)
 *   - Formül enjeksiyonu koruması
 *   - doGet veri döndürmez (misafir listesi asla dışarı sızmaz)
 */

// ————————————————————————————————————————————————
// Ayarlar
// ————————————————————————————————————————————————
var SHEET_NAME = 'LCV';
var HEADERS = ['Zaman Damgası', 'Ad', 'Soyad', 'Katılım Durumu', 'Kişi Sayısı', 'Kaynak Parmak İzi'];
var RATE_LIMIT_SECONDS = 60;   // Aynı parmak izinden en fazla 1 kayıt / bu süre
var MAX_KISI = 8;
var VALID_STATUSES = ['Katılıyorum', 'Katılmıyorum'];

// ————————————————————————————————————————————————
// HTTP giriş noktaları
// ————————————————————————————————————————————————

/**
 * doGet — Sağlık kontrolü. Asla veri döndürmez.
 */
function doGet() {
  return jsonOut({ status: 'ok' });
}

/**
 * doPost — Form gönderimini işler.
 * Frontend, CORS preflight'ı tetiklememek için gövdeyi text/plain olarak yollar;
 * gövde bir JSON string'dir.
 */
function doPost(e) {
  try {
    var body = parseBody(e);
    if (!body) {
      return jsonOut({ ok: false, error: 'Geçersiz istek gövdesi.' }, 400);
    }

    // 1) Honeypot — dolu ise bot kabul et. 200 dön ama HİÇBİR ŞEY yazma.
    if (body.web && String(body.web).trim() !== '') {
      return jsonOut({ ok: true }); // bot fark etmesin
    }

    // 2) Alanları normalize et
    var ad = sanitizeName_(body.ad);
    var soyad = sanitizeName_(body.soyad);
    var durum = String(body.durum == null ? '' : body.durum).trim();
    var kisiRaw = body.kisi;

    // 3) Validasyon
    var err = validate_(ad, soyad, durum, kisiRaw);
    if (err) {
      return jsonOut({ ok: false, error: err }, 400);
    }

    var kisi = (durum === 'Katılmıyorum') ? 0 : parseInt(kisiRaw, 10);

    // 4) Rate limit için parmak izi (Apps Script gerçek IP vermez — bkz KURULUM.md)
    var fingerprint = fingerprint_(ad, soyad, durum, kisi);

    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // en fazla 20 sn bekle
    try {
      var cache = CacheService.getScriptCache();
      var rlKey = 'rl_' + fingerprint;
      if (cache.get(rlKey)) {
        return jsonOut({ ok: false, error: 'Çok sık deneme. Lütfen biraz sonra tekrar deneyin.' }, 429);
      }
      cache.put(rlKey, '1', RATE_LIMIT_SECONDS);

      writeRow_(ad, soyad, durum, kisi, fingerprint);
    } finally {
      lock.releaseLock();
    }

    return jsonOut({ ok: true });
  } catch (ex) {
    return jsonOut({ ok: false, error: 'Sunucu hatası.' }, 500);
  }
}

// ————————————————————————————————————————————————
// Yardımcılar
// ————————————————————————————————————————————————

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (ignore) {
    return null;
  }
}

/**
 * İsim temizleme: baş/son boşlukları kırp, iç boşlukları teke indir.
 */
function sanitizeName_(v) {
  if (v == null) return '';
  return String(v).trim().replace(/\s+/g, ' ');
}

/**
 * Sunucu tarafı validasyon. Hata varsa mesaj (string), yoksa null döner.
 * İsimler: 2–50 karakter, sadece harf/boşluk/tire/apostrof (Türkçe karakterler dahil).
 */
function validate_(ad, soyad, durum, kisiRaw) {
  var nameRe = /^[A-Za-zÇĞİıÖŞÜçğöşü' \-]{2,50}$/;

  if (!ad || !nameRe.test(ad)) return 'Geçersiz ad.';
  if (!soyad || !nameRe.test(soyad)) return 'Geçersiz soyad.';
  if (VALID_STATUSES.indexOf(durum) === -1) return 'Geçersiz katılım durumu.';

  if (durum === 'Katılıyorum') {
    var n = Number(kisiRaw);
    if (!isFinite(n) || Math.floor(n) !== n || n < 1 || n > MAX_KISI) {
      return 'Kişi sayısı 1 ile ' + MAX_KISI + ' arasında olmalı.';
    }
  }
  return null;
}

/**
 * Formül enjeksiyonu koruması: hücre değeri =,+,-,@ ile başlıyorsa başına ' ekle.
 */
function safeCell_(v) {
  var s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

/**
 * Basit parmak izi: normalize edilmiş alanların SHA-256 hash'i (kısa hex).
 */
function fingerprint_(ad, soyad, durum, kisi) {
  var raw = (ad + '|' + soyad + '|' + durum + '|' + kisi).toLowerCase();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex.slice(0, 16);
}

/**
 * Aktif spreadsheet'te LCV sayfasını (başlık satırıyla) döndürür, yoksa oluşturur.
 */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Satır yaz. Aynı Ad+Soyad zaten varsa o satırı güncelle (duplicate önleme),
 * yoksa yeni satır ekle.
 */
function writeRow_(ad, soyad, durum, kisi, fingerprint) {
  var sheet = getSheet_();
  var now = new Date();
  var rowValues = [now, safeCell_(ad), safeCell_(soyad), safeCell_(durum), kisi, safeCell_(fingerprint)];

  var last = sheet.getLastRow();
  if (last >= 2) {
    // Ad (kolon 2) ve Soyad (kolon 3) sütunlarını oku
    var data = sheet.getRange(2, 2, last - 1, 2).getValues();
    var adKey = ad.toLocaleLowerCase('tr-TR');
    var soyadKey = soyad.toLocaleLowerCase('tr-TR');
    for (var i = 0; i < data.length; i++) {
      var existingAd = String(data[i][0]).replace(/^'/, '').toLocaleLowerCase('tr-TR');
      var existingSoyad = String(data[i][1]).replace(/^'/, '').toLocaleLowerCase('tr-TR');
      if (existingAd === adKey && existingSoyad === soyadKey) {
        var rowIndex = i + 2;
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
        return;
      }
    }
  }
  sheet.appendRow(rowValues);
}

/**
 * JSON çıktısı üret. Apps Script gerçek HTTP status kontrolü sunmadığı için
 * hata durumları gövdedeki `ok` alanı ile de belirtilir; frontend bunu kontrol eder.
 */
function jsonOut(obj, status) {
  if (status) obj._status = status;
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
