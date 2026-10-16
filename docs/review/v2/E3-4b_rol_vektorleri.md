# E3-4b — Zayıf rol vektörleri: EA Role+/++ etiketlerinden öğrenme (RAPOR — seed'e YAZILMADI)

> Durum: yalnız rapor. Hiçbir seed dosyası değişmedi. Onayladığınız roller `_basis: "learned-ea-roles-holdout"` ile yazılır, sonra golden + özellik testleri yeniden koşar.

## Yöntem (özet)
- Hedef: oyuncu İÇİ sıralama (aynı oyuncunun aynı mevkideki Role+/++ rolleri, rolsüz rollerinden yüksek): pairwise lojistik kayıp; ölçüt aynı: oyuncu içi AUC (levelFit üzerinden, gerçek motor).
- Veri: LE dökümü, 21.619 oyuncu. Bölme: oyuncu kimliğine sabit karma (`RoleSplit.half`), 50/50; öğrenme **yalnız eğitim yarısında**; bu rapordaki "test" sayıları test yarısındandır (PlayStyle AÇIK, aşinalık KAPALI).
- Sabit: pozisyon tabanı (BASE_SHARE), focus deltaları (K_FOCUS×), EA OVR payı (0,2; vektör kütlesinde ≤ %50). Öğrenilen: yalnız rol vurgusu E_rol: ≥ 0, ≤ 8 aktif attribute, kütlesi eski kütlenin [0,25×, 4×] aralığında serbest (kütle sabit tutulunca kapasite çok düşüktü). CB/GK rollerinde hücum attribute'u yasak.
- Öğrenme sırayla, rol rol: bir rol öğrenilirken diğerleri sabit; küresel eğitim AUC'si iyileşmezse o rol eski vurgusuna döner (rapora "değişmedi"). λ=0.001 (eski vurguya yakınlık), 250 adım.
- Roller birbirinin negatifi olduğu için bir rolün değişimi başkalarının AUC'sini de oynatır; aşağıda hem rolün kendi anahtarları hem "yalnız bu rol değişirse" küresel test AUC'si verilir.

## Bulgular ve uyarılar (önce bunları okuyun)
1. **Kazanç küçük.** Gerçek motorla test yarısında oyuncu içi AUC **0,626 → 0,638** (hedef 0,70 uzakta); ≥0,70 anahtar 10 → 13 / 49. Öğrenici 20 zayıf rolün yalnız 11'inde eğitim AUC'sini iyileştirebildi, 9'unda (fullback, defender, holding, deep_lying_playmaker, centre_half, box_to_box, classic_10, winger, inside_forward, sweeper_keeper) iyileşme bulamadı → **dokunma**.
2. **Vekil ≠ gerçek motor.** Öğrenicinin kendi (çekirdek skor) test AUC'si ile gerçek motor (cezalar, PS, levelFit bandı) bazı rollerde ters düşüyor (ör. ball_playing_keeper vekilde 0,53→0,65, motorda 0,49→0,47). Bu yüzden onay kararı yalnız motor sütununa dayanmalı.
3. **Yüksek AUC kazancı olan roller futbol açısından akla yatkın DEĞİL:** advanced_forward en çok Penalties, Heading, Balance, Strength, SlidingTackle öğrendi (hız/bitiricilik düştü); wide_half Stamina+Crossing yerine DefAwareness, SlidingTackle, Jumping öğrendi ("wide" anlamı kayboldu). EA'nın bu rollere Role+ verme kuralı bizim attribute modelimizle örtüşmüyor ya da etiket başka bir girdiye (boy/kilo, PS, profil) bağlı; model eldeki attribute'larla en iyi ayırıcıyı buluyor, mantıklı olanı değil. Bu rolleri onaylamayı önermiyorum.
3b. İlk deneme forvete kaleci attribute'ları (GKPositioning, GKKicking…) öğretti: etiketlerin artefaktı. Alan kısıtı eklendi (saha rolünde GK attribute'u yok; kaleci rolünde yalnız kaleci + oyun kurma/refleks attribute'ları). Rapor kısıtlı sürümdür.
4. **Altın set:** goalkeeper adayı 2/5 kesin çifti kırıyor; wingback ve advanced_forward kosinüs/değişmez ihlali veriyor → bunlar değiştirilmemeli. Tüm roller birlikte uygulanırsa golden 2 kırık (yalnız goalkeeper kaynaklı).
5. **Aşırı uyum işareti** (eğitim−test > 0,05): yalnız sweeper_keeper (öğrenilmediği için pratikte geçersiz); diğerlerinde fark ≤ 0,05 (stopper 0,044 sınırda).
6. **Yapısal sınır:** EA, varsayılan rolleri (GK goalkeeper, ST advanced_forward, winger, fullback) jenerik profillere veriyor; bu roller için etiket "iyi uyum"u değil "varsayılan atama"yı yansıtıyor, hedef en çok bu rollerde gürültülü. Motor bu rolleri iyileştirmek yerine, etiketi zayıf bilgi sayıp mevcut vektörleri korumak daha güvenli görünüyor.
7. **Öneri: hiçbirini olduğu gibi onaylamamanız.** AUC'si artan diğer üç aday da futbol okumasıyla çelişiyor: poacher Jumping'i 0,30 ile en büyük ikinci ağırlık yapıyor (kafa golcüsü gibi), stopper Heading 0,48 ile tek boyutlu, inverted_wingback pas/oyun kurma yerine SlidingTackle ve Crossing öğreniyor. Yani etiketlerden öğrenilen sinyal, rol tanımlarını değil EA'nın atama kuralının yan ürünlerini yakalıyor. Daha güvenli yol: öğrenmeyi kısıtlı bir aday kümeyle (rol tanımına uygun 10–12 attribute) yeniden koşturmak ya da etiketi yalnız Role++ ile sınırlamak (E3-5b: Role++ ayrımı 0,84 AUC, yani etiketin yüksek güvenli kısmı zaten iyi). Karar sizde; seed'e hiçbir şey yazılmadı.

