# Faz E3 — Motor denetimi, teşhis kanıtı ve uygulama planı (2026-10-13)

Kapsam: durum denetimi + ölçüm + golden set taslağı. **Motor kodu yazılmadı, hiçbir seed/test değişmedi.** Backend `main`, 13 §1 ve §4 tabloları referans.
Durum: **yapıldı / kısmen / yok / doğrulanmadı** (doğrulanmadı = bu oturumda koda bakılmadı; kanıt yazılmadı).

## 1. ENG-01..23 denetimi
| ID | Durum | Kanıt |
|---|---|---|
| ENG-01 kariyer filtreleri base katalogdan | **yapıldı** | `21c904c`; `PlayerSearchRepository` kariyer overlay'i (`career_player_rating` + `career_player_data` lateral join, `EFF_*`); `CareerModeSearchIntegrationTest` |
| ENG-02 bütçe 0/null | **yapıldı** | `69374a9` |
| ENG-03 kiralık oyuncular | **yapıldı** | `c826c25` |
| ENG-04 oyun tarihi | **yapıldı** | `1482215`, `V27__career_game_date.sql` |
| ENG-05 RoleFit ≈ pozisyon OVR | **yok** | `FitEngineProperties.java:20` `roleWeightsVersion = "v1"`; `seed/role-calibration-v2.json` duruyor ama kapalı. Ölçüm §2: `breakdown.base` ≈ OVR (GK 57 → base 52,8; Courtois 90 → 83,7) |
| ENG-06 sert uçurumlar | **yok** | `defensiveGate.heavyPenalty = 30` (`FitEngineProperties.java:42`, `RoleFitService.java:73`); ölçüm §2: CB 66 ve CDM 67 aynı −30 kapısı |
| ENG-07 eksik sinyaller (ayak, boy, aşinalık) | **yok** | `FitPlayer.java` alanları: id, name, age, overall, positions, attrs, playstyles, acceleRate, potential, valueEur |
| ENG-08 aday havuzu OVR kesimi | **yok** | `RecommendationService.java:137,186,227` `.sort("overall").size(CANDIDATE_POOL)` |
| ENG-09 IntentFit tek attribute | **yok** | `IntentFitService.java:52` `tag.primaryWeapon()`, oran 1'de tavanlı (`:54`) |
| ENG-10 etiketli preset yanlılığı | **yok** | `SquadFitService.java:64` `combine(roleFit, intentFit, slot)` hâlâ karışım |
| ENG-11 kural motoru etikete bağlı | **yok** | `seed/tactic-rules.json` 6 kural, `RuleMetric` 4 metrik |
| ENG-12 hat bantları | **yok** | `SetupModifier.java:16-18` HIGH_LINE 65, AGGRESSIVE 85, LOW 35 (FC27/UI: 30/60/90) |
| ENG-13 boş slot ortalamada | **yok** | `SquadFitService.java:106-109` `roleAverage` yalnız atanmış slotların ortalaması |
| ENG-14 gelişim/potansiyel tutarsızlığı | doğrulanmadı | |
| ENG-15 lig tier / değer / ML face ağırlıkları | **kısmen** | `league.tier` artık yazılıyor (`LeagueTierService`, `seed/league-tiers.json`, BE-BUG-17); `ModeledValueFormula` ve `ml-service` face ağırlıkları (PAC/DRI/PHY) bu oturumda incelenmedi. Not: F10 holdout ile resmî face formülü artık biliniyor (`ut-rules.faceStatWeights*`, %100 tam isabet) |
| ENG-16 mevki dışı düz −15 | **yok** | `FitEngineProperties.java:22` `outOfPositionPenalty = 15` |
| ENG-17 preset/replika rolsüz | **yok** | `seed/presets.json` içinde `roleId` yok |
| ENG-18 savunma rolünde hücum Positioning | doğrulanmadı | `seed/roles.json:48` DefAwareness + Positioning silahı görüldü; hangi rol olduğu kontrol edilmedi |
| ENG-19 aynı pozisyonda ikinci rol düşüyor | doğrulanmadı | |
| ENG-20 cinsiyet null | doğrulanmadı | `CareerService` cinsiyet kontrolü var (`:347`), `DevelopmentController` bakılmadı |
| ENG-21 metin > sayı | **yok** | `messages.properties:111` `nlg.badge.green=…biçilmiş kaftan` (yeşil rozet eşiği ≈ 55 puan) |
| ENG-22 silinen seed DB'de kalıyor | doğrulanmadı | `ReferenceDataSeeder` |
| ENG-23 testler üretimdeki kütüphaneye dokunmuyor | **yok** | `FitFixtures`, `FitEngineScenarioTest`, `RoleCalibrationScenarioTest` aynı; `pom.xml`'de jqwik yok |

