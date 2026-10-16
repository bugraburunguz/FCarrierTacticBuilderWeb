# E3-5 raporu — FitEngineV3, levelFit, v1→v3 karşılaştırma (2026-10-14)

## Özet
- `FitEngineV3` saf fonksiyon olarak yazıldı (`fitengine/service/FitEngineV3.java`): seviye-normalize fayda + rol vektörü + temel attr cezaları + PS/aşinalık/fiziksel/ayak terimleri + `posDist`. Her çağrı **katkı listesi** döndürür (hangi terim kaç puan).
- Altın set: **kesin çiftler 51/51 (%100), Kendall τ = 1,00** (hedef ≥ 0,8). Gözlem çiftleri build'i kırmaz, raporlanır (aşağıda).
- jqwik 1.9.2 (test scope, onaylı sürüm) ile özellik testleri: attr artışı fit'i düşürmez ve ≤ 1,5 puan/attr puanı; OVR/potansiyel/değer currentFit'i değiştirmez; PS katkısı ≤ 8; mevki dışı ≤ mevkide; kanat ayak yönü etkisi. Hepsi yeşil.
- `fit_level_norms` (Flyway V30) + `FitLevelNormsBuilder` (tek transaction, yeniden üretilebilir) + `LevelFitService`. Yerel katalogdan **14.388 satır** üretildi (22.314 oyuncu). Bant OVR ±3, `<30` oyuncuda ±1'er genişler (üst sınır ±10); bant ve örnek sayısı satırda kayıtlı.
- `engine_version` yapılandırması: `fcareer.fit.engine-version` (katalog/UT yolları, **varsayılan v1**) ve `fcareer.fit.career-engine-version` (kariyer kadrosu yolları, **varsayılan v3**). `/fit/role` isteğine opsiyonel `engineVersion: "v1"|"v3"` geçersiz kılma eklendi. Geri alma = ortam değişkeni (`FCAREER_FIT_CAREER_ENGINE_VERSION=v1`), kod değişmez.

## Kabul kontrolleri (yerel DB, `tools/fit-seeds/level-fit-report.mjs`)
PASS: Kampa levelFit 31 ≥ 30 · Lawlor 50,3 ≥ 30 · Osako 46,1 / Lawlor 50,3 / Román 54,3 / White 56,4 / Reimann 38,0 hepsi [35, 65] · currentFit kaleci merdiveni korunuyor (Carnesecchi 94,7 > Coosemans 84,0 > Ngapandouetnbu 70,4 > Santos 50,7 > Jochmans 27,4).
Not: Müsel (CDM 67, Holding) levelFit 31,4 ile [35,65] dışında; "tipik profil" listesine girmedi, gerçekten Holding'e zayıf oturuyor (tackle −5,1, interceptions −4,2).

