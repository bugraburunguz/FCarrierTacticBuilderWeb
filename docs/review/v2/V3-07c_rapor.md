# V3-07c — Kalan eski sayfalar v3 + rozet tutarlılığı

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-07c/` (268 çekim, `gates-report.json`; komut `node scripts/v307c-shots.mjs`), q17 `screens/V3-07c/q17.json`.

## 0a. Rozet tutarlılığı — kök neden ve düzeltme

**Belirti:** 1280 dolu kadro çekiminde (/squad) rozet rengi ile yüzde çelişiyordu: %52 ve %42 "Uygun", %62 "Seviyesinde".

**fitLabel nereden geliyor:** sunucuda tek yerde, `RoleFitV3Service.label(basis, FitEngineProperties.V3)`. `basis` = levelFit (oyuncunun kendi OVR bandındaki seviye yüzdeliği); levelFit yoksa currentFit. Eşikler `FitEngineProperties.V3` (≥65 Uygun, 40–65 Seviyesinde, 20–40 Sınırda, <20 Eksik) — istenen bantlarla aynı; `LevelFitLabelTest` sınıyor. **Lig referansı yok** (V3-06c geri alması sonrası kalan bir şey değil); ölçüt farklı da değil.

**Kök neden (web):** `/squad` sahası (V3-07b'de v2 `TacticLineup`'tan `useCareerLineup`'a taşınan kod) yüzdeyi `roleFit.score`'dan, yani **ham rol puanından (currentFit)** gösteriyordu; renk ise levelFit'ten türeyen rozetten. İki farklı sayı: %52 ham puan, levelFit 70 → "Uygun". Kurucu, Masa, Transfer ihtiyaçları, oyuncu sayfası ve aday listeleri zaten ortak `fitDisplay`'i (yüzde = levelFit, etiket = sunucu fitLabel) kullanıyordu.

**Aynı karışımın bulunduğu diğer yerler (düzeltildi):**
- Yedek kulübesi ve derinlik listeleri (`/fit/lineup` `DepthEntry`): yalnız `roleFitScore` (ham) + levelFit'ten rozet geliyordu → **backend `DepthEntry`'ye `levelFit` ve `fitLabel` eklendi** (API CONTRACT CHANGE, ek alan); web yedek yüzdesi `fitDisplay`'den.
- `/wonderkids` rol sütunu: `roleScore` (ham) + `roleBadge` (levelFit) → **backend wonderkid yanıtına `roleLevelFit`, `roleFitLabel`, `projectedFitLabel` eklendi** (`DevelopmentService` aynı `label()` ile); web `fitDisplay`.
- Kariyer aday listesi (`PickList`): "Seviyesinde" yüzdesi "Sınırda" gibi sarı boyanıyordu → renk rozetle aynı durumdan (Seviyesinde renksiz).
- v2 `TacticLineup` ve `FitResults` aynı hook/kaynağa bağlandı.

**Testler (önce kırmızı):** `KadroPage.test` (aynı slotta %52/levelFit 70 → "Uygun, yüzde 70"; %62/levelFit 50 → "Seviyesinde, yüzde 50"; yedek levelFit'ten), `fitConsistency.test` (yüzde arttıkça etiket kötüleşmez; kaynakta rozet yanında ham rol puanı yüzdesi kalmadı — düzeltme öncesi kodda kırmızıydı), `PickList.test` (Seviyesinde renksiz), backend `DepthEntryLevelFitTest`, `CareerPlayerListIntegrationTest#wonderkidRoleLabelAndPercentShareOneBasis` (seviye normlarıyla).

**Ayrı tutulan:** `/compare` "Role göre uyum" sıralaması sunucuda ham rol puanına göre; v3 sayfada bu sayı "Rol puanı N" olarak, rozet ise kendi yüzdesiyle (levelFit) ayrı yazılır — iki sayı karışmaz. UT değerlendirmesi (`/ut/squad/evaluate`) v2 motorunu kullanıyor (levelFit yok); bu görevin kapsamı dışında, değişmedi.

**Kabul ölçütleri yeniden doğrulandı** (`LevelReferenceAcceptanceReportTest`, `-Dacceptance.report=true`): altın set kesin çiftler **50/50**, Role++ vs rolsüz AUC **0,874** (≥ 0,80), oyuncu içi AUC **0,620** (≥ 0,60). Eşik altına düşen yok (düzeltme yalnız gösterim ve yanıt alanı).

## 0b–0d

