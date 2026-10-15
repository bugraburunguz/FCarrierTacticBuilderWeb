# V3-05d-b — Formasyon kaybı, görev tipleri, otomatik base senkron

## 1. Formasyon kaybı (hata) — bulundu ve düzeltildi

Dosyada 26 görevin 9'u formasyonlu (f41212 ×3, f442 ×2, f532 ×2, f352, f451); KB'de yalnız 1 formasyonluydu.

**Nerede kayboluyordu:** `UtCaptureService` görev formasyon etiketini yalnız yakalamanın kendi formasyon yapılandırmasından (`squaddata` → `formationData`) eşliyordu; dosyada bu yanıt yoksa `formationLabel` null → katkı yükü `formationLabel` null → `upsertSbcChallenge` formation = NULL. Ham kod yükte vardı ama saklanmıyordu.

**İkinci hata (aynı yerde):** eşleme olmayınca kullanılan tahmin (`f451` → "4-5-1") yanlıştı: bizim tek kaynağımızda (`formations.json` `eaFormationId`) EA `f451` = **4-5-1 (CAM)**, düz 4-5-1 = `f451a`. KB'deki tek formasyonlu görev de bu yüzden yanlış dizilişteydi.

**Düzeltme:** EA kodu → bizim formasyon eşlemesi **tek yerde**: `FormationRegistry.idsByEaCode()` (formations.json). Yakalama, SBC görevi ve aktif kadro buradan okur; tahmin fonksiyonu kaldırıldı (aktif kadro etiketi de: `f4231a` → "4-2-3-1 (2)", önce "4-2-3-1 (a)"). Web `findChallengeFormation` EA kodunu yalnız `eaFormationId` ile çözer. Eşlemesi olmayan kod sessizce null olmaz: `sbc_challenge.ea_formation` ham kodu saklar (V36), arayüz **"Formasyon tanınmadı (f…)"**. Kırmızı testler beş EA koduyla (`EaFormationCodeIntegrationTest`, `UtCaptureServiceTest`, `ContributionPipelineIntegrationTest`).

## 2. Görev tipleri

| EA `challenge.type` | Dosyada | KB `kind` | Arayüz |
|---|---|---|---|
| ONE_CLICK_CHALLENGE | 17 | **SINGLE_ITEM** | "Tek kart teslimi": saha yok, şart çipleri; şartlar kart verisinden ölçülebiliyorsa uygun kulüp kartları (önce takas edilemez, düşük reyting), değilse "Elle kontrol et" + şartların listesi |
| OPEN_CHALLENGE | 8 | SQUAD | formasyonlu çözüm sahası |
| BRICK_CHALLENGE | 1 | SQUAD | formasyonlu kadro görevi gibi; **anlamı doğrulanmadı** (yakalamadaki tek örnek: formation f442 + PLAYER_QUALITY şartı) |

- EA tipi `sbc_challenge.ea_type`'ta saklanıyor; `kind` CHECK kısıtı SQUAD, ITEM_SCORE, SINGLE_ITEM (V36; veri silinmez).
- Önceki eşleme "ONE_CLICK"/"BRICK" adlarına bakıyordu, EA'nın gönderdiği "*_CHALLENGE" adlarıyla hiç eşleşmiyordu (BEHAVIOR CHANGE: ONE_CLICK artık SINGLE_ITEM).
- ONE_CLICK görevlerinin 17'sinin de şartları yalnız PLAYER_ATTRIBUTE (key 41, value 1), ACADEMY_PLAYER_SLOTTING (key 40; değerler 45 ×15, 74, 83) ve SCOPE; hepsinde formasyon yok ve `scoreRequirement` var (500 – 1.300.000). Bu değer arayüzde "EA görev değeri (anlamı doğrulanmadı)" olarak gösteriliyor.
- **Hipotez (ACADEMY_PLAYER_SLOTTING değeri = Evolution kimliği): çürütüldü.** KB'deki 39 evolution kimliği 2670–2757; slot değerleri 45, 74, 83 — hiçbiri eşleşmiyor. Dosyadaki `/academy/` yanıtlarında 45/74/83 yalnız stat/ödül değerlerinde (`maxValue`, `totalBonus`, `attributeArray`) geçiyor; hiçbir kimlik alanında yok. Çip "Evolution oyuncusu şartı (doğrulanmadı)" olarak kaldı.

