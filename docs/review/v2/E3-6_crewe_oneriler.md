# E3-6 — Crewe önerileri (gerçek kariyer verisi; gözle kontrol için)

Üretim: `CareerRecommendationReportRunner` (yerel, kimlik doğrulamasız, varsayılan kapalı) ile Crewe kariyerinde (id 4); bütçe 2.000.000 €, kadro 24 oyuncu. Aşağıdaki tablolar o çalıştırmanın çıktısıdır, elle düzenlenmedi.

## Sizin dikkatinize (önce bunlar)
1. **Yaşlı oyuncular listeye giriyor.** Yaş riski eklemeden önce ilk 10'u 35–41 yaş oyuncular dolduruyordu (ör. 40 yaşında bir santrfor). Şimdi sıralama puanı `(1−0,35)·currentFit + 0,35·futureFit − kova cezası − 1,5×(yaş−33)`; futureFit yaşlanmayı da içerir (32+ için fiziksel attribute düşüşü). Yine de teknik rollerde (False 9, Deep-Lying Playmaker) fit düşmediği için 33–37 yaş serbest oyuncular üst sıralarda kalıyor; bu katsayılar `verified:false` ilk kalibrasyondur (`fcareer.recommend.age-risk-*`, `future-weight`). **Listeyi gözle kontrol edince hangi yaşta kesmek/ceza vermek istediğinize siz karar verin.**
2. **Lig seviyesi çoğu satırda bilinmiyor ("?")**: `seed/league-tiers.json` yalnız 34 ligi kapsıyor. Bilinmeyen seviye oyuncunun aleyhine sayılmaz (0 puan) ve kova gerekçesinde "bilinmiyor" yazar; bu yüzden pek çok yabancı lig oyuncusu "Alınabilir" çıkıyor. Tier tablosunun genişletilmesi (ya da lig kalitesinden türetilmesi) gerçek bir eksik.
3. **Sözleşme süresi hep bilinmiyor**: LE içe aktarımında sözleşme alanı yok (`contract_until` boş). "Sözleşmesi ≤ 6 ay" koşulu bu yüzden pratikte yalnız serbest oyuncuları kapsıyor.
4. **Değer** modellenmiş (MODELED) değerdir (gerçek bonservis değil); maaş bütçesi bilinmiyor, kullanılmadı.
5. **READY** etiketi sık çıkıyor çünkü mevkideki mevcut oyuncu zayıf (ör. LB Read currentFit 81,6; CB Cao 63,3; ST Bisiwu 63,9; CM Skinner 58,3) ve levelFit ≥ 65 kolay sağlanıyor.