## 2. ENG-M durumu
| Adım | Durum | Kanıt / eksik |
|---|---|---|
| M1 tek kaynak `career_player`; kariyerde base join yok | **kısmen** | Var: `career_player_rating`, `career_player_data`, `career_player_tag`, `career_snapshot*`, `user_player_state`, `career.game_date`; LE export v2 parser (`LeExportV2Parser`). Yok: tek `career_player` tablosu, `as_of`, `available` üretilmiş kolon, `engine_version`/`data_version`, `user_tactic`. **Arch testi yok:** `PlayerSearchRepository` kariyer sorgusu hâlâ `player_rating r` üzerinde overlay ile (`:35` lateral join), yani base katalog join'i duruyor |
| M2 seed'ler (attr-norms, rol vektörleri v3, temel attr, PS, aşinalık, ayak, posDist) | **yok** | `seed/` yalnız: `role-weighting.json`, `role-calibration-v2.json`, `position-overall-weights.json`, `roles.json`, `league-tiers.json`… (`attr-norms.fc27.json`, `role-movement.fc27.json`, posDist/aşinalık yok). CI değişmezleri yok |
| M3 FitEngineV3 | **yok** | |
| M4 öneri hattı | **yok** | |
| M5 taktik analizi | **yok** | |
| M6 NLG | **yok** | |
| M7 replikalar | **yok** | |
| M8 web v3 API | **yok** | |

## 3. Teşhis kanıtı: mevcut motor (v1) ile ölçüm
Yöntem: canlı backend `POST /fit/role` (rol, mevki; etiket yok); yanıttaki `breakdown` + `weaponChecks` kullanıldı, kod değişmedi. Skor = `base + PS + AcceleRATE − weaponPenalty − outOfPosition − floorPenalty − defensiveGate` (0..100'e kırpılır; gate `breakdown`'da yok, farktan çıkarıldı).
Kariyer: Buğra'nın gerçek kariyeri **Crewe Alexandra (EFL League Two)**; senin bahsettiğin %2/%51/%36 değerleri Magdeburg test kariyerindendi (silindi). Aynı sayıları **Magdeburg katalog oyuncularıyla** yeniden üretti, ayrıca Crewe oyuncularını ekledim.

| Oyuncu (mevki · rol) | Skor | base | PS | Accel | silah cezası | taban cezası | gate | Neden düştü |
|---|---|---|---|---|---|---|---|---|
| **Robert Kampa**, GK 57 (Magdeburg) · Goalkeeper Defend | **2,1** | 52,8 | 0 | 0 | **−42,7** (GKReflexes 57<68: −22,1; GKPositioning 56<66: −20,6) | −8 (Reactions 50<60) | 0 | Mutlak alt sınırlar (68/66) seviyeden bağımsız: 57'lik kaleci hiçbir zaman geçemez |
| Noah Kruth, GK 62 | 18,6 | 57,8 | 0 | 0 | −23,2 | −16 | 0 | Aynı |
| **Dominik Reimann**, GK 68 | **51,1** | 63,3 | 0 | 0 | −12,2 (Reflexes 73 sarı −3,6; Positioning 64<66 −8,6) | 0 | 0 | 68'lik kaleci bile rozette KIRMIZI |
| **Torben Müsel**, CDM 67 · Holding Defend | **7,5** | 64,1 | 0 | +4 | −30,6 (DefAw 62<66 −12,4; Interceptions 60<66 −15,4; Stamina 81<88 −2,8) | 0 | **−30** | Savunma kapısı + mutlak silah sınırları |
| Falko Michel, CDM 68 | 48,6 | 68,1 | 0 | +4 | −23,5 | 0 | 0 | DefAw 64<66, Stamina 75<78 |
| Crewe: Keisuke Osako, GK 69 | 54,5 | 64,1 | 0 | 0 | −9,6 | 0 | 0 | |
| Crewe: **Ian Lawlor**, GK 61 | **25,0** | 56,5 | 0 | 0 | −30,7 | −0,8 | 0 | Aynı mutlak sınır sorunu |
| Crewe: Iván Román, CB 66 · Defender Defend | **9,7** | 66,6 | 0 | +4 | −19,7 | −11,2 (Composure 46<60) | **−30** | Gate + taban + silahlar (DefAw 61 vs sınır 64) |
| Crewe: **Joe White**, CM 64 · Box-to-Box | **36,0** | 64,1 | 0 | +4 | −32,1 (Stamina 69<78 −17,5; Positioning 60<66 −14,6) | 0 | 0 | |
| **UT: Thibaut Courtois**, GK 90 | **83,7** | 83,7 | 0 | 0 | 0 | 0 | 0 | Tüm silahlar yeşil |
| **UT: Kylian Mbappé**, ST 91 · Advanced Forward Attack | **94,6** | 91,6 | +3 | 0 | 0 | 0 | 0 | |