## Sapmalar ve dürüst notlar
1. **Holding vektörü altın setten sonra ayarlandı.** İlk çalıştırmada Khedira > Xhaka (Holding · Defend) çifti kırıldı (82,8 < 85,4). Holding vurgusunu pas/vizyondan hava düellosu (Jumping 0,05) ve koşuya kaydırdım; kosinüs ≤ 0,90 değişmezi korundu. Bu bir **test sonrası kalibrasyon**; `_basis` metnine yazıldı. Kesin çifti sağlamak için ayarlandığı için bu çift artık bağımsız doğrulama sayılmaz.
2. **Mevki dışı hesap tasarımı değişti.** Özellik testi, mevki dışındaki oyuncunun (rol cezaları uygulanmadığı için) mevkideki aynı oyuncudan daha yüksek alabildiğini yakaladı. Artık mevki dışı da rol vektörüyle ve cezalarıyla hesaplanıyor, sonra `posDist` çarpanı uygulanıyor (13 §3.2'deki "genel pozisyon vektörü" yerine). Golden etkisi: Puig (CM) DLP'de 45,1 → 81,0 (CDM'de mevki dışı olduğu için gözlem çiftinde yön değişti).
3. **Tavan doygunluğu:** De Bruyne (PM), Xhaka (DLP), Cucurella (FB) currentFit = 100 (kırpma). Sıralama testleri geçiyor ama üst uçta ayrım azalıyor; yumuşak doygunluk (örn. tanh) bir sonraki ayar turunda önerilir, şimdilik dokunmadım.
4. **`projectedRating` v3'te OVR'ye eşit** (rol-OVR modeli yok). `DevelopmentService` (büyüme projeksiyonu) v1'de kaldı; AdvisorService/PositionAdviceService de **v1'de** (4 argümanlı `calculate`). Yalnız `FitService` (`/fit/role`, `/players/compare`, `/fit/lineup`, `/fit/squad`, `/players/{id}/roles`) sürüm seçer. Advisor geçişi ayrı adım.
5. **Rozet eşikleri** (`fcareer.fit.v3.green-from=60`, `yellow-from=35`) levelFit yüzdeliğine göre, `verified:false` UX ayarı; yorumunuza göre değişir. Niyet etiketleri (`tags`) v3 rol skorunu etkilemez (IntentFit ayrı sürer).
6. Test sırası: golden test ve özellik testleri kodun **arkasından** yazıldı (kırmızı gözlenmedi); LevelFitCalculator, FitEngineVersionIntegrationTest ve ilk golden fixture düzeltmeleri kırmızı → yeşil izlendi. Fixture üretecimde bir indeks hatası (attr sütunu kayması) vardı; ilk test koşusundan önce yakalanıp düzeltildi.
7. `role-movement` örneği E3-7'ye (M5) aittir; o oturumun başında 5 rolün örneğini önce sizin onayınıza sunacağım.

## Gözlem çiftleri (build'i kırmaz)
| Çift (blok) | v3 sonucu |
|---|---|
| Abline ↔ Hofleitner (TF) | 63,0 < 68,0 (Hofleitner önde) |
| Distefano ↔ Hofleitner (Poacher) | 60,5 > 51,4 |
| Barcola ↔ Traoré (Winger) | 86,0 > 70,1 (fark 15,9) |
| Bakasetas ↔ Nartey (PM) | 71,4 < 77,7 |
| Modrić ↔ Löwen (B2B) | 65,7 < 77,1 |
| Modrić ↔ Xhaka (DLP) | 97,7 < 100,0 |
| Puig ↔ Martin (DLP) | 81,0 > 62,3 |

## v1 → v3: 1. Teşhis oyuncuları: v1 → v3

| Oyuncu (mevki · rol) | OVR | v1 skor | v3 currentFit | v3 levelFit (bant, n) | v3 ilk 3 katkı |
|---|---|---|---|---|---|
| Robert Kampa (GK · goalkeeper Defend) | 57 | 2.1 | 24.7 | 31 (OVR 54-60, n=580) | GKPositioning -10.3, GKReflexes -8.3, goalkeeper -1.7 |
| Dominik Reimann (GK · goalkeeper Defend) | 68 | 51.1 | 59.4 | 38 (OVR 65-71, n=667) | GKReflexes +8.3, GKPositioning +1.6, goalkeeper -1.4 |
| Torben Müsel (CDM · holding Defend) | 67 | 7.5 | 40.6 | 31.4 (OVR 64-70, n=1993) | StandingTackle -5.1, Interceptions -4.2, DefAwareness -1.8 |
| Ian Lawlor (GK · goalkeeper Defend) | 61 | 25 | 40.3 | 50.3 (OVR 58-64, n=714) | GKPositioning -4.6, GKReflexes -3.4, goalkeeper +0.8 |
| Iván Román (CB · defender Defend) | 66 | 9.7 | 48 | 54.3 (OVR 63-69, n=2050) | DefAwareness -4.1, StandingTackle +1.4, Heading +0.8 |
| Joe White (CM · box_to_box Balanced) | 64 | 36 | 43.8 | 56.4 (OVR 61-67, n=2225) | Stamina -3.1, Stamina -0.8, Positioning -0.7 |
| Thibaut Courtois (GK · goalkeeper Defend) | 90 | 83.7 | 97.3 | 100 (OVR 82-98, n=30) | GKPositioning +23.6, GKReflexes +16.4, GKDiving +2.1 |
| Kylian Mbappé (ST · advanced_forward Attack) | 91 | 94.6 | 98.6 | 93.6 (OVR 84-98, n=31) | Finishing +11.6, Positioning +10.9, Acceleration +10.1 |

## v3: 2. Altın set oyuncuları: currentFit ve levelFit

| Blok | Oyuncu | OVR | currentFit | levelFit |
|---|---|---|---|---|
| TF | Cristiano Ronaldo | 84 | 85.6 | 77 |
| TF | Lucas Passerini | 74 | 78.4 | 88.6 |
| TF | Alexander Hofleitner | 64 | 68 | 99.2 |
| TF | Alieu Njie | 65 | 14.1 | 5.1 |
| TF | Hugo Ekitiké | 85 | 77 | 50 |
| TF | Matthis Abline | 76 | 63 | 37.7 |
| PO | Antoine Griezmann | 84 | 90 | 72.5 |
| PO | Alexis Sánchez | 75 | 79.9 | 83 |
| PO | Filippo Distefano | 65 | 60.5 | 96.7 |
| PO | Alexander Hofleitner | 64 | 51.4 | 83.8 |
| IF | Yan Diomande | 84 | 87.8 | 59.1 |
| IF | Ismael Díaz | 74 | 73.9 | 80 |
| IF | Abdul Abdulmalik | 66 | 55.8 | 82 |
| IF | Adama Traoré | 74 | 63.7 | 26.5 |
| WG | Bradley Barcola | 85 | 86 | 64.3 |
| WG | Emilio Rodríguez | 66 | 51.6 | 47.5 |
| WG | Adama Traoré | 74 | 70.1 | 45 |
| WG | Ismael Díaz | 74 | 58 | 13.3 |
| PM | Kevin De Bruyne | 85 | 100 | 99.5 |
| PM | Isaque | 66 | 59.6 | 95.1 |
| PM | Nikolas Nartey | 74 | 77.7 | 86.8 |
| PM | Dominik Szoboszlai | 86 | 90.4 | 41.7 |
| PM | Anastasios Bakasetas | 75 | 71.4 | 53 |
| B2B | Scott McTominay | 86 | 87.3 | 76.3 |
| B2B | Eduard Löwen | 74 | 77.1 | 88.2 |
| B2B | Kim Dong Hyun | 65 | 75.3 | 99.1 |
| B2B | Luka Modrić | 85 | 65.7 | 13.6 |
| B2B | Riqui Puig | 74 | 28.6 | 2.5 |
| DLP | Granit Xhaka | 85 | 100 | 99.5 |
| DLP | Nicolò Fagioli | 76 | 83.7 | 88.7 |
| DLP | Jonas Martin | 66 | 62.3 | 92.9 |
| DLP | Luka Modrić | 85 | 97.7 | 96.4 |
| DLP | Riqui Puig | 74 | 81 | 92.2 |
| HOLD | Moisés Caicedo | 86 | 97.3 | 98 |
| HOLD | Rani Khedira | 76 | 86.5 | 99.1 |
| HOLD | Leonardo Freijão | 64 | 56.3 | 96.5 |
| HOLD | Granit Xhaka | 85 | 80.6 | 36.1 |
| DEF | Aymeric Laporte | 84 | 93.4 | 76.4 |
| DEF | Gautier Lloris | 75 | 80.4 | 81 |
| DEF | Uroš Radaković | 66 | 53.8 | 74.7 |
| DEF | Bright Arrey-Mbi | 74 | 67.4 | 27.5 |
| BPD | Aymeric Laporte | 84 | 96.2 | 93.8 |
| BPD | Uroš Radaković | 66 | 41.5 | 26.3 |
| BPD | Kenan Toibibou | 64 | 67.7 | 96.4 |
| BPD | Pau Cubarsí | 86 | 99.7 | 100 |
| AWB | Marcos Llorente | 85 | 92.8 | 96.6 |
| AWB | Álvaro Angulo | 74 | 75.5 | 83.7 |
| AWB | Henry Rorig | 66 | 69.3 | 98.9 |
| AWB | Craig Forsyth | 66 | 33.9 | 15.9 |
| FB | Cucurella | 86 | 100 | 97 |
| FB | Bernardo | 75 | 89 | 94.4 |
| FB | Craig Forsyth | 66 | 72.7 | 98.2 |
| FB | Henry Rorig | 66 | 25 | 5.9 |
| FB | Álvaro Angulo | 74 | 53.1 | 4 |
| GK | Marco Carnesecchi | 86 | 94.7 | 70.5 |
| GK | Colin Coosemans | 76 | 84 | 75.9 |
| GK | Simon Ngapandouetnbu | 69 | 70.4 | 80 |
| GK | Mikel Santos | 63 | 50.7 | 72 |
| GK | Owen Jochmans | 58 | 27.4 | 31 |
| K-GK | Keisuke Osako | 69 | 63.4 | 46.1 |
| K-GK | Ian Lawlor | 61 | 40.3 | 50.3 |
| K-IF | Jesse Eugen Bisiwu | 68 | 59.2 | 78.8 |
| K-IF | Jordan Gibson | 64 | 40 | 51.3 |
| K-WB | Givairo Read | 76 | 74.7 | 69.1 |
| K-WB | Lewis Billington | 64 | 51.7 | 82.2 |
