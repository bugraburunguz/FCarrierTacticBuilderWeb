# V3-06b — Kariyer oyuncu sayfası (v3 Detay) + çözücü varsayılanı "Önce kulüp"

Durum: yapıldı, ekran onayı bekliyor. Ekranlar `screens/V3-06b/` (kariyer oyuncu sayfası 114, SBC çözüm 102 + q17 87 kombinasyon, UT oyuncu regresyonu 32 çekim).

## 0. Çözücü varsayılanı "Önce kulüp"

- **Amaç:** harcanacak coin'i en aza indirmek. Kulüpte şartı karşılayan kart varsa satın alma olmaz.
- **Maliyet katmanları** (`candidates.ts`; `plan.ts` `PENALTY_SCALE` 1e13):
  - kulüp kartı (değer vekili × (1 − transfer vergisi), takas edilemez ×0,5 aynen)
  - satın alma (1e9 tabanı + değer vekili)
  - korunan kart (1e11 tabanı)
  - şart cezası
- **Korunan kartlar:** özel kartlar ("Özel kartları koru" açıkken) ve reyting ≥ 85. Bu kartlar yalnız şart gerektiriyorsa kullanılır.
- **Özelleştir panelinde:**
  - "Amaç": **Önce kulüp** (varsayılan) / **Toplam değeri en aza indir** (önceki davranış; korunan kart ×çarpanla).
  - "Koruma eşiği (reyting)": varsayılan 85.
- **Kırmızı testler önce** (`plan.test.ts`, "çözücü varsayılanı Önce kulüp", 5 test):
  - "Tam Altın 11"de kulüpte 76 ve 78 varken pazardan 75 alınmaz.
  - 86'lık ve özel kart kullanılmaz.
  - Kulüp yetmiyorsa yalnız eksik kadar satın alınır.
  - Eşik değişince 86'lık kullanılabilir.
  - Mod "Toplam değer" iken eski davranış sürer.

**Gerçek setlerde alınacak kart sayısı** (kapı `sbc-solve-shots.mjs --sets 4,5,6,36,47,49`, aynı kulüp ve aynı fiyatlar):

| Görev | Önce | Sonra |
|---|---:|---:|
| Future Stars Challenge 2 | 6 | 3 |
| 3x 79+ Upgrade | 6 | 0 |
| Marquee: Como 1907 v AS Roma (eski satır) | 5 | 2 |
| Gold Upgrade | 6 | 0 |
| Silver Upgrade | 0 | 0 |
| Bronze Upgrade | 8 | 4 |
| Marquee: RB Leipzig v Eintracht Frankfurt | 6 | 3 |
| Marquee: Como 1907 v AS Roma | 5 | 2 |
| Marquee: Real Madrid v Villarreal CF | 3 | 3 |
| Marquee: Liverpool v Manchester City | 7 | 5 |
| **Toplam** | **52** | **22** |

Gerçek setlerde hiçbir planda özel kart ya da ≥ 85 kart kullanılmadı ("En değerli" en çok 82). Çözücü süresi p95 94 ms, en çok 100 ms; zaman bütçesi 3 sn. Kapı 102 çekimde 0 sorun, q17 çözüm sahası 87 kombinasyonda 0 sorun.

## 1–2. Kariyer oyuncu sayfası

- **Rota:** kariyer modunda, v3 + oturum + seçili kariyer varken `/players/:id` → `CareerPlayerPage` (`playerDetailView`). v2'de, oturumsuzken, kariyer seçili değilken ve UT modunda `PlayerDetailPage` olduğu gibi kalır.
- **Ortaklaştırma** (`src/features/player/`, kopya yok): Statlar ve Roller sekmeleri UT dosyasından taşındı, UT sayfası bunları içe alıyor. UT oyuncu sayfası testleri (39) değiştirilmeden yeşil.

  | Dosya | İçerik |
  |---|---|
  | `PlayerDetailLayout.tsx` | geri bağlantısı, başlık, yapışkan kart bölümü, bilgi ızgarası, hata ve yükleniyor durumları |
  | `playerPage.ts` | `useTabParam` (`?sekme=`), kart ölçüleri, ayak ve POT metni |
  | `StatsTab.tsx` | Statlar sekmesi |
  | `RolesTab.tsx` | Roller sekmesi |

  `BucketChip` kariyer listesinden `careerPlayers/BucketChip.tsx`'e çıkarıldı (liste + oyuncu sayfası).
