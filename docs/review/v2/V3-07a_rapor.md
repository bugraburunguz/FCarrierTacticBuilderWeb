# V3-07a — Sayfa envanteri + ilk karşılaşılan ekranlar (v3)

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-07a/`:

| Klasör | İçerik | Çekim |
|---|---|---:|
| `envanter/` | her sayfa rotası, 1280 koyu | 32 |
| `sayfalar/` | yeni ekranlar × 375/768/1280 × koyu/açık | 102 |
| `growth/` | Gelişim regresyonu | 36 |

## 0. Gelişim düzeltmesi

"En çok yükselenler" ve "Düşenler" çubukları artık ortak ölçekte: iki listenin mutlak en büyük farkı (`MoversChart scaleMax`). −1, +14'ün yanında kısa görünüyor. Kırmızı test önce yazıldı: −1 çubuğu +5'in beşte biri genişliğinde.

## 1. Sayfa envanteri (`V3-07_envanter.md`)

Tablo kodu tarayarak üretiliyor (`node scripts/page-inventory.mjs`), elle tablo yok. Her rota için şunlar çıkarılıyor:
- v3'te açılan bileşen
- eski bileşen işaretleri: doğrudan sayfa dosyasında ve kabuk hariç içe aktarma zincirinde (ui.tsx Card/Pill/Modal/Stat, Modal.tsx, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex; kart tasarım config'i hariç)
- kim görür
- önerilen task

**Özet:**

| Durum | Sayı |
|---|---:|
| Rota (toplam) | 39 |
| Sayfa | 33 |
| Yönlendirme | 6 |
| v3 sayfası | 19 (V3-07a'dan önce 11; bu görevde +8: 7 sayfa dönüştü — ana sayfa, giriş, kayıt, doğrulama, içe aktarma, yeni kariyer, profil — ve yeni rota `/privacy`) |
| Hâlâ eski (v2) bileşen | 14 |
| Eski parçası hiç olmayan | 7 |

**Zincirdeki ortak eski parçalar** (V3-08 temizlik):
- `components/ui.tsx`: `WeaponState` renkleri hex (#2fbf71 vb.); `HelpPopover`/`MoneyInput` üzerinden neredeyse her sayfanın zincirinde.
- `lib/squadBuilder.ts`: OVR renkleri hex.
- `components/squadBuilder/PositionCard.tsx`: Tailwind slate/teal.
- `components/PlayerAvatar.tsx`: teal/slate.
- `components/SquadDensity.tsx`: emerald.
- `Modal.tsx`: `TacticCodeCard`, `ApplyTab`, `PickBody`.
- `features/desk/DeskSettings.tsx`: hâlâ ui.tsx `Card` (v2 ile ortak).

**V3-07b önerilen kapsam (12 rota, hepsi v2 bileşeni):**
- Kariyer çekirdeği:
  - `/squad/builder`, `/squad`, `/tactics/wizard`, `/teams`, `/wonderkids`, `/compare`
  - `/squad` ve `/squad/builder` en ağır zincir: PositionCard, SquadDensity, TacticCodeCard → Modal.tsx
- UT:
  - `/ut/squad`, `/ut/meta`, `/ut/club`, `/ut/objectives`, `/ut/evo`, `/ut/import`
  - `/ut/club` zincirinde PlayerAvatar (teal/slate)

**V3-08:**
- `/about`, `/admin/ut` (admin)
- v3 sayfalarının zincirindeki ortak eski parçalar (yukarıdaki liste)

## 2. Giriş / kayıt / e-posta doğrulama (v3)

- **Ortak düzen:** ortalanmış tek cam kart, marka (LogoLockup), kısa metinler (`features/account/`).
- **Değişmeyen kurallar:** IP başına günlük kayıt sınırı, doğrulama e-postası, hata metinleri (`errorMessage` aynı; sunucu kodları ve mesajları aynı).
- **Şifre alanları:** göster/gizle düğmesi (`aria-pressed`, "Şifreyi göster/gizle"). Autocomplete: e-posta `username`, giriş `current-password`, kayıt ve yeni şifre `new-password`.
- **Gizlilik:** kayıt formunda "Gizlilik ve aydınlatma metni" bağlantısı → `/privacy` yer tutucusu ("Hazırlanıyor"). Onay kutusu eklenmedi (PROD-PREP).
- **Playwright:** yalnız localhost; geçici kapı hesabı (yerel, koşu sonunda silindi). Hata çekimi gerçek yanlış şifreyle (401).

## 3. Ana sayfa (v3, mod başına)

- **Marka:** "FC Assist", alt başlık "Kariyer" / "Ultimate Team".
- **Kariyer:**
  - "Kariyerine devam et": son kariyer, son içe aktarma tarihi, takım uyumu (Masa ile aynı `useSlotFits` → `teamFitPct`), 3 iş'in ilki (`deskRules.rankActions`).
  - Hızlı eylemler: Masa, Transfer, İçe aktar, Yeni kariyer.
  - Kariyer yoksa "Henüz kariyerin yok" + Yeni kariyer.
  - Girişsiz: kısa tanıtım + Kayıt ol / Giriş yap (kariyer isteği yok).
- **UT:**
  - Bugünün SBC'leri: aktif setlerden en yeni 4, `SbcCard` yeniden kullanılıyor. Veri yükleme mantığı SBC listesinden `useActiveSbcSets`'e çıkarıldı (kopya yok).
  - Kadrom özeti: yakalanmış kulüp kartı varsa sayı ve en yüksek reyting.
  - İzlenen oyuncuların fiyat değişimi: uygulamada izleme listesi verisi yok → blok yok.
  - Yakalama bayrağı kapalıysa SBC ve kulüp blokları yok (test).

## 4. Kariyer içe aktarma (v3)

- **Adım göstergesi:** 1 Script indir → 2 LE'de çalıştır → 3 Dosyayı sürükle. İkonlu adım kartları; görsel uydurulmadı.
- **Sürükle-bırak alanı:** tıklama/Enter ile de seçiliyor. Dosya boyutu doğru birimle (`formatBytes`: "820 KB", "1,5 MB"). Önceki ekran MB'ye aşağı yuvarlıyordu (1,5 MB → "1 MB", 820 KB → "0 MB").
- **Yükleme ilerlemesi:** `role="progressbar"` belirsiz (indeterminate). İstemci `fetch` ile gönderiyor, bayt ilerlemesi ölçülmüyor; davranış değişmesin diye XHR'a geçilmedi.
- **Tablo bazlı doğrulama** (`importChecks`):
  - players ✓ / teams ✓ (sayı)
  - Kariyer: `NOT_IN_CAREER` → "✗ kariyer algılanmadı"
  - Kadro: otomatik kurulduysa takım ve oyuncu sayısı
  - Uyarı metinleri `importWarningText` ile aynı.
- **Değişmeyenler:** uçlar ve doğrulamalar (`importCareer`, `careerTeams`, `syncSquad`), gelişmiş CSV yolu, LE script'inin tek kaynağı (WEB-BUG-25: `public/fc27_career_export.lua`, `BASE_URL`).

## 5. Yeni kariyer (v3)

- **Alanlar:** kulüp arama (katalog kulüpleri, açılır liste), ad, sezon, oyun tarihi, bütçe (MoneyInput).
- **Bütçe:** boşsa gönderilmiyor (önceki form `budget ?? 0` gönderiyordu; ENG-02).
- **Oyun tarihi:** oluşturma isteğinde alan yok, bu yüzden oluşturduktan sonra kariyere yazılıyor (`PATCH gameDate`).
- **Akış:** oluştur → aktif kariyer → Masa.
- Mevcut kariyerler listesi (Aç / Sil) korundu.

## 6. Profil ve abonelik (v3 Pano)

- **Paneller:** Hesap, Kredi, Şifre değiştir, Abonelik, Oturumu kapat.
- **Şifre değiştir — yeni backend ucu** `POST /me/password` (API CONTRACT CHANGE):
  - Mevcut şifre bcrypt ile doğrulanıyor. Yanlışsa **422** "Mevcut şifre hatalı."; 401 değil, istemci oturumu yenilemeye ya da çıkışa yönelmesin.
  - Yeni şifre kayıtla aynı kurallar (8–72 karakter, bcrypt bayt sınırı).
  - Başarıda kullanıcının tüm refresh ve bağlantı token'ları iptal ediliyor (diğer cihazlar çıkış yapıyor); bu oturum için yeni token'lar dönüyor.
  - Hız sınırı: `/auth` ile aynı sıkı ve fail-closed kova.
  - Testler önce kırmızı: IT `changingThePasswordChecksTheCurrentOneAndRevokesOtherSessions`, birim `passwordChangeUsesTheAuthBucketAndFailsClosed`. Hız sınırı testinde kırmızı, filtre değişikliği geçici geri alınarak gözlendi.
- **Abonelik:** ödeme yok (mevcut davranış; geliştirme modunda test düğmesi aynı), metinler sade.
- **Hesap silme:** mevcut akış yok, eklenmedi. **PROD-PREP'te KVKK ile ele alınacak.**

## 7. Testler (önce kırmızı)

**Web — yeni testler:**

| Test | Sayı | Kapsam |
|---|---:|---|
| `account/authPages.test.tsx` | 7 | giriş/kayıt autocomplete, göster/gizle, gönderim, sunucu hataları (401, 429), doğrulama 3 durum, gizlilik |
| `account/profilePage.test.tsx` | 5 | hesap/kredi, şifre değiştir + token, 422 hatası, çıkış, abonelik |
| `career/newCareerPage.test.tsx` | 3 | kulüp zorunlu, bütçe boşsa yok, sezon/oyun tarihi → Masa |
| `import/importPage.test.tsx` | 5 | formatBytes, importChecks, adımlar + script tek kaynak, sürükle-bırak + ilerleme + sonuç tablosu, PREMIUM değil |
| `home/homePage.test.tsx` | 6 | marka, kariyer devam kartı, kariyer yok, anonim, UT blokları, bayrak kapalı |

**Web — güncellenen:** `growthPage.test.tsx` (ortak ölçek).

**Toplam:**
- Web **965 test**, lint 0 hata (34 uyarı, değişmedi), build yeşil.
- Backend **575 test, 0 hata, 5 atlanan**, normal ve ters sırada.

## 8. Kapılar (`scripts/v307a-shots.mjs`)

- **A) Envanter:** 32 rota 1280 koyu (girişli; `/ut/*` UT modunda).
- **B) Yeni sayfalar:** 17 durum × 3 genişlik × 2 tema = **102 çekim, 0 sorun.**
  - Ölçümler: taşma 0, axe serious/critical 0, beklenmeyen konsol/ağ hatası 0, sayfa minFont 11,5px, bant sızıntısı 0.
  - Durumlar:

    | Grup | Durumlar |
    |---|---|
    | Hesap | giriş, giriş hatası (gerçek 401), kayıt, doğrulama eksik, doğrulama hatası (gerçek 400), gizlilik |
    | Ana sayfa | anonim, kariyer, UT, UT kaydırılmış |
    | İçe aktarma | boş, sonuç (fikstür), hata (fikstür 422) |
    | Yeni kariyer | boş, kulüp seçili |
    | Profil | profil, şifre hatası (gerçek 422) |

  - Hata durumlarındaki 4xx'ler beklenen olarak ayrı raporlandı.
  - **Fikstür (yalnız test tarayıcısı):** içe aktarma sonuç/hata için `/me` PREMIUM'a çevrildi ve `/careers/{id}/import` yanıtı verildi. Kapı hesabı FREE ve ödeme kapalı olduğu için gerçek yükleme yapılamıyor.
  - **Kapıda çekilmeyenler** (birim testlerde var):
    - "kariyer yok" ana sayfa: kapı hesabının kariyerini silmek gerekirdi
    - UT kadrom özeti: kulüp kartları tarayıcı IndexedDB'sinde
- **Gelişim regresyonu:** 36 çekim, 0 sorun.
- **Kapıda bulunup düzeltilen:** doğrulama tablosunda ✓/✗ hem simge hem karakter olarak çift görünüyordu; tek karaktere indirildi.