## Genel tablo

| Ölçüt | Önce | Sonra (tüm öğrenilen roller birlikte) |
|---|---|---|
| Oyuncu içi AUC, çift-ağırlıklı, **test yarısı** | 0,626 | 0,638 |
| Oyuncu içi AUC, eğitim yarısı | 0,626 | 0,640 |
| Test AUC ≥ 0,70 olan (mevki·rol) anahtarı | 10 / 49 | 13 / 49 |
| Test AUC < 0,65 olan anahtar | 27 | 22 |
| Altın set kesin çiftleri (tüm öğrenilen roller birlikte) | %100 (51/51 + kalibrasyon) | 2 kırık |

## Özet tablo (rol başına)

| Rol | Durum | Test AUC önce → sonra (rolün kendi anahtarları, ort.) | Yalnız bu rol değişirse küresel test AUC | Eğitim−test farkı | Golden | Değişmez | Öneri |
|---|---|---|---|---|---|---|---|
| goalkeeper | öğrenildi (5 attr) | 0,531 → 0,524 | 0,626 → 0,626 | -0,013 | KIRIK 2/5 | ok | DEĞİŞTİRME (golden/değişmez) |
| sweeper_keeper | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| ball_playing_keeper | öğrenildi (8 attr) | 0,488 → 0,470 | 0,626 → 0,626 | 0,005 | altın sette bu rol yok | ok | kazanç küçük |
| fullback | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| wingback | öğrenildi (8 attr) | 0,533 → 0,518 | 0,626 → 0,625 | 0,006 | %100 (1/1) | İHLAL (2) | DEĞİŞTİRME (golden/değişmez) |
| inverted_wingback | öğrenildi (8 attr) | 0,559 → 0,627 | 0,626 → 0,625 | -0,004 | altın sette bu rol yok | ok | onaya aday |
| defender | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| stopper | öğrenildi (7 attr) | 0,548 → 0,588 | 0,626 → 0,626 | 0,044 | altın sette bu rol yok | ok | onaya aday |
| holding | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| deep_lying_playmaker | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| centre_half | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| wide_half | öğrenildi (8 attr) | 0,630 → 0,737 | 0,626 → 0,629 | 0,009 | altın sette bu rol yok | ok | onaya aday |
| box_to_box | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| half_winger | öğrenildi (8 attr) | 0,687 → 0,679 | 0,626 → 0,629 | -0,020 | altın sette bu rol yok | ok | kazanç küçük |
| classic_10 | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| winger | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| wide_playmaker | öğrenildi (8 attr) | 0,654 → 0,673 | 0,626 → 0,630 | -0,030 | altın sette bu rol yok | ok | kazanç küçük |
| inside_forward | değişmedi (eğitim AUC iyileşmedi) | — | — | — | — | — | dokunma |
| advanced_forward | öğrenildi (7 attr) | 0,478 → 0,543 | 0,626 → 0,629 | 0,005 | altın sette bu rol yok | İHLAL (1) | DEĞİŞTİRME (golden/değişmez) |
| poacher | öğrenildi (8 attr) | 0,600 → 0,666 | 0,626 → 0,626 | 0,032 | %100 (3/3) | ok | onaya aday |