- **Yerleşim:**
  - Solda yapışkan kart; altında OVR, POT, Yaş, Ayak, Zayıf ayak, Hareket, mevkiler ve Karşılaştır düğmesi.
  - Mobilde kart kompakt (180px). Mevkiler ve Karşılaştır üst satırda; 375×812'de sekme çubuğu ilk ekranda.
  - Kadrodaysa başlıkta "Kadronda" rozeti.
- **Sekmeler** adres çubuğunda: `?sekme=roller|gelisim|sozlesme`; Statlar varsayılan, adreste yazılmaz.
  - **Statlar:** UT bileşeninin aynısı; kalecide yalnız kaleci grubu.
  - **Roller:**
    - `GET /players/{id}/roles?career=&engine=v3`. Eski fit/roleFit ve `/development` çağrılmıyor (ENG-M8; testte doğrulanıyor).
    - FitBadge + fitLabels. "Biçilmiş kaftan" yalnız mevki başına en iyi rolde ve sunucu tailored derse. "Neden?" altında anlatım.
    - Sekme başında tek HelpPopover: "Rozet: kariyerinin ligi EFL League Two düzeyindeki (OVR 62) oyunculara göre…". Lig gücü bilinmiyorsa bunu açıkça söyler ve oyuncunun kendi OVR düzeyine düşer.
  - **Gelişim:**
    - Yalnız mevcut veriden: Şimdi / Potansiyel (aralık modunda aralık) / Gelişim payı / Yaş ve "OVR → POT: 72 → 84".
    - v3'te projeksiyon ya da yaş eğrisi ucu yok, bu yüzden gösterilmiyor.
    - Kadrodaki oyuncu için "Gelişim takibi" bağlantısı (`/career/growth?player=`); V3-06e bu sayfayı yenileyecek.
  - **Sözleşme ve değer:**
    - Piyasa değeri (modellenmişse "≈" + açıklama).
    - Maaş / hafta.
    - Sözleşme bitişi + "N ay kaldı · oyun tarihi …" (oyun tarihine göre; 30 günlük ay, öneri hattıyla aynı).
    - Kiralık (yalnız kiralıksa).
    - Serbest bırakma bedeli.
    - Ulaşılabilirlik kovası (öneri hattının sınıflandırıcısı).
    - Alım sonrası bütçe (yalnız bütçe ve değer biliniyorsa ve oyuncu kadroda değilse).
    - Verisi olmayan alan yok; 0'a çevrilmiyor (ENG-02).

### Backend (API CONTRACT CHANGE + BEHAVIOR CHANGE)

- **Yeni:** `GET /api/v1/players/{id}/contract?career=` → `CareerPlayerContractResponse` (NON_NULL):
  - `inSquad`, `valueEur`, `valuationEstimated`, `wageEur`, `releaseClauseEur`
  - `contractUntil`, `gameDate`, `monthsLeft`, `onLoan`
  - `feasibility`, `budgetEur`, `budgetAfterPurchaseEur`

  Sahiplik `squadPlayerIds` ile doğrulanıyor; başkasının kariyeri 404.
- **Değişen:** `GET /players/{id}/roles?career=` artık v3'te levelFit'i **kullanıcının ligine** göre ölçüyor:
  - Lig gücü = ligdeki kulüp güçlerinin medyanı (`ClubStrength`, öneri hattıyla aynı kaynak).
  - Bant OVR'ı = bu değerin yuvarlanmışı.
  - Yanıta `levelReference {kind: LEAGUE|OVR, league, ovr}` eklendi.
  - Kariyersiz çağrı (UT, katalog) değişmedi; alan yok.
  - **Önceki davranış:** kariyerde de oyuncunun kendi OVR bandıydı. v2 kariyer sayfası da aynı ucu kullandığı için orada da rozet artık lige göre.