## Kabul ölçütleri (bu çalıştırma)
| Ölçüt | Sonuç |
|---|---|
| recall@10 (her taban rol için `LIMIT 2000` önskor havuzu ↔ kayıttaki tüm oyuncuların tam puanı) | **1,000** (LB, CB, ST, CM; ilk tasarımda havuz roller arasında bölününce LB 0,80'e düşmüştü → her rol sorgusuna tam 2000 verildi) |
| Tam puanlanan oyuncu / mevki | LB 2.458 · CB 2.528 · ST 2.989 · CM 3.242 |
| Hat süresi (HTTP hariç, 48 ölçüm) | p50 913 ms · **p95 1.295 ms** · en yavaş 1.372 ms |
| Kayıtta olmayan katalog oyuncusu önerilmez | `CareerRecommenderIntegrationTest` (kırmızı→yeşil) + `CandidatePoolIntegrationTest` |
| Null/0 bütçe = bilinmiyor, kendi kadro/kiralık/cinsiyet izolasyonu | `CareerRecommenderIntegrationTest` |

## projectedRating tanımı
`projectedRating` = sezon sonu beklenen OVR = `min(POT, OVR + round((POT−OVR)×yaşÇarpanı))` (yaş ≤19: 0,55 … 28–29: 0,05); 32+ yaşta `OVR − round(0,6 × fiziksel düşüş)`. `futureFit` = aynı rol/mevki için büyütülmüş/yaşlandırılmış oyuncunun `currentFit`'i. Rol-uyum yanıtındaki (`/fit/role`) v3 `projectedRating` ise **değişmedi (= mevcut OVR)**: potansiyeli sızdırmasın diye (SCOUT_RANGE kariyerlerde öneri yanıtında da futureFit/projectedRating gizlenir).


## LB

Mevcut: **Givairo Read** (currentFit 81.6, rol fullback_defend)

| # | Oyuncu | Yaş | Kulüp (lig) | Değer | Kova (puan) | Rol | currentFit | levelFit | Δ mevcut | futureFit | Etiket | En büyük artılar | Eksiler | Kova gerekçesi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Alex Sandro | 35 | Serbest (Serbest) | 2.8 M€ | Alınabilir (0) | Fullback (Defend) Defend | 91.8 | 90.1 | +10.2 | 91.8 | FREE,READY | DefAwareness +15.4, StandingTackle +15.1, Interceptions +6.0 | Acceleration -0.1, Stamina -0.1 | serbest evet (0) |
| 2 | Guillermo Varela | 33 | Serbest (Serbest) | 3.4 M€ | Alınabilir (0) | Fullback (Defend) Defend | 81.6 | 71.6 | +0.0 | 81.6 | FREE | DefAwareness +14.7, StandingTackle +12.6, Interceptions +4.6 | LB -2.5, DefAwareness -0.1 | serbest evet (0) |
| 3 | David Douděra | 28 | Serbest (Serbest) | 4.6 M€ | Alınabilir (0) | Attacking Wingback (Attack) Attack | 80.7 | 90.3 | -0.9 | 80.7 | FREE | Crossing +11.2, Acceleration +6.3, WhippedPass +4.0 | LB -2.5, Stamina -0.2 | serbest evet (0) |
| 4 | Loris Benito | 34 | BSC Young Boys (Brack Super League) | 1.2 M€ | Alınabilir (1) | Fullback (Defend) Defend | 79.4 | 89.7 | -2.2 | 79.3 |  | DefAwareness +14.7, StandingTackle +8.9, Interceptions +4.3 | SprintSpeed -0.1, Acceleration -0.1 | değer/bütçe 0.60 (0); lig seviyesi ? (0); kulüpteki rol 14 (1); sözleşme ? (0) |
| 5 | Emiliano Ancheta | 27 | Nacional (Libertadores) | 1.6 M€ | Zor (2) | Fullback (Defend) Defend | 83.4 | 94.6 | +1.7 | 83.4 | READY | DefAwareness +16.0, StandingTackle +13.3, Interceptions +5.5 | LB -2.6, SprintSpeed -0.2 | değer/bütçe 0.80 (1); lig seviyesi ? (0); kulüpteki rol 9 (1); sözleşme ? (0) |
| 6 | Branco Ampuero | 33 | Uni. Católica (Libertadores) | 1.8 M€ | Zor (3) | Fullback (Defend) Defend | 82.6 | 89.7 | +1.0 | 82.6 | READY | DefAwareness +13.1, StandingTackle +12.6, Interceptions +4.6 | LB -2.6, Crossing -0.3 | değer/bütçe 0.90 (1); lig seviyesi ? (0); kulüpteki rol 3 (2); sözleşme ? (0) |
| 7 | Juan Bernat | 33 | SD Eibar (LALIGA HYPERMOTION) | 1.0 M€ | Alınabilir (1) | Inverted Wingback (Build-Up) Build-Up | 76.4 | 96.0 | -5.2 | 76.4 |  | Composure +8.3, ShortPassing +7.0, Vision +6.5 | Stamina -0.3, ShortPassing -0.3 | değer/bütçe 0.48 (0); lig seviyesi ? (0); kulüpteki rol 12 (1); sözleşme ? (0) |
| 8 | Olivier Custodio | 31 | Lausanne-Sport (Brack Super League) | 1.1 M€ | Alınabilir (1) | Inverted Wingback (Build-Up) Build-Up | 75.7 | 95.6 | -5.9 | 75.7 |  | ShortPassing +10.5, Composure +7.4, Vision +6.5 | LB -2.3, Composure -0.2 | değer/bütçe 0.53 (0); lig seviyesi ? (0); kulüpteki rol 5 (1); sözleşme ? (0) |
| 9 | Coleen Louis | 21 | FC Basel 1893 (Brack Super League) | 1.3 M€ | Alınabilir (1) | Fullback (Defend) Defend | 71.7 | 97.3 | -9.9 | 83.1 | YOUNG | DefAwareness +14.7, StandingTackle +4.1, Interceptions +2.6 | Stamina -0.3, Crossing -0.2 | değer/bütçe 0.65 (1); lig seviyesi ? (0); kulüpteki rol 21 (0); sözleşme ? (0) |
| 10 | Raphaël Lipinski | 24 | Rodez AF (Ligue 2 BKT) | 1.2 M€ | Alınabilir (1) | Fullback (Defend) Defend | 73.0 | 94.1 | -8.6 | 78.2 |  | DefAwareness +9.1, StandingTackle +8.9, Interceptions +3.5 | DefAwareness -0.1, StandingTackle -0.1 | değer/bütçe 0.58 (0); lig seviyesi ? (0); kulüpteki rol 7 (1); sözleşme ? (0) |

_recall@10 (önskorlu 2000'lik havuz ↔ tüm kayıttaki oyuncuların tam puanı): 1.00 · tam puanlanan: 2458_

## CB

Mevcut: **Cao Quang Vinh** (currentFit 63.3, rol wide_back_support)

| # | Oyuncu | Yaş | Kulüp (lig) | Değer | Kova (puan) | Rol | currentFit | levelFit | Δ mevcut | futureFit | Etiket | En büyük artılar | Eksiler | Kova gerekçesi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Alex Sandro | 35 | Serbest (Serbest) | 2.8 M€ | Alınabilir (0) | Ball-Playing Defender (Build-Up) Build-Up | 84.8 | 79.1 | +21.5 | 84.4 | FREE,READY | ShortPassing +10.6, Vision +9.8, Composure +7.8 | Acceleration -0.4, Composure -0.1 | serbest evet (0) |
| 2 | Áron Csongvai | 25 | AS Saint-Étienne (Ligue 2 BKT) | 2.4 M€ | Zor (3) | Ball-Playing Defender (Build-Up) Build-Up | 85.7 | 94.2 | +22.4 | 87.2 | READY | Vision +9.4, ShortPassing +9.2, LongPassing +7.6 | Acceleration -0.6, ball_playing_defender -0.5 | değer/bütçe 1.20 (2); lig seviyesi ? (0); kulüpteki rol 10 (1); sözleşme ? (0) |
| 3 | Sandro Lauper | 29 | BSC Young Boys (Brack Super League) | 2.0 M€ | Zor (2) | Ball-Playing Defender (Build-Up) Build-Up | 85.9 | 94.3 | +22.6 | 85.9 | READY | ShortPassing +9.7, Vision +8.9, Composure +5.9 | Composure -0.2, Acceleration -0.2 | değer/bütçe 0.98 (1); lig seviyesi ? (0); kulüpteki rol 14 (1); sözleşme ? (0) |
| 4 | Anthony Ralston | 27 | Celtic (Scottish Prem) | 2.0 M€ | Alınabilir (1) | Ball-Playing Defender (Build-Up) Build-Up | 79.5 | 89.2 | +16.2 | 79.5 | READY | Vision +9.7, ShortPassing +6.8, Composure +6.2 | Composure -0.2, ShortPassing -0.2 | değer/bütçe 0.98 (1); lig seviyesi ? (0); kulüpteki rol 23 (0); sözleşme ? (0) |
| 5 | Maxime Bernauer | 28 | AS Saint-Étienne (Ligue 2 BKT) | 2.4 M€ | Zor (3) | Ball-Playing Defender (Build-Up) Build-Up | 84.9 | 91.8 | +21.6 | 84.9 | READY | Vision +9.4, ShortPassing +9.2, LongPassing +7.6 | Acceleration -0.3, Composure -0.2 | değer/bütçe 1.20 (2); lig seviyesi ? (0); kulüpteki rol 8 (1); sözleşme ? (0) |
| 6 | Jaroslav Zelený | 34 | Sparta Praha (Erkekler - Diğer) | 1.9 M€ | Zor (2) | Ball-Playing Defender (Build-Up) Build-Up | 86.3 | 90.3 | +22.9 | 86.0 | READY | Vision +9.9, ShortPassing +9.2, Composure +7.6 | Acceleration -0.2, ShortPassing -0.1 | değer/bütçe 0.93 (1); lig seviyesi ? (0); kulüpteki rol 5 (1); sözleşme ? (0) |
| 7 | Iván Marcone | 36 | Independiente (LPF) | 0.9 M€ | Zor (4) | Ball-Playing Defender (Build-Up) Build-Up | 88.9 | 93.4 | +25.6 | 88.4 | READY | ShortPassing +9.7, Vision +9.7, Composure +7.8 | Acceleration -0.8, ShortPassing -0.1 | değer/bütçe 0.45 (0); lig seviyesi -2 (3); kulüpteki rol 7 (1); sözleşme ? (0) |
| 8 | Domagoj Vida | 37 | AEK Athens (Erkekler - Diğer) | 0.6 M€ | Alınabilir (0) | Defender (Balanced) Balanced | 84.0 | 95.0 | +20.7 | 83.2 | READY | DefAwareness +15.2, Heading +11.3, Anticipate +4.0 | Strength -0.4, StandingTackle -0.2 | değer/bütçe 0.30 (0); lig seviyesi ? (0); kulüpteki rol 20 (0); sözleşme ? (0) |
| 9 | Rubén Alcaraz | 35 | Granada CF (LALIGA HYPERMOTION) | 1.2 M€ | Zor (2) | Ball-Playing Defender (Build-Up) Build-Up | 86.7 | 93.2 | +23.4 | 86.3 | READY | Vision +9.6, ShortPassing +8.7, Composure +6.8 | Acceleration -1.6, Composure -0.2 | değer/bütçe 0.60 (0); lig seviyesi ? (0); kulüpteki rol 2 (2); sözleşme ? (0) |
| 10 | Kenan Toibibou | 21 | Cádiz CF (LALIGA HYPERMOTION) | 1.8 M€ | Alınabilir (1) | Ball-Playing Defender (Build-Up) Build-Up | 69.2 | 90.8 | +5.9 | 78.6 | YOUNG,READY | Vision +7.6, ShortPassing +7.5, LongPassing +5.9 | ball_playing_defender -1.0, Composure -0.9 | değer/bütçe 0.88 (1); lig seviyesi ? (0); kulüpteki rol 22 (0); sözleşme ? (0) |

_recall@10 (önskorlu 2000'lik havuz ↔ tüm kayıttaki oyuncuların tam puanı): 1.00 · tam puanlanan: 2528_

## ST

Mevcut: **Jesse Eugen Bisiwu** (currentFit 63.9, rol advanced_forward_versatile)

| # | Oyuncu | Yaş | Kulüp (lig) | Değer | Kova (puan) | Rol | currentFit | levelFit | Δ mevcut | futureFit | Etiket | En büyük artılar | Eksiler | Kova gerekçesi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Bruno Mota | 30 | Jeonbuk Hyundai (K League 1) | 1.2 M€ | Alınabilir (1) | Target Forward (Balanced) Balanced | 89.4 | 93.9 | +25.5 | 89.4 | READY | Heading +12.5, Strength +10.7, Jumping +8.5 | Heading -0.2, Strength -0.1 | değer/bütçe 0.58 (0); lig seviyesi ? (0); kulüpteki rol 7 (1); sözleşme ? (0) |
| 2 | Kevin Behrens | 35 | FC Lugano (Brack Super League) | 1.0 M€ | Alınabilir (1) | Target Forward (Balanced) Balanced | 92.7 | 92.4 | +28.8 | 91.5 | READY | Heading +16.0, Strength +10.0, Jumping +9.4 | Strength -0.1, Heading -0.1 | değer/bütçe 0.48 (0); lig seviyesi ? (0); kulüpteki rol 4 (1); sözleşme ? (0) |
| 3 | Gabriel Ávalos | 36 | Serbest (Serbest) | 2.8 M€ | Alınabilir (0) | Target Forward (Balanced) Balanced | 89.9 | 82.5 | +26.0 | 87.7 | FREE,READY | Heading +11.9, Strength +11.7, Jumping +7.8 | Heading -0.2, Jumping -0.1 | serbest evet (0) |
| 4 | Adnane Ghailan | 25 | Córdoba CF (LALIGA HYPERMOTION) | 1.3 M€ | Alınabilir (1) | False 9 (Build-Up) Build-Up | 83.4 | 96.9 | +19.5 | 84.9 | READY | Vision +11.3, ShortPassing +7.8, LongPassing +3.7 | ShortPassing -0.3, BallControl -0.3 | değer/bütçe 0.65 (1); lig seviyesi ? (0); kulüpteki rol 16 (0); sözleşme ? (0) |
| 5 | Tiago Orobó | 32 | Jeonbuk Hyundai (K League 1) | 0.9 M€ | Alınabilir (1) | Target Forward (Balanced) Balanced | 83.9 | 91.3 | +20.0 | 82.9 | READY | Heading +10.5, Strength +8.6, Jumping +7.8 | Heading -0.2, Strength -0.2 | değer/bütçe 0.46 (0); lig seviyesi ? (0); kulüpteki rol 7 (1); sözleşme ? (0) |
| 6 | Juan Fernando Quintero | 33 | Serbest (Serbest) | 4.2 M€ | Alınabilir (0) | False 9 (Build-Up) Build-Up | 82.4 | 63.8 | +18.5 | 82.4 | FREE | Vision +12.8, ShortPassing +10.2, BallControl +5.0 | ST -9.2, ShortPassing -0.2 | serbest evet (0) |
| 7 | Robert Žulj | 34 | Buriram United (Erkekler - Diğer) | 1.9 M€ | Zor (3) | False 9 (Build-Up) Build-Up | 89.1 | 92.6 | +25.2 | 89.1 | READY | Vision +11.9, ShortPassing +9.5, Composure +4.3 | LENGTHY -0.7, ShortPassing -0.2 | değer/bütçe 0.93 (1); lig seviyesi ? (0); kulüpteki rol 1 (2); sözleşme ? (0) |
| 8 | Kyle Wootton | 30 | Fredrikstad FK (Eliteserien) | 1.3 M€ | Zor (2) | Target Forward (Balanced) Balanced | 87.3 | 93.0 | +23.4 | 87.3 | READY | Heading +13.1, Strength +9.1, Jumping +7.8 | Strength -0.2, Heading -0.1 | değer/bütçe 0.65 (1); lig seviyesi ? (0); kulüpteki rol 4 (1); sözleşme ? (0) |
| 9 | Alexander Hofleitner | 26 | Grazer AK (Ö. Bundesliga) | 0.6 M€ | Alınabilir (1) | Target Forward (Balanced) Balanced | 80.7 | 94.7 | +16.8 | 80.7 | READY | Heading +11.9, Strength +11.1, Jumping +4.7 | Jumping -0.2, Heading -0.2 | değer/bütçe 0.28 (0); lig seviyesi -1 (1); kulüpteki rol 16 (0); sözleşme ? (0) |
| 10 | Wojciech Urbański | 21 | Legia Warszawa (PKO BP Ekstraklasa) | 2.4 M€ | Zor (3) | False 9 (Build-Up) Build-Up | 71.3 | 92.9 | +7.4 | 81.7 | YOUNG,READY | Vision +7.5, ShortPassing +5.6, LongPassing +3.3 | BallControl -0.5, ShortPassing -0.5 | değer/bütçe 1.20 (2); lig seviyesi -1 (1); kulüpteki rol 19 (0); sözleşme ? (0) |

_recall@10 (önskorlu 2000'lik havuz ↔ tüm kayıttaki oyuncuların tam puanı): 1.00 · tam puanlanan: 2989_

## CM

Mevcut: **Kieran Skinner** (currentFit 58.3, rol box_to_box_ball_winning)

| # | Oyuncu | Yaş | Kulüp (lig) | Değer | Kova (puan) | Rol | currentFit | levelFit | Δ mevcut | futureFit | Etiket | En büyük artılar | Eksiler | Kova gerekçesi |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Juan Fernando Quintero | 33 | Serbest (Serbest) | 4.2 M€ | Alınabilir (0) | Deep-Lying Playmaker (Build-Up) Build-Up | 87.4 | 91.7 | +29.1 | 87.4 | FREE,READY | Vision +12.8, LongPassing +9.2, Composure +9.1 | LongPassing -0.1, Composure -0.1 | serbest evet (0) |
| 2 | André Carrillo | 35 | Serbest (Serbest) | 3.6 M€ | Alınabilir (0) | Deep-Lying Playmaker (Build-Up) Build-Up | 85.7 | 85.5 | +27.4 | 85.7 | FREE,READY | LongPassing +10.9, Vision +8.4, Composure +8.1 | Vision -0.3, Composure -0.1 | serbest evet (0) |
| 3 | Mauricio | 25 | Serbest (Serbest) | 10.6 M€ | Alınabilir (0) | Playmaker (Attack) Attack | 81.7 | 75.1 | +23.4 | 83.4 | FREE,READY | Positioning +5.9, Vision +5.7, ShortPassing +5.6 | Vision -0.2, Composure -0.2 | serbest evet (0) |
| 4 | Isnik Alimi | 32 | Dalian Yingbo (CSL) | 1.1 M€ | Alınabilir (1) | Box-to-Box (Balanced) Balanced | 81.5 | 94.3 | +23.2 | 80.6 | READY | Stamina +24.5, Relentless +4.0, CONTROLLED +1.5 | Positioning -0.4, Stamina -0.1 | değer/bütçe 0.55 (0); lig seviyesi ? (0); kulüpteki rol 4 (1); sözleşme ? (0) |
| 5 | Éverton Ribeiro | 37 | Bahia (Libertadores) | 0.9 M€ | Alınabilir (1) | Deep-Lying Playmaker (Build-Up) Build-Up | 86.1 | 94.1 | +27.8 | 86.1 | READY | LongPassing +10.9, Vision +10.6, Composure +7.1 | Composure -0.2, Vision -0.2 | değer/bütçe 0.46 (0); lig seviyesi ? (0); kulüpteki rol 4 (1); sözleşme ? (0) |
| 6 | Oliver Berg | 33 | Brommapojkarna (Allsvenskan) | 0.5 M€ | Alınabilir (1) | Box-to-Box (Balanced) Balanced | 79.1 | 95.6 | +20.8 | 78.3 | READY | Stamina +25.3, Relentless +4.0, CONTROLLED +1.5 | LongPassing -1.2, ShortPassing -0.4 | değer/bütçe 0.26 (0); lig seviyesi ? (0); kulüpteki rol 4 (1); sözleşme ? (0) |
| 7 | Maël Corboz | 32 | Grenoble Foot 38 (Ligue 2 BKT) | 1.1 M€ | Zor (2) | Box-to-Box (Balanced) Balanced | 84.5 | 95.7 | +26.3 | 83.8 | READY | Stamina +26.8, Relentless +4.0, CONTROLLED +1.5 | Positioning -0.3, LongPassing -0.1 | değer/bütçe 0.55 (0); lig seviyesi ? (0); kulüpteki rol 2 (2); sözleşme ? (0) |
| 8 | Tamar Svetlin | 25 | AS Saint-Étienne (Ligue 2 BKT) | 2.3 M€ | Zor (3) | Box-to-Box (Balanced) Balanced | 83.6 | 94.3 | +25.4 | 85.3 | READY | Stamina +24.5, Relentless +4.0, CONTROLLED +1.5 | Positioning -0.3, Stamina -0.1 | değer/bütçe 1.15 (2); lig seviyesi ? (0); kulüpteki rol 8 (1); sözleşme ? (0) |
| 9 | Henrik Bjørdal | 29 | Viking FK (Eliteserien) | 2.0 M€ | Zor (2) | Box-to-Box (Balanced) Balanced | 83.9 | 95.0 | +25.6 | 83.9 | READY | Stamina +26.1, Relentless +4.0, CONTROLLED +1.5 | Positioning -0.4, Stamina -0.1 | değer/bütçe 0.98 (1); lig seviyesi ? (0); kulüpteki rol 10 (1); sözleşme ? (0) |
| 10 | Wilfred George Igor | 21 | Kristiansund BK (Eliteserien) | 2.2 M€ | Zor (4) | Box-to-Box (Balanced) Balanced | 70.1 | 92.3 | +11.8 | 79.5 | YOUNG,READY | Stamina +20.7, CONTROLLED +1.5, Dribbling +0.2 | Positioning -0.7, Vision -0.4 | değer/bütçe 1.10 (2); lig seviyesi ? (0); kulüpteki rol 3 (2); sözleşme ? (0) |

_recall@10 (önskorlu 2000'lik havuz ↔ tüm kayıttaki oyuncuların tam puanı): 1.00 · tam puanlanan: 3242_

## Süre (hat içi, HTTP hariç; 48 ölçüm, ısınma 2 tur)

p50 913 ms · p95 1295 ms · en yavaş 1372 ms · ortalama recall@10 1.000