## Rol rol ayrıntı

### goalkeeper

- **Eski vurgu E:** (boş)
- **Yeni vurgu E:** Composure 0,072, Agility 0,071, ShortPassing 0,049, LongPassing 0,035, Strength 0,006
- **Eski vektör** (GK|goalkeeper|Balanced): GKReflexes 0,224, GKDiving 0,203, GKPositioning 0,202, GKHandling 0,181, GKKicking 0,088, Reactions 0,050, Acceleration 0,026, SprintSpeed 0,026
- **Yeni vektör** (GK|goalkeeper|Balanced): Composure 0,284, Agility 0,279, ShortPassing 0,192, LongPassing 0,138, Strength 0,022, GKReflexes 0,018, GKDiving 0,017, GKPositioning 0,017

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| GK · goalkeeper | 0,531 | 0,524 | 0,524 | 0,511 | 1763 |

- **Golden:** KIRIK 2/5 · Goalkeeper · Defend: Marco Carnesecchi > Colin Coosemans; Kariyer (Crewe) Goalkeeper · Defend: Keisuke Osako > Ian Lawlor
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Fanney Birkisdóttir (GK · goalkeeper) 16,6 → 96,3; Mallardi (GK · goalkeeper) 13,8 → 92,5; Jana Xin (GK · goalkeeper) 78,0 → 4,9
- **Okuma:** Composure + Agility + ShortPassing ağırlığı arttı.

### sweeper_keeper

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): GK 0,510.

### ball_playing_keeper

- **Eski vurgu E:** GKKicking 0,080, ShortPassing 0,060, LongPassing 0,040, Composure 0,030, Vision 0,030
- **Yeni vurgu E:** GKKicking 0,061, GKPositioning 0,051, Reactions 0,050, GKReflexes 0,034, Vision 0,027, GKDiving 0,026, Jumping 0,018, LongPassing 0,010
- **Eski vektör** (GK|ball_playing_keeper|Build-Up): GKKicking 0,414, ShortPassing 0,219, Composure 0,145, LongPassing 0,099, Vision 0,074, GKReflexes 0,012, GKDiving 0,011, GKPositioning 0,011
- **Yeni vektör** (GK|ball_playing_keeper|Build-Up): GKKicking 0,336, GKPositioning 0,126, Reactions 0,117, GKReflexes 0,088, GKDiving 0,070, Composure 0,065, ShortPassing 0,065, Vision 0,061

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| GK · ball_playing_keeper | 0,488 | 0,470 | 0,464 | 0,475 | 496 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Mallardi (GK · ball_playing_keeper) 67,4 → 14,6; Fanney Birkisdóttir (GK · ball_playing_keeper) 80,1 → 35,8; Saga Andersson (GK · ball_playing_keeper) 80,8 → 37,8
- **Okuma:** GKPositioning + Reactions + GKReflexes ağırlığı arttı; ShortPassing, Composure, LongPassing düştü.

### fullback

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): RB 0,702, LB 0,724.

### wingback