- **Yardımcılar:**
  - `FeasibilityInputs.monthsLeft` (tek formül; `derive` de bunu kullanıyor)
  - `FeasibilityInputs.levelReference`
  - `CareerPlayerRepository.contract`
  - `PlayerService.summary`
  - `RoleFitV3Service.calculate(..., levelOvr)`

## 3. Testler

- **Backend** `CareerPlayerPageIntegrationTest` (6; önce kırmızı: 5 kırmızı, başkasının kariyeri uç olmadığı için tesadüfen yeşildi):
  - dışarıdaki oyuncu (oyun tarihine göre ay, değer ≈, kova, alım sonrası bütçe)
  - eksik veri alan yok
  - kadrodaki oyuncu kova ve alım satırı yok
  - bütçe bilinmiyor
  - başkasının kariyeri 404
  - kariyer rollerinde lig referansı (kariyersiz çağrıda yok)

  Tam `mvn test`: **568 test, 0 hata, 4 atlanan — normal ve ters sırada**.
- **Web** (önce kırmızı):
  - `features/player/careerPlayerPage.test.tsx` (9): başlık/kart bilgileri, dört sekme + adres, Roller v3 + kariyer + tek yardımda lig, lig bilinmiyor, sözleşme oyun tarihine göre, bütçe yok / eksik veri, Kadronda rozeti, Gelişim (eski uç yok), kaleci.
  - `playersView.test.ts`: `/players/:id` görünüm seçimi.

  UT oyuncu sayfası testleri değiştirilmeden yeşil. Web **856 test**, lint 0 hata (değişen dosyalarda yeni uyarı yok), build yeşil.

## 4. Kapılar

**`scripts/career-player-shots.mjs`** (yeni):

- **Oyuncular:**

  | Durum | Oyuncu |
  |---|---|
  | kadroda | 12225 |
  | kadroda değil + sözleşme/değer verisi eksik | 1 |
  | kaleci | 15791 |
  | tam veri (fikstür) | — |

  Tam veri durumu bir fikstür: yerel Crewe/Port Vale kayıtlarında sözleşme ve oyun tarihi yok. Yalnız bu test tarayıcısında `/contract` yanıtı değiştiriliyor; LE içe aktarımı katalog tablolarına yazdığı için kullanılmadı.
- **Kapsam:** 4 sekme × 375/768/1280 × koyu/açık + kaydırılmış Statlar → **114 çekim, 0 sorun**.
  - Taşma 0, axe serious/critical 0, konsol/ağ hatası 0.
  - Sayfa minFont 11px, kart içi minFont ≥ 12,4px.
  - Bant sızıntısı 0 (başlık alfa 1).
  - 375'te sekme üst kenarı ≤ 640.
  - Kadronda rozeti yalnız kadrodakilerde.
  - Roller yardımında lig (EFL League Two, OVR 62).
- **Kapıda yakalanan ve düzeltilen sorunlar:**
  - 375'te mevki satırı sekme çubuğunu ilk ekranın altına itiyordu; mevkiler mobilde başlık satırına taşındı.
  - Kadrodaki oyuncu notu `<dl>` içindeydi (axe definition-list, serious); `<dl>` dışına alındı.

**UT oyuncu sayfası regresyonu** (`ut-player-shots.mjs`): **32 çekim, 0 sorun**.

- Commit'li V3-05b çekimlerinden 25'i bayt bayt aynı.
- Fiyat sekmesinin 6 çekimi değişti: kart V3-05d-b'deki `ut_item` senkronundan beri bilgi tabanında, artık platform anahtarı ve veri görünüyor. Betiğin beklentisi buna göre genişletildi; V3-06b'den kaynaklanmıyor.
- `roller-light-1280` görsel olarak aynı (görüntüleme gürültüsü).
- Değişen çekimler `screens/V3-06b/ut-regresyon/` altında; V3-05b klasörü olduğu gibi kaldı.

## Açık / not

- Mobilde en iyi rol satırında "Biçilmiş kaftan" çipi rol adını kısaltıyor ("B…"). Ortak `RoleRow`, UT'de de aynı; ayrı iş olarak bırakıldı.
- Yerel kayıtlarda sözleşme/oyun tarihi verisi yok. Dolu yerleşim yalnız fikstürle doğrulandı; gerçek LE kaydı içe aktarılınca tekrar çekilmeli.