**Okuma:**
1. `base` ≈ OVR'nin kendisi (EA pozisyon OVR ağırlıkları, ENG-05): rol ayrımı neredeyse yok; seviye düştükçe skor düşer.
2. **Ceza terimleri mutlak ve seviyeden bağımsız** (`weapons.hardMin`, global taban, savunma kapısı): 60 puanlık oyuncu için 30–45 puanlık ceza normal. UT kartları (yüksek OVR) bu cezaların hiçbirine takılmadığı için %84–100, düşük lig oyuncuları %2–51 çıkıyor. Bu, "RoleFit seviyeye göre normalize değil" tanısının doğrudan ölçümü.
3. Aynı oyuncu aynı kartta farklı yerde çok farklı (CDM Müsel 7,5; Michel 48,6; −30 gate tek başına): ENG-06'nın uçurumu görülüyor.
4. Not: `base` normalizasyonsuz (norm(v)=v/99); 13 §3.2'deki `σ((a−p)/s)` yüzdelik normalizasyonu yok.

## 4. Uygulama planı (13 §4 ENG-M sırası; oturum başına kapsam)
Ön koşul (13 sonu): ENG-01..04 yapıldı. **Onay gerektirenler** ayrıca işaretli.

| Oturum | Kapsam | Çıktı / kabul | Onay/bağımlılık |
|---|---|---|---|
| E3-0 (bu oturum) | denetim + teşhis + golden set taslağı | bu dosya, `golden_set_draft.md` | Buğra golden set taslağını onaylar |
| E3-1 | **M1 tasarım+şema**: `career_player` modeli mevcut overlay tablolarından nasıl türer (göç planı), `engine_version`/`data_version`, `available`, `user_tactic`; arch testi (kariyer SQL'inde `player_rating r` yok) kırmızı yazılır | Flyway taslağı + kırmızı arch testi | Veri silen göç yok; mevcut kariyer verisi korunur |
| E3-2 | **M1 uygulama**: LE v2 import'u `career_player`'a, kariyer sorguları tek tabloya; arch testi yeşil | test yeşil, mevcut kariyerlerde veri eşit | |
| E3-3 | **M2a**: `attr-norms.fc27.json` (katalogdan yüzdelik, 19.789 resmî kart dahil), `position-overall-weights` ilişkisi, `posDist` | CI: değişmezler (rol vektörü benzersiz, focus kosinüs ≤ 0,95) | `verified:false` işaretli seed'ler |
| E3-4 | **M2b**: rol vektörleri v3 üreticisi + temel attribute'lar `{min,target}`, PS listesi, aşinalık, ayak/kanat terimleri (seed) | veri değişmezleri yeşil | LE `role1..5` aşinalık verisi mevcut mu: doğrula |
| E3-5 | **M3**: `FitEngineV3` saf fonksiyon + katkı çıktısı, `engine_version` bayrağı | golden set τ ≥ 0,8; özellik testleri | **jqwik** test bağımlılığı (yeni paket) için Buğra onayı |
| E3-6 | **M4**: öneri hattı + fizibilite kovaları + çeşitlendirme; OVR kesimi yok | recall@10 ≥ 0,95, null bütçe testi | |
| E3-7 | **M5**: taktik analizi + `role-movement.fc27.json` | etiketsiz taktik bulgu üretir | `role-movement` değerleri elle yazılır (`verified:false`); veri kaynağı yok → Buğra onayı |
| E3-8 | **M6**: NLG katkıdan, "biçilmiş kaftan" ≥85 | her cümlenin sayısal kaynağı log'lanır | |
| E3-9 | **M7**: replika/5 slot bağlama | REP-07 golden | replika taktik kodları (TAC-07) Buğra'dan |
| E3-10 | **M8**: web v3 API'ye geçiş, eski uçlar Deprecation | eski uçlara çağrı yok | V3-05+ ekranlarıyla koordine |

Her oturum: kırmızı test → uygulama → tam `mvn test` yeşil → commit (`ENG-Mx: …`, `BEHAVIOR CHANGE:`/`API CONTRACT CHANGE:`) → bu dosyayı güncelle.
Açık risk: v1 motor E3-5'e kadar canlıda kalır; kullanıcıya yanlış düşük skor göstermeye devam eder (§3). İstenirse ara önlem (ör. v2 kalibrasyonunu açmak) ayrı karar; bu oturumda yapılmadı.