- **Eski vurgu E:** Crossing 0,050, Stamina 0,050, Acceleration 0,040, DefAwareness 0,040, StandingTackle 0,030, Interceptions 0,020
- **Yeni vurgu E:** Crossing 0,078, Interceptions 0,064, BallControl 0,054, Positioning 0,049, FKAccuracy 0,044, DefAwareness 0,031, LongShots 0,025, StandingTackle 0,014
- **Eski vektör** (RB|wingback|Balanced): Crossing 0,270, Stamina 0,230, DefAwareness 0,202, Acceleration 0,118, StandingTackle 0,093, Interceptions 0,063, SlidingTackle 0,006, ShortPassing 0,005
- **Yeni vektör** (RB|wingback|Balanced): Crossing 0,256, Interceptions 0,138, DefAwareness 0,128, BallControl 0,113, Positioning 0,103, FKAccuracy 0,091, Stamina 0,064, LongShots 0,052

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| RB · wingback | 0,538 | 0,511 | 0,524 | 0,524 | 1849 |
| LB · wingback | 0,528 | 0,525 | 0,527 | 0,524 | 1951 |

- **Golden:** %100 (1/1)
- **Değişmezler:** focus kosinüsü RB|wingback 0.951 > 0,95; focus kosinüsü LB|wingback 0.951 > 0,95
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Séamus Coleman (RB · wingback) 24,5 → 86,7; Jonas Damasto (LB · wingback) 92,9 → 32,6; Zhang Chengdong (RB · wingback) 24,3 → 82,2
- **Okuma:** BallControl + Positioning + Interceptions ağırlığı arttı; Stamina, Acceleration, StandingTackle düştü.

### inverted_wingback

- **Eski vurgu E:** ShortPassing 0,060, BallControl 0,040, Composure 0,040, Vision 0,040
- **Yeni vurgu E:** SlidingTackle 0,052, Crossing 0,047, Balance 0,038, Dribbling 0,024, ShortPassing 0,022, DefAwareness 0,021, Stamina 0,017, StandingTackle 0,012
- **Eski vektör** (RB|inverted_wingback|Build-Up): ShortPassing 0,357, Composure 0,261, Vision 0,222, BallControl 0,110, StandingTackle 0,007, DefAwareness 0,006, Stamina 0,006, SlidingTackle 0,005
- **Yeni vektör** (RB|inverted_wingback|Build-Up): ShortPassing 0,224, Composure 0,134, SlidingTackle 0,127, Crossing 0,116, Vision 0,101, Balance 0,088, Dribbling 0,056, DefAwareness 0,055

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| RB · inverted_wingback | 0,537 | 0,619 | 0,522 | 0,589 | 270 |
| LB · inverted_wingback | 0,582 | 0,636 | 0,580 | 0,658 | 220 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Bryan Gil (LB · inverted_wingback) 80,8 → 10,6; Bryan Gil (RB · inverted_wingback) 85,4 → 20,8; Sabahattin Destici (LB · inverted_wingback) 8,1 → 72,3
- **Okuma:** SlidingTackle + Crossing + Balance ağırlığı arttı; BallControl, Composure, Vision düştü.

### defender

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CB 0,564.

### stopper

- **Eski vurgu E:** Aggression 0,060, Acceleration 0,040, StandingTackle 0,040
- **Yeni vurgu E:** Heading 0,049, Jumping 0,014, Stamina 0,006, Strength 0,006, Aggression 0,004, Composure 0,003, Reactions 0,002
- **Eski vektör** (CB|stopper|Balanced): Aggression 0,378, StandingTackle 0,272, Acceleration 0,251, DefAwareness 0,024, Strength 0,016, Heading 0,014, SlidingTackle 0,012, Interceptions 0,012
- **Yeni vektör** (CB|stopper|Balanced): Heading 0,478, Jumping 0,131, Strength 0,082, Stamina 0,061, Aggression 0,048, Reactions 0,037, StandingTackle 0,037, DefAwareness 0,036

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| CB · stopper | 0,548 | 0,588 | 0,554 | 0,631 | 1070 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Anthony Markanich Jr (CB · stopper) 9,6 → 90,1; Erik Lira (CB · stopper) 88,7 → 12,6; Théo Brusco (CB · stopper) 6,5 → 80,9
- **Okuma:** Heading + Jumping + Stamina ağırlığı arttı; Aggression, Acceleration, StandingTackle düştü.