- **0b:** `/squad` v3 ilk sekmesi "Saha" (`?sekme=` varsayılanı; üst alt menüde "Kadro" var). Test önce kırmızı.
- **0c:** q17 referansları `screens/q17-referans/` altında: `kariyer.json` = V3-07b kariyer çıktısı (her boyutta yeniden giriş, 174/174 geçerli dolu ölçüm), `ut.json` = V3-05b-c'nin UT satırları. Karşılaştırma tek komut: `node scripts/q17-compare.mjs <q17 çıktısı.json> [--out …]`. V3-04 kariyer referansı artık kullanılmaz.
- **0d:** Progress V3-08 listesine not: masaüstü dolu kariyer sahasında bölüm sekmeleri kartı 62 → 56 px'e (Q18 tabanı) düşürüyor.

## 1–2. Sayfalar

Her sayfa ayrı v3 dosyası; mantık hook'ta, v2 aynı hook'u kullanıyor. Eski parça kapısı (`legacyGates.test.ts`) 8 rotayı da kapsıyor (13/13 yeşil).

| Rota | v3 dosyası | Hook | Şablon |
|---|---|---|---|
| `/ut/club` | `features/ut/club/UtClubV3Page.tsx` | `useUtClub`, `clubFilters.ts` | Katalog |
| `/ut/evo` | `features/ut/evo/UtEvolutionsV3Page.tsx` | `useUtEvolutions`, `evoEligibility.ts` | Pano |
| `/ut/objectives` | `features/ut/objectives/UtObjectivesV3Page.tsx` | `useUtObjectives` | Pano |
| `/ut/meta` | `features/ut/meta/UtMetaV3Page.tsx` | `useUtMeta` | Pano + Katalog tablosu |
| `/ut/import` | `features/ut/import/UtImportV3Page.tsx` | `useUtImport` | Akış |
| `/compare` | `features/compare/CompareV3Page.tsx` | `useCompare` | Detay (yan yana) |
| `/wonderkids` | `features/wonderkids/WonderkidsV3Page.tsx` | `useWonderkids` | Katalog |
| `/teams` | `features/teams/TeamsV3Page.tsx` | `useCareerTeams` | Katalog + önizleme paneli |

### Sayfa başına gösterilen / gösterilmeyen alanlar