**Katkı yolunda ikinci kayıp (tekrar içe aktarmada bulundu):** formasyon etiketi hash'ten hariç (yerelleştirilmiş metin sayılıyordu) → aynı içerik "değişmedi" sayılıp sütun hiç güncellenmiyordu; `kind` ise hash'e dahildi → bizim ONE_CLICK düzeltmemiz hash'i değiştirip 17 görevi "çatışma" diye onay kuyruğuna atıyordu. Düzeltme: bizim türettiğimiz alanlar (`kind`, formasyon etiketi) içerik kimliğine girmez; hash eşitse türetilmiş sütunlar yine yazılır; eski tanımlı hash'li satır aynı içerik gelince çatışma değil, yeni tanıma geçer ve o anahtar için kendiliğinden açılmış kuyruk kapanır (test). Sonuç: tekrar içe aktarmada 26 görev güncellendi, 0 kuyruk.

## 3. ut_item base senkronu otomatik

- `UtItemBaseSync` (yalnız yerel katalogdan kopya, dış istek yok; upsert → idempotent): katalog ingestion başarıyla bitince (`CatalogIngestedEvent`) ve açılışta o oyun sürümünde ut_item boşsa. Testler: ingestion → olay + senkron, iki kez senkron aynı sayı, açılış kancası yalnız boşken.
- Canlı: açılışta 22.314 temel kart yazıldı.
- **Bulunan ek hata:** saatlik fiyat toplama yalnız son 3 saatin gözlemlerine bakıyordu; katkı ise 48 saate kadar eski yakalama zamanını kabul ediyor. Sonradan içe aktarılan dosyanın gözlemleri (yakalama 01:35 UTC) hiç toplanmıyordu. Pencere 48 saat (BEHAVIOR CHANGE, test).

## 4. Katkıcı yetkisi

- Bootstrap admin hesabı: **kullanıcı 1** — dry-run, yedek `backups/pre-v305db-contributor-grant-20261015-185726.dump`, tek transaction.
- Test hesabı 101'in oturumu sona erdi ve şifresi saklanmamıştı; onayınla yeni yerel test hesabı **107** (aynı protokol, yedek `backups/pre-v305db-kb-import2-20261015-210239.dump`). 101 ve 107 duruyor (katkı kayıtları bağlı).

## Tekrar içe aktarma sonuçları (test hesabı 107, aynı dosya)

| | Sayı |
|---|---|
| ut_item | 22.314 (açılış senkronu) |
| price_obs | 1.544 (dosya iki kez içe aktarıldı: ilk koşu görevleri kuyruğa attığı için düzeltme sonrası tekrarlandı; her koşu 772 gözlem, 47 atlanan — özel sürüm kartı ut_item'da yok) |
| price_agg | 610 kova / 610 kart (zamanlanmış saatlik iş, 22:07); hepsi low_confidence — tek katkıcı (tasarım gereği) |
| Formasyonlu görev | **9 / 9** (f41212 → 4-1-2-1-2 (geniş) ×3, f442 → 4-4-2 ×2, f532 → 5-3-2 ×2, f352 → 3-5-2, f451 → 4-5-1 (CAM)); ham kod `ea_formation`'da |
| SINGLE_ITEM | **17** (ONE_CLICK_CHALLENGE) · SQUAD 9 (OPEN 8 + BRICK 1) + 1 eski satır |
| Açık onay kuyruğu | 0 |
| Gerçek set planlarında fiyat | 10 kare görev planında alınacak 26 kartın **20'sinin fiyatı biliniyor**, 6'sı "fiyat yok" (önceki tur 0/2) |

## Kapılar

`scripts/sbc-solve-shots.mjs --sets 4,5,6,36,47,49` → `docs/review/v2/screens/V3-05d/` (sentetik) ve `V3-05d/gercek/`:
- **102 çekim, 0 sorun** (taşma 0, axe serious/critical 0, konsol/ağ 0, sayfa minFont ≥ 11, saha kartı minFont ≥ 11 / OVR ≥ 14, bant sızıntısı 0). Sentetik 9 durum × 375/768/1280 × koyu/açık (yeni: tek kart elle, tek kart uygun, formasyon tanınmadı); gerçek 12 görev × 375/1280 × koyu/açık: formasyonlu 9 görevin hepsi + 1 eski satır **11 kartlı sahayla**, 2 tek kart teslimi (Carlos Espí, TOTW Upgrade → "Elle kontrol et"). Süresi geçmiş Marquee Matchups seti liste ucunda yok; çekimlere set kimliğiyle eklendi.
- q17/Q18 çözüm sahası: 29 diziliş × 375/768/1280×800 = **87 kombinasyon, 0 sorun**.
- Çözücü süresi: 157 çözüm, p50 20 ms, p95 89 ms, en çok 97 ms.

## Testler

Backend tam `mvn test` **561 test, 0 hata, 4 atlanan — normal ve ters sırada**. Web **831 test**, lint 0 hata, build yeşil. Önce kırmızı: formasyon (beş EA kodu), görev tipi/kind, türetilmiş alan yakınsaması, otomatik senkron (ingestion olayı, idempotent, açılış), 48 sa toplama penceresi, web eşleme/tek kart/formasyon tanınmadı.