### holding

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CDM 0,662, CM 0,644.

### deep_lying_playmaker

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CDM 0,735, CM 0,633.

### centre_half

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CDM 0,499.

### wide_half

- **Eski vurgu E:** Crossing 0,060, Stamina 0,060, SprintSpeed 0,030
- **Yeni vurgu E:** DefAwareness 0,105, SlidingTackle 0,098, Jumping 0,094, StandingTackle 0,039, Strength 0,038, Heading 0,028, Interceptions 0,024, SprintSpeed 0,017
- **Eski vektör** (CDM|wide_half|Defend): Stamina 0,187, DefAwareness 0,183, Crossing 0,183, Interceptions 0,140, StandingTackle 0,138, SprintSpeed 0,091, Strength 0,048, ShortPassing 0,009
- **Yeni vektör** (CDM|wide_half|Defend): DefAwareness 0,266, SlidingTackle 0,158, Jumping 0,151, StandingTackle 0,137, Interceptions 0,113, Strength 0,086, Heading 0,045, SprintSpeed 0,028

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| CDM · wide_half | 0,630 | 0,737 | 0,670 | 0,746 | 1250 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Sebastian Szymański (CDM · wide_half) 88,1 → 6,5; Florin Tănase (CDM · wide_half) 86,1 → 4,7; Gastón Lódico (CDM · wide_half) 86,6 → 6,4
- **Okuma:** DefAwareness + SlidingTackle + Jumping ağırlığı arttı; Crossing, Stamina, SprintSpeed düştü.

### box_to_box

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CM 0,519.

### half_winger

- **Eski vurgu E:** Dribbling 0,060, Crossing 0,050, ShortPassing 0,040, Stamina 0,040
- **Yeni vurgu E:** Crossing 0,136, Stamina 0,034, Acceleration 0,033, StandingTackle 0,031, SprintSpeed 0,029, Interceptions 0,019, Positioning 0,016, Agility 0,011
- **Eski vektör** (CM|half_winger|Balanced): Dribbling 0,292, Crossing 0,236, ShortPassing 0,207, Stamina 0,198, BallControl 0,015, LongPassing 0,014, Vision 0,014, Reactions 0,010
- **Yeni vektör** (CM|half_winger|Balanced): Crossing 0,412, Stamina 0,109, Acceleration 0,100, StandingTackle 0,097, SprintSpeed 0,088, Interceptions 0,059, Positioning 0,050, Agility 0,032

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| CM · half_winger | 0,692 | 0,703 | 0,681 | 0,696 | 1906 |
| CAM · half_winger | 0,683 | 0,654 | 0,645 | 0,621 | 1052 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Tomás O'Connor (CM · half_winger) 78,3 → 19,0; Tomás O'Connor (CAM · half_winger) 78,4 → 22,1; Andrej Kramarić (CAM · half_winger) 74,3 → 19,9
- **Okuma:** Crossing + Acceleration + StandingTackle ağırlığı arttı; Dribbling, ShortPassing, Stamina düştü.

### classic_10

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): CAM 0,693.

### winger

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): LM 0,604, RM 0,598, LW 0,579, RW 0,566.

### wide_playmaker

- **Eski vurgu E:** Vision 0,080, ShortPassing 0,060, Dribbling 0,050
- **Yeni vurgu E:** LongPassing 0,131, Vision 0,091, Agility 0,073, Dribbling 0,067, Curve 0,066, Balance 0,066, LongShots 0,026, Finishing 0,009
- **Eski vektör** (LM|wide_playmaker|Attack): Vision 0,211, ShortPassing 0,162, Finishing 0,154, Positioning 0,153, Dribbling 0,140, Acceleration 0,079, ShotPower 0,075, BallControl 0,008
- **Yeni vektör** (LM|wide_playmaker|Attack): LongPassing 0,183, Vision 0,127, Agility 0,102, Dribbling 0,097, Finishing 0,094, Curve 0,092, Balance 0,091, Positioning 0,081

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| LM · wide_playmaker | 0,640 | 0,659 | 0,646 | 0,614 | 636 |
| RM · wide_playmaker | 0,664 | 0,677 | 0,629 | 0,634 | 569 |
| LW · wide_playmaker | 0,646 | 0,676 | 0,657 | 0,657 | 364 |
| RW · wide_playmaker | 0,666 | 0,681 | 0,647 | 0,667 | 326 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Ilyas Ansah (LW · wide_playmaker) 84,4 → 24,2; Fabri Arnoia (RW · wide_playmaker) 74,4 → 20,1; Musa Barrow (LW · wide_playmaker) 72,4 → 18,3
- **Okuma:** LongPassing + Agility + Curve ağırlığı arttı; ShortPassing düştü.