**/ut/club**
- Gösterilen: Katalog ızgarası (cardGridLayout + VirtualChunk; yerel liste için `LocalCatalogGrid`), tablo; yapışkan opak süzgeç: ad, mevki (alternatif mevki dahil), reyting aralığı, nadirlik, lig, ülke, kulüp, takas edilemez (hepsi / yalnız / hariç), kopya, yığın (kulüp / SBC storage); sıralama (reyting, ad, değer, önce SBC yemi); hepsi adreste. Ad ve kart V3-05d-c'deki gibi (katalog adı: `PlayerCard`/`CardName`, assetId). Rozetler: SBC yemi (sebep başlıkta), storage, takas edilemez, aktif kadro.
- **SBC yemi kuralı** (`candidates.ts`, tek yer): kopya kart her zaman; özel olmayan ve değer vekili (bilinen fiyat ya da reyting eğrisi; çözücüdekiyle aynı `valueProxy`) çözücünün koruma eşiğindeki kartın (Özelleştir varsayılanı 85) değerinin altında kalan kart "düşük değer". Yeni eşik uydurulmadı; çözücünün kendi koruma eşiği.
- **Toplu seçim → "Şu SBC'de kullan":** aktif SBC seti ve görevi seçtirir; çözüm sayfası `?kilit=` ile seçili kartları Özelleştir'de kilitli açar (Özelleştir açık başlar). Uygulanamayan kart sebebiyle listelenir: "Kulübünde bulunamadı", "Aktif kadronda: çözücü aktif kadroyu kullanmaz", "Çözüme girmedi: mevki ya da şartlar uymuyor". Aktif kadro uyarısı seçimde de görünür.
- Gösterilmeyen: hata durumu (veri yerel IndexedDB'den; sunucu isteği yok).

**/ut/evo** (gerçek veri: KB'de 39 evolution)
- Gösterilen: ad, seviye sayısı, "Doğrulanmamış" (PENDING), bitiş (veride varsa); kullanıcının yakalanan akademi slotları (ad, seviye, durum).
- **Gösterilmeyen (veri yok):** önce → sonra kart çifti ve sonra-kartı statları, gereksinim çipleri, maliyet, bitiş, "Kulübünde uygun N oyuncu", zincir önizlemesi, pathway ağacı. KB'deki 39 kaydın tümünde yalnız ad + seviye sayısı + durum var; maliyet/gereksinim `null`, bitiş tarihi yok, seviye içeriği yok, kayıtlar arası ilişki alanı yok. Kartta "Uygunluk: gereksinim verisi yok" yazılır; tahmin uydurulmaz (`evoEligibility` sayımı yalnız doğrulanmış biçimle yapar).
- **Bulgu:** kullanıcının yakalama dosyasındaki `/academy/` yanıtları bu verinin çoğunu taşıyor (uygunluk şartları `elgReqs`, seviye ödülleri, maliyet `currencies`, bitiş `endTime`, seviye başına stat bonusu `academyBonusesPerLevel`). KB'ye aktarım (`ContributionService`) yalnız ad, seviye sayısı ve şart **sayısını** saklıyor. Ayrıca şart biçimi belgesiz (sayısal anahtarlar: PLAYER_ATTRIBUTE/41, SCOPE/13, ACADEMY_PLAYER_SLOTTING/40) ve doğrulanmadı. Öneri (ayrı görev): aktarımı genişletmek + biçimi bilinen evolution'larla doğrulamak; sonra sayım ve sonra-kartı tek yerde açılır.

**/ut/objectives**
- Gösterilen: güncel gruplar (KB; görev listesi, bitiş veride varsa, "Planlayıcıya aktar"), senin grupların (yakalamadan aktarılan: ilerleme çubuğu alt görev `done/total`, ana ödül, bitiş — veride varsa), tekil objective'ler, önerilen plan, elle ekleme (katlanır).
- Gösterilmeyen: KB grubunun ödülü ve kişisel ilerlemesi (KB tanımında yok; kişisel ilerleme yalnız yakalamadan). Yerel KB'de bugün grup yok (0); dolu çekim KB fikstürü + yerel planlayıcı ile.

**/ut/meta**
- Gösterilen: meta formasyon kartları (seed: pay, not, Build-Up, hat, kilit roller), mevki çipleriyle tier tablosu (OVR, Meta*, tier, en iyi chem style); mevki adreste. Meta* açıklaması HelpPopover'da.
- Gösterilmeyen: fiyat ve özel/promo kartlar (seed verisi yalnız temel kart).

**/ut/import**
- Gösterilen: v3 kabuk; ortak akış aynı (uzantı senkronu, yakalama dosyası hedef → özet → onay; HAR yalnız `VITE_HAR_IMPORT=on`); sonuç v3 panellerde (özet çipleri, kulüp tablosu + "SBC havuzuna aktar", aktif kadro, gördüğün fiyatlar, objective aktarımı, kaynaklar, işlenmeyen yollar). Bayraklar aynı (`VITE_EXTENSION_CAPTURE=off` → kısa not). `ExtensionSync` ortak bileşen v3 `Panel`'e çevrildi.

**/compare**
- Gösterilen: liste + arama, profil radarı (seri renkleri token: `--series-1..6`, aynı değerler), masaüstünde yan yana tablo (en iyi değer vurgulu, ekran okuyucuya "en iyi"), mobilde oyuncu başına dikey bölüm, role göre uyum (sıra = rol puanı; rozet seviyesinden).
- `AttributeRadar` hex → token; `RolePicker` Pill → Chip.

**/wonderkids**
- Gösterilen: hazır seçimler, mevki çipleri, sıralama, ek süzgeçler (futbol, rol, lig, yaş, en az POT, bütçe) — hepsi adreste. Kariyer seçiliyse kariyer verisiyle; her satırda **Lig seviyesi** (kariyerin lig gücüne göre, `LeagueLevelChip`) ve **ulaşılabilirlik kovası** (`BucketChip`; backend wonderkid yanıtına oyuncu sayfasıyla aynı sınıflandırıcıdan `feasibility` eklendi — kadrodaki oyuncuda yok). Rol seçiliyse rol uyumu (levelFit) + potansiyele ulaşınca beklenen etiket.
- Gösterilmeyen: kariyersiz kullanımda Lig seviyesi ve kova (anlamları kariyere bağlı).

**/teams**
- Gösterilen: arama (sunucu), lig süzgeci ve sıralama (genel/hücum/orta saha/savunma/ad; istemcide) — adreste; kulüp gücü tablosu; kariyerin kulübü vurgulu ("Senin kulübün"); seçili takımın profili sağ panelde (mobilde sheet): güç kutuları, güçlü/zayıf yönler, kültür, kilit oyuncular.
- **Gösterilmeyen: ülke süzgeci** — takım verisi (içe aktarılan kariyer) ülke alanı taşımıyor. Kulüp vurgusu **adla** eşleşir: katalog kulüp kimliği (ör. 737) ile içe aktarılan EA takım kimliği (ör. 121) farklı uzaylarda, kariyer içe aktarma takım kimliğini saklamıyor.

## 3. Testler

Web 1067 test (145 dosya) (önce kırmızı yazılanlar: 8 sayfanın durum testleri, süzgeç ↔ URL, `sbcFodder`, `lockParam` + çözüm sayfası `?kilit=`, `evoEligibility`, `fitConsistency`, token testleri). Backend 578 test, 0 hata, 5 atlanan — normal ve ters sıra (yeni: `DepthEntryLevelFitTest`, iki wonderkid entegrasyon testi). Lint 0 hata, build yeşil.

## 4. Kapılar

**q17 (0a sonrası, tam matris):** 696 kombinasyon, sorunlu 0; yeni referansla (`screens/q17-referans/`) **696/696 aynı** (UT boş/dolu, kariyer boş/dolu 174'er; dolu satırların hepsi geçerli kart ölçümü). Karşılaştırma `screens/V3-07c/q17-karsilastirma.json`. Not: 0a kart genişliğini etkilemez (yalnız rozet yüzdesi/etiketi).

**Ekran kapıları:** 268 çekim, **sorunlu 0** — yatay taşma 0, axe serious/critical 0, konsol/ağ 4xx-5xx 0, sayfa minFont ≥ 11 (en küçük 11px), yapışkan bant sızıntısı 0 (42 kaydırılmış çekim). 375/768/1280 × koyu/açık. 84 çekim fikstürlü (raporda `fixture` alanı; yalnız o tarayıcıda `page.route`); 42 hata durumu çekiminin beklenen 4xx/5xx'i ayrı (`expectedProblems`).

| Sayfa | Durumlar (her biri 6 çekim) |
|---|---|
| `/ut/meta` | dolu + kaydırılmış, boş (fikstür), hata (fikstür) |
| `/ut/club` | boş, dolu + kaydırılmış (20 katalog kartı tohumu: kopya/storage/takas edilemez/özel), tablo (önce SBC yemi), süzgeçli (`?mevki=ST&min=80`), seçim çubuğu, "Şu SBC'de kullan" diyaloğu (gerçek aktif setler), mobil süzgeç sheet'i (375/768) |
| `/ut/evo` | dolu (gerçek 39) + kaydırılmış, boş, hata |
| `/ut/objectives` | boş (gerçek KB: 0 grup), hata, dolu (KB grubu fikstürü + yerel planlayıcı) + kaydırılmış |
| `/ut/import` | anonim, başlangıç, özet (gerçek `sample-captures.json`), dolu (gerçek işleme) + kaydırılmış, hata (422 fikstürü) |
| `/teams` | boş (gerçek: içe aktarma yok), dolu ve profil paneli/sheet (fikstür), hata |
| `/wonderkids` | dolu (gerçek, kariyer bağlamı: Lig seviyesi + kova) + kaydırılmış, rol seçili, boş, hata |
| `/compare` | boş, dolu (3 oyuncu; masaüstü tablo, mobil dikey) + kaydırılmış, rol uyumu, hata |
| Regresyon (0a) | `/squad` saha, `/squad/builder`, `/career/desk`, `/career/transfer`, `/players/:id?sekme=roller` |

**Kapıda bulunup düzeltilenler:**
- `/ut/club` ızgarasında seçim kutusu kartın üstüne konmuştu; kart katmanı üstte kaldığı için **tıklanamıyordu** → seçim kartın altında kendi satırında.
- `/ut/club` açık temada "SBC yemi" çipi (tonlu zemin, cam üstünde) 4,38:1 → nötr çip + renkli nokta (BucketChip ile aynı çözüm); fiyat etiketi rozet satırıyla çakışıyordu → üst boşluk.
- `/compare` 375'te yatay taşma: `AttributeRadar`'ın ekran okuyucu tablosu `sr-only` tabloya doğrudan uygulanınca tablo yerleşimi 1px genişliği yok sayıyordu → `sr-only` kap (v2 oyuncu sayfasında da aynı bileşen); radar eksen yazısı 10 → 11; mobil dikey görünüm dar ekranda tek sütun.
- Son düzeltmelerden sonra `karsilastir-*` ve `ut-club-*` çekimleri yeniden alındı (`--only`), rapor birleştirildi.

## Envanter (önce → sonra)

| | V3-07b sonu | V3-07c sonu |
|---|---:|---:|
| Rota | 39 | 39 |
| v3 sayfası | 23 | 31 |
| Hâlâ eski (v2) | 10 | 2 (`/about`, `/admin/ut` — V3-08) |
| Yönlendirme | 6 | 6 |
| Eski parçası hiç olmayan | 23 | 31 |
