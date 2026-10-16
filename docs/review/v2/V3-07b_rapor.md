# V3-07b — Kadro grubu v3: /squad, /squad/builder, /ut/squad, /tactics/wizard

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-07b/` (168 çekim, `gates-report.json`); q17 `screens/V3-07b/q17.json` (UT), `q17-kariyer.json` (kariyer), karşılaştırma `q17-karsilastirma.json`.

Onaylanan iki davranış farkı (2026-10-16):
- v3 Kariyer sekmesinde silme ortak onaylı diyalogla (`DeleteCareerButton`: kariyer adı yazılmadan silinmez). v2'deki tarayıcı onayı v2'de kalıyor.
- Ortak diyalog (`AppDialog`) ve çipler (Chip) v2 sayfalarında da görünür; v2 ayrılmadı (v2 PROD-PREP'te varsayılandan çıkacak). v2 temasında opak kalsın diye diyalog v3 token'larının v2 karşılığını yedek alır.

## 1. Değiştirilen eski parçalar

| Eski | Yeni | Nerede |
|---|---|---|
| `components/Modal.tsx` | `design/components/AppDialog.tsx` (Radix Dialog; aynı arayüz; opak `--sheet-bg`, scrim, odak hapsi, Esc/Kapat; <640px alttan sheet 85dvh) | TacticCodeCard ("Oyuna aktar"), PickBody (`PickModal`), ApplyTab (replika "Kart seç"), RoleFocusModal, CareerSelect ("Yeni kariyer"), TransferDialog (satış/kiralık). Modal.tsx yalnız v2 SlotModal'da kaldı |
| ui.tsx `Pill` | `Chip` (primitives; ton: emerald→good, sky→info, amber→warn, rose→bad, slate→nötr) | PickBody, BehaviorsPanel, NewCareerForm, SquadCards, SquadList, SetupChips |
| Hex: ui.tsx `BadgeDot` | `--dot-green/yellow/red` (aynı değer; SVG'de `style.fill`, sunum özniteliğinde `var()` çalışmaz) | `design/tokens.css` tema bağımsız `:root` bloğu |
| Hex: `lib/squadBuilder.ts` `ovrBand` | `--ovr-80/70/65/60/low` (aynı değer) | 〃 |
| Hex: `lib/dragCard.ts` sürükleme hayaleti | `--drag-border/bg/ink/rating/sub` (aynı değer) | 〃 |
| `components/SquadDensity.tsx` (Pill, emerald, hex) | v3 `features/squad/kadro/DepthMap.tsx` (+ `RegionSummary`), saha zemini `--pitch-1/2`, durum metni + `--good/warn/bad-soft`. Hesap ortak: `lib/squadDensity.ts` | v2 SquadDensity kaldı (yalnız v2 /squad), hesabı aynı modülden alır |
| `components/squadBuilder/PositionCard.tsx` (slate/teal) | v3 yolu zaten `components/pitch/Pitch`; v3 zincirindeki tek bağ `SlotView` tipiydi → `features/squad/types.ts`. `pitchSlotsOf` → `features/squad/pitchSlots.ts` | PositionCard yalnız v2'de |
| `TacticLineup` (Card/Pill) | v3 `/squad` kahraman sahası; mantık `features/squad/kadro/useCareerLineup.ts` (v2 TacticLineup da bunu kullanır) | |
| `SlotTab` tipi (SlotModal.tsx'te) | `features/squad/types.ts` (careerSlotTabs zincirinde Modal kalmasın) | |

Sayfalar ayrıldı (v2 sayfa dosyalarında `isV3()` dalı kalmadı; Q16 testi bunu da denetler):

| Rota | v3 | v2 | Ortak mantık |
|---|---|---|---|
| `/squad/builder` | `features/squad/CareerSquadBuilderPage.tsx` | `pages/SquadBuilderPage.tsx` | `useCareerSquadBuilder` |
| `/ut/squad` | `features/squad/UtSquadBuilderPage.tsx` | `pages/UtSquadPage.tsx` | `useUtSquadBuilder` |
| `/squad` | `features/squad/kadro/KadroPage.tsx` | `pages/SquadPage.tsx` | `useCareerSquad`, `useCareerLineup` |
| `/tactics/wizard` | `features/wizard/TacticWizardPage.tsx` | `pages/WizardPage.tsx` | `lib/wizardQuestions.ts` (sorular + `tacticFromPreset`), `lib/wizard.ts` |

## 2. Sayfa şablonları

- **/squad/builder, /ut/squad:** önceki v3 dalı birebir yeni dosyada (08 §3 + §14-16, `SquadWorkspaceView`). Q16 korunuyor: tek çözme sorgusu, tek `TacticCodeCard`, ortak yan panel; kariyer/UT ayrımı hook'ta.
- **/squad (v3 Kadro):** `Workspace` — kahraman saha: seçili taktikte İlk 11 (tek `/fit/lineup`), aynalama uyarısı + "Aynalanmış taktiği kaydet", yedek kulübesi (yatay kaydırma). Karta tıklamak kadro kurucuya götürür; iki kartı yer değiştirmek dizilişi kurucuya kaydedip oraya geçer (v2 ile aynı). Sağda yapışkan "Kadro bilgisi": rating + yıldız, oyuncu/kiralık, bütçe, sezon, bölge özeti. Sekmeler `?sekme=`: Oyuncular (liste / kartlar (sat-kirala, sürükle-bırak) / etiket & yaş + yapışkan mevki yoğunluğu), Hareketler (geçmiş — yalnız son hareket geri alınır — + transfer piyasası), Kariyer (ad, bütçe, sezon; silme onaylı diyalog). Kariyer yoksa "Yeni kariyer başlat"; kadro < 11 ise sebep + transfer piyasası bağlantısı. v2'deki ikinci "Yeni kariyer" kartı yok (CareerSelect'te zaten var; V3-06d kararı).
- **/tactics/wizard (v3 Akış):** ortada tek cam panel; adım göstergesi (5 soru + Sonuç; `aria-current="step"`, tamamlanan adım onay simgesi, dar ekranda yalnız geçerli adımın adı); her adımda tek radyo grubu; Geri/İleri; adım değişince odak soru başlığına. Sonuç: en yakın 3 taktik (uyum %, nedenler, FC27 kurulum çipleri), "Bu taktiği kur" → `tacticStore` + mevcut yol `/tactics/builder` (→ `/squad/builder`). Açıklama paragrafı yerine HelpPopover.

## 3. Davranış (testler)

- Yeni testler (önce kırmızı): `legacyGates.test.ts` (5 rota + replika detayı zinciri "eski parça yok"), `AppDialog.test.tsx` (2), `KadroPage.test.tsx` (10: boş kariyer, rol etiketi biçimi, kahraman saha + tek lineup isteği + yedek, karta tıkla → kurucu, M ile taşı + Enter → `lineupStore` + kurucu, aynalama, < 11 oyuncu, kartlarda "Sat" → SELL, geçmiş geri al + satın al, ayarlar kaydet + silme diyaloğu), `TacticWizardPage.test.tsx` (4: adım göstergesi + tek karar, geri/ileri seçimi korur, sonuç + mevcut yol, hata + tekrar dene), `useCareerSquadBuilder.test.tsx` (3: ilk açılışta otomatik diziliş bir kez, "En iyi 11'i diz", slot sekmeleri / davranışları sıfırla), `UtSquadPage.test.tsx` artık v2 ve v3 sayfasında koşar (6), `tokens.test.ts` (eski hex → token aynı değer), `squadBuilder.test.ts` (OVR bandı token'ları).
- Çekimde bulunan hata (v2'den taşınmış): ilk 11 sahasında rol etiketi adı iki kez yazıyordu ("Winger · Winger (Balanced)" → sahada "Winger · Winge."). Kaçışsız `/((.*))/` parantezi değil tüm adı yakalıyordu. `roleLabelOf` → "Winger · Balanced" (kurucuyla aynı biçim); v2 TacticLineup da aynı hook'u kullandığı için orada da düzeldi. Kırmızı test önce (`KadroPage.test.tsx`, toplam 10).
- Q16 testi yeni yapıya göre: hook'lar çalışma alanını çekirdekten alır; v2 ve v3 sayfası aynı hook + aynı TacticCodeCard; hiçbir dosya çekirdeğin işini (resolveTactic, export/import, formations, roles, store set) kendisi yapmaz.
- Mevcut testler yeşil: squadCore (sürükle-bırak/swap, slot seçimi, rol değişimi, EA kodu, tek çözüm sorgusu), SquadWorkspaceView, UtSquadPage(.freeze), RoleFocusModal, replicas (ApplyTab), CareerSelect, PickBody, PickList, crossScreen, Pitch.
- Backend (kod değişmedi): 575 test, 0 hata, 5 atlanan — normal ve ters sıra. Taktik kodu 113/113 kombinasyon + 29/29 formasyon (`EaTacticCodecInGameVectorsTest` 5/5), round-trip/export, `TacticAnalysisIntegrationTest` 4/4 (`POST /tactics/analysis`), `HealthyTacticsNoWarningsTest` yeşil.
- Web: 1000 test yeşil (133 dosya); lint 0 hata (yalnız önceden var olan uyarılar); build yeşil.

## 4. q17 (tam matris) ve referans karşılaştırması

696 kombinasyon (29 formasyon × 6 boyut × boş/dolu × UT/kariyer): **sorunlu 0**; en küçük yazı 11px, OVR ≥ 14px.

| Grup | Kombinasyon | Sorun | Geçerli kart ölçümü | Referansla aynı | Fark |
|---|---:|---:|---:|---:|---:|
| UT boş | 174 | 0 | — (kart yok) | 174 | 0 |
| UT dolu | 174 | 0 | 174 | 174 | 0 |
| Kariyer boş | 174 | 0 | — | 174 | 0 |
| Kariyer dolu | 174 | 0 | 174 | 128 | 46 |

Referanslar: UT `V3-05b-c/q17.json`, kariyer `V3-05c/q17-kariyer.json`. Karşılaştırılan alanlar: saha genişliği, kart genişliği, kart içi en küçük yazı, OVR.

**Kariyer dolu 46 fark V3-07b'den değil.** Saha genişliği aynı (ör. 1280×800 4-4-2: 738px); yalnız kart küçük (1280×800 62→56, 1366×768 57→56, 1536×864 74→65, 1440×900 80→72). Saha, kaydırma istemesin diye yüksekliği pencereden alır; V3-06d'de "Taktik & Kadro sekmeleri" çubuğu masaüstünde de sayfa içine geldi (32px + 16px boşluk) ve sahanın kullanabileceği yükseklik azaldı. Doğrulama: aynı sayfada yalnız bu çubuk gizlenince kart 1280'de 62, 1440'ta 80 — referansla birebir. UT'de bu grupta alt sekme olmadığı, boş durumda da kart ölçülmediği için fark yalnız dolu kariyerde görünüyor. Kartlar Q18 tabanının (masaüstü 56px) altına inmiyor; kapı geçiyor. İstenirse sekme çubuğu daha ince yapılabilir ya da saha ayrılan yükseklikte sayılmayabilir (bu görevde değiştirilmedi).

**q17 betiği düzeltildi (oturum süresi).** İlk tam koşuda dolu kariyerin 132/174 satırı boş sahayla ölçüldü ama betik "0 sorun" dedi: erişim token'ı 15 dk yaşıyor, betik tek oturum açıyordu; koşu (aynı anda backend testleri de çalışıyordu) bu süreyi aştı. Düzeltme: dolu kariyerde her boyuttan önce yeniden giriş; dolu durumda ölçülecek kart yoksa artık sorun sayılır ("saha boş yüklendi"). Kariyer yeniden koşuldu: 174/174 geçerli ölçüm.

**V3-04 kariyer referansı (37/174 geçerli) büyük olasılıkla aynı sorun.** `V3-04/q17-q18-final.json`'da dolu kariyer sırası: ilk 38 satırdan 37'si geçerli (1 "sayfa yüklenmedi"), 39. satırdan 174'e kadar kesintisiz boş — kopma boyuta değil koşu süresine bağlı (768'in ortası). Önceki deneme `q17-q18-report.json`'da da ~96 satır geçerli, sonrası kesintisiz boş: kopma noktası koşudan koşuya değişiyor. `access-ttl: 15m` 2026-10-05'ten beri, V3-04 koşusu 2026-10-13 ve betik o zaman da tek oturum açıyordu. Desen ve koşullar bugünküyle aynı; o koşunun ağ kaydı olmadığı için kesin değil, "büyük olasılıkla". V3-05c koşusu (174/174 geçerli) dolu kısmı daha kısa sürede bitirdiği için etkilenmemiş görünüyor (doğrulanmadı).

## 5. Ekran kapıları

`node scripts/v307b-shots.mjs` (yerel test hesabı açar, sonunda yalnız kendisini siler). 375/768/1280 × koyu/açık:

**168 çekim, sorunlu 0:** yatay taşma 0, axe serious/critical 0, konsol/ağ 4xx-5xx 0, sayfa minFont ≥ 11 (en küçük 11px), yapışkan bant sızıntısı 0 (30 kaydırılmış çekim). Atlanan 0.

| Sahne | Çekim | Not |
|---|---:|---|
| `/squad` kadro sahası (dolu) + kaydırılmış | 12 | İlk 11 + yedek kulübesi + Kadro bilgisi |
| `/squad` boş | 6 | fikstür: yalnız bu tarayıcıda kadro `[]` |
| `/squad?sekme=oyuncular` liste + kaydırılmış, kartlar | 18 | mevki yoğunluğu paneli dahil |
| `/squad` satış diyaloğu (AppDialog) | 6 | mobilde alttan sheet |
| `/squad?sekme=hareketler`, `?sekme=kariyer` | 12 | |
| `/squad/builder` dolu + kaydırılmış, boş (anonim) | 18 | |
| Oyuncu seçim paneli (kariyer) | 6 | 1280: yan panel (2), 375/768: mobil sheet (4) |
| Taktik kodu diyaloğu (kariyer + UT) | 12 | "Oyuna aktar" |
| `/ut/squad` boş, dolu + kaydırılmış | 18 | dolu: 4-3-3 katalog kartları |
| Kart seçim paneli (UT) | 6 | 1280: yan panel (2), 375/768: mobil sheet (4) |
| `/tactics/wizard` 5 adım + sonuç + sonuç kaydırılmış | 42 | |
| Replika detayı regresyonu: uygula (kariyer) + "öner" diyaloğu (UT, AppDialog) | 12 | UT: 4 kulüp kartı tohumu (yalnız bu tarayıcı) |

Kapıda bulunup düzeltilenler (ilk koşu 47 sorunlu, son koşu 0):
- Sihirbaz adım göstergesi yatay kaydırılabilirdi ama odaklanabilir değildi (axe `scrollable-region-focusable`) ve 375'te sığmıyordu → satır kaydırma yok, dar ekranda bağlaçlar gizli, sarılır.
- `/squad` bölge özetinde "Az: …" çipi `glass-3` zeminde koyu temada 4,41:1 → kart zemini kaldırıldı (yalnız kenarlık), çip panel zemininde.
- Replika uygula (kariyer, açık tema) "Öner" bağlantısı 4,11:1 (vurgu rengi `glass-3` üstünde; V3-07b öncesinden) → metin `text-ink`, vurgu alt çizgide; UT düğmesi de aynı.
- `/squad` rol etiketi tekrarı (yukarıda §3).

## 6. Envanter (önce → sonra)

`node scripts/page-inventory.mjs` → `V3-07_envanter.md`. Tarama artık `scripts/lib/legacyScan.mjs`'te (vitest kapısıyla ortak); içe aktarmalar çözülmüş yola göre tanınıyor (`./Modal`, `./ui` göreli içe aktarmaları da).

| | V3-07a sonu | V3-07b sonu |
|---|---:|---:|
| Rota | 39 | 39 |
| v3 sayfası | 19 | 23 |
| Hâlâ eski (v2) | 14 | 10 |
| Yönlendirme | 6 | 6 |
| Eski parçası hiç olmayan | 7 | 23 |

Ortak bileşenler (ui.tsx hex, CareerSelect/TransferDialog Modal'ı, Pill'ler) temizlenince zinciri temizlenen diğer sayfalar: `/`, `/players`, `/players/:id`, `/replicas`, `/replicas/:id`, `/career/import`, `/career/new`, `/career/transfer`, `/ut/players/:assetId`, `/ut/sbc`, `/ut/sbc/:setId`, `/ut/sbc/:setId/:challengeId`. Hâlâ eski 10 sayfa: `/compare`, `/wonderkids`, `/teams`, `/ut/meta`, `/ut/objectives`, `/ut/club`, `/ut/import`, `/ut/evo` (V3-07a önerisindeki kalan V3-07b grubu), `/about`, `/admin/ut` (V3-08).