### inside_forward

Öğrenici eğitim yarısında iyileşme bulamadı; eski vurgu korunuyor. Rolün test AUC'si (mevcut): LM 0,636, RM 0,599, LW 0,580, RW 0,557.

### advanced_forward

- **Eski vurgu E:** Acceleration 0,080, Finishing 0,050, Positioning 0,050, Dribbling 0,040, SprintSpeed 0,030, Vision 0,020
- **Yeni vurgu E:** Penalties 0,176, Heading 0,160, Balance 0,087, Strength 0,082, SlidingTackle 0,067, Interceptions 0,054, SprintSpeed 0,029
- **Eski vektör** (ST|advanced_forward|Attack): Finishing 0,241, Positioning 0,239, Acceleration 0,237, Dribbling 0,088, SprintSpeed 0,067, ShotPower 0,066, Vision 0,043, BallControl 0,005
- **Yeni vektör** (ST|advanced_forward|Attack): Penalties 0,208, Heading 0,190, Balance 0,102, Strength 0,097, SlidingTackle 0,080, Finishing 0,073, Positioning 0,071, Interceptions 0,064

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| ST · advanced_forward | 0,478 | 0,543 | 0,480 | 0,548 | 2774 |

- **Golden:** altın sette bu rol yok
- **Değişmezler:** focus kosinüsü ST|advanced_forward 0.954 > 0,95
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Cristhian Stuani (ST · advanced_forward) 7,2 → 92,9; Christian Conteh (ST · advanced_forward) 89,1 → 5,7; Rodolfo Pittaça (ST · advanced_forward) 8,4 → 91,3
- **Okuma:** Penalties + Heading + Balance ağırlığı arttı; Acceleration, Finishing, Positioning düştü.

### poacher

- **Eski vurgu E:** Positioning 0,130, Composure 0,080, Finishing 0,080, Volleys 0,020
- **Yeni vurgu E:** Jumping 0,146, Positioning 0,072, Composure 0,024, Vision 0,021, Volleys 0,014, ShotPower 0,011, Crossing 0,010, Agility 0,002
- **Eski vektör** (ST|poacher|Attack): Positioning 0,379, Finishing 0,281, Composure 0,161, ShotPower 0,061, Acceleration 0,059, Volleys 0,040, BallControl 0,005, Reactions 0,004
- **Yeni vektör** (ST|poacher|Attack): Jumping 0,297, Positioning 0,268, Finishing 0,125, ShotPower 0,085, Acceleration 0,060, Composure 0,051, Vision 0,043, Volleys 0,028

| Mevki·rol | Test AUC önce | sonra | Eğitim AUC önce | sonra | Test çifti |
|---|---|---|---|---|---|
| ST · poacher | 0,600 | 0,666 | 0,600 | 0,698 | 1244 |

- **Golden:** %100 (3/3)
- **Değişmezler:** focus ≤ 0,95 ve roller arası ≤ 0,90 sağlanıyor
- **En çok değişen 3 oyuncu (test yarısı, OVR ≥ 55; levelFit önce → sonra):** Alejandro Gómez (ST · poacher) 77,6 → 8,1; Aron Sasu (ST · poacher) 22,2 → 91,1; Ángel Di María (ST · poacher) 76,0 → 8,4
- **Okuma:** Jumping + Vision + ShotPower ağırlığı arttı; Finishing, Positioning, Composure düştü.

