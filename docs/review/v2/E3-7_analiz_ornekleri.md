# E3-7 — analiz motoru: 5 örnek taktik

Motor: `POST /tactics/analysis` (7 metrik + `seed/tactic-rules.fc27.json` kuralları). **Etiket yok**: girdi formasyon, rol/focus, build-up, hat; her bulgu kodu, şiddeti, sayısal kanıtı (değer işlem eşik) ve önerisiyle gelir, metin yalnız bu sayılardan üretilir. Eşikler ve rol değerleri `verified:false` taslaktır.

Her taktik iki kez analiz edildi: **(a) yalnız roller** ve **(b) oyunculu**: geçici bir katalog kariyerinin kadrosundan `/fit/lineup` ile atanan oyuncular (oyuncu attribute'ları gerektiren kurallar yalnız (b)'de değerlendirilir; (a)'da "değerlendirilmedi" olarak listelenir). Oyuncular bu raporun örnek kadrosudur (gerçek kariyer değil).

## A. 4-2-3-1 (LM-CAM-RM) — örnek taktik (E3-7 tablosundaki)

Formasyon 4-2-3-1 (2) · build-up Balanced · hat 55 · roller: LB fullback_defend, RB attacking_wingback_attack, LDM holding_defend, RDM holding_defend, LM inside_forward_attack, CAM playmaker_balanced, RM winger_balanced, ST advanced_forward_attack

### (a) Yalnız roller

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 55 |
| Hücum / Savunma | Σr 4 · Σd 5.8 → hücum %40.8 |
| Genişlik | endeks 37 · sol 1 · sağ 2 |
| Uzunluk | topla 76 · topsuz 66 → 71 |
| Dayanıklılık | talep 0.56 · arz — · fark — |
| Build-Up | BALANCED · güvenlik — · gereken 68 · fark — |
| Geri savunma | 5 oyuncu (LB, LCB, RCB, LDM, RDM) |
| Fırsat · orta | hacim 1.8 |
| Fırsat · içe kat | hacim 1.1 |
| Fırsat · arkaya koşu | hacim 2.5 |
| Fırsat · uzaktan şut | hacim 0.9 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX(LEFT) = 0.9 ≥ 0.6<br>SIDE_FULLBACK_DYFWD_MAX(LEFT) = 2 ≤ 5 | Beki Wingback/Attacking Wingback yap ya da kanadı Winger yap. | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kat 0.9 ≥ 0.6) ve bek bindirmiyor (ileri kayma 2 ≤ 5). |
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX(RIGHT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(RIGHT) = 0.9 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(RIGHT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sağ kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.9 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |


Değerlendirilmedi (oyuncu gerekir): counter_risk, no_box_target, stamina_gap, buildup_mismatch

### (b) Oyunculu (11 slot)

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 55 |
| Hücum / Savunma | Σr 4 · Σd 5.8 → hücum %40.8 |
| Genişlik | endeks 37 · sol 1 · sağ 2 |
| Uzunluk | topla 76 · topsuz 66 → 71 |
| Dayanıklılık | talep 0.56 · arz 0.68 · fark -0.12 |
| Build-Up | BALANCED · güvenlik 57.5 · gereken 68 · fark -10.5 |
| Geri savunma | 5 oyuncu (LB, LCB, RCB, LDM, RDM) |
| Fırsat · orta | hacim 1.8 / kalite 40.1 / skor 0.7 |
| Fırsat · içe kat | hacim 1.1 / kalite 67.7 / skor 0.7 |
| Fırsat · arkaya koşu | hacim 2.5 / kalite 59 / skor 1.5 |
| Fırsat · uzaktan şut | hacim 0.9 / kalite 62.9 / skor 0.6 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX(LEFT) = 0.9 ≥ 0.6<br>SIDE_FULLBACK_DYFWD_MAX(LEFT) = 2 ≤ 5 | Beki Wingback/Attacking Wingback yap ya da kanadı Winger yap. | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kat 0.9 ≥ 0.6) ve bek bindirmiyor (ileri kayma 2 ≤ 5). |
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX(RIGHT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(RIGHT) = 0.9 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(RIGHT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sağ kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.9 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |


## B. 3-5-2 — kanat bekli (LM/RM = Wide Midfielder Support)

Formasyon 3-5-2 · build-up Balanced · hat 60 · roller: LM wide_midfielder_support, RM wide_midfielder_support, RDM deep_lying_playmaker_defend, CAM playmaker_attack, RST poacher_attack

### (a) Yalnız roller

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 60 |
| Hücum / Savunma | Σr 3.3 · Σd 6.2 → hücum %34.4 |
| Genişlik | endeks 34.4 · sol 1 · sağ 1 |
| Uzunluk | topla 76 · topsuz 66 → 71 |
| Dayanıklılık | talep 0.5 · arz — · fark — |
| Build-Up | BALANCED · güvenlik — · gereken 68 · fark — |
| Geri savunma | 7 oyuncu (LCB, CB, RCB, LM, LDM, RDM, RM) |
| Fırsat · orta | hacim 1 |
| Fırsat · içe kat | hacim 0.2 |
| Fırsat · arkaya koşu | hacim 2.1 |
| Fırsat · uzaktan şut | hacim 0.7 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |


Değerlendirilmedi (oyuncu gerekir): counter_risk, no_box_target, stamina_gap, buildup_mismatch

### (b) Oyunculu (11 slot)

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 60 |
| Hücum / Savunma | Σr 3.3 · Σd 6.2 → hücum %34.4 |
| Genişlik | endeks 34.4 · sol 1 · sağ 1 |
| Uzunluk | topla 76 · topsuz 66 → 71 |
| Dayanıklılık | talep 0.5 · arz 0.66 · fark -0.16 |
| Build-Up | BALANCED · güvenlik 59.1 · gereken 68 · fark -8.9 |
| Geri savunma | 7 oyuncu (LCB, CB, RCB, LM, LDM, RDM, RM) |
| Fırsat · orta | hacim 1 / kalite 38.2 / skor 0.4 |
| Fırsat · içe kat | hacim 0.2 / kalite 66 / skor 0.1 |
| Fırsat · arkaya koşu | hacim 2.1 / kalite 57.2 / skor 1.2 |
| Fırsat · uzaktan şut | hacim 0.7 / kalite 61.5 / skor 0.4 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |


## C. 4-3-3 — Counter, yüksek hat (80)

Formasyon 4-3-3 · build-up Counter · hat 80 · roller: LB attacking_wingback_attack, RB attacking_wingback_attack, LW inside_forward_attack, RW inside_forward_attack

### (a) Yalnız roller

| Metrik | Değer |
|---|---|
| Bant · hat | HIGH · 80 |
| Hücum / Savunma | Σr 5.8 · Σd 4.9 → hücum %54.2 |
| Genişlik | endeks 33.6 · sol 1 · sağ 1 |
| Uzunluk | topla 76 · topsuz 58 → 67 |
| Dayanıklılık | talep 0.79 · arz — · fark — |
| Build-Up | COUNTER · güvenlik — · gereken 62 · fark — |
| Geri savunma | 5 oyuncu (LCB, RCB, CDM, LCM, RCM) |
| Fırsat · orta | hacim 1.8 |
| Fırsat · içe kat | hacim 1.9 |
| Fırsat · arkaya koşu | hacim 3.6 |
| Fırsat · uzaktan şut | hacim 1.5 |

_Bulgu yok._


Değerlendirilmedi (oyuncu gerekir): counter_risk, no_box_target, stamina_gap, buildup_mismatch

### (b) Oyunculu (11 slot)

| Metrik | Değer |
|---|---|
| Bant · hat | HIGH · 80 |
| Hücum / Savunma | Σr 5.8 · Σd 4.9 → hücum %54.2 |
| Genişlik | endeks 33.6 · sol 1 · sağ 1 |
| Uzunluk | topla 76 · topsuz 58 → 67 |
| Dayanıklılık | talep 0.79 · arz 0.68 · fark 0.11 |
| Build-Up | COUNTER · güvenlik 55.5 · gereken 62 · fark -6.5 |
| Geri savunma | 5 oyuncu (LCB, RCB, CDM, LCM, RCM) |
| Fırsat · orta | hacim 1.8 / kalite 39.8 / skor 0.7 |
| Fırsat · içe kat | hacim 1.9 / kalite 66.7 / skor 1.3 |
| Fırsat · arkaya koşu | hacim 3.6 / kalite 54.6 / skor 1.9 |
| Fırsat · uzaktan şut | hacim 1.5 / kalite 62.3 / skor 0.9 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| counter_risk | risk | BAND_ORDINAL = 2 ≥ 2<br>CB_PACE_AVG = 62.75 < 66 | Hattı düşür ya da daha hızlı stoper(ler) kullan. | Kontra riski: hat yüksek (bant sırası 2 ≥ 2) ve stoperlerin ortalama hızı 62.75 < 66. |
| no_box_target | uyarı | CROSS_VOLUME = 1.8 ≥ 1.8<br>AERIAL_TARGET_QUALITY = 56.9 < 68 | Boylu/havada güçlü bir forvet (Target Forward) ekle ya da kanatları içe keset. | Ceza sahasında hedef yok: orta kanalı yüksek (orta hacmi 1.8 ≥ 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) kalitesi 56.9 < 68. |
| stamina_gap | uyarı | STAMINA_GAP = 0.11 > 0.08 | Hattı/baskıyı düşür, en yorucu rolleri (Box-to-Box, Attacking Wingback) hafiflet ya da rotasyon yap. | Dayanıklılık açığı: rollerin ve hattın istediği efor, oyuncuların Stamina'sını 0.11 (eşik 0.08) aşıyor. |


## D. 4-4-2 — düz (varsayılan roller)

Formasyon 4-4-2 · build-up Balanced · hat 50 · roller: formasyonun varsayılanları

### (a) Yalnız roller

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 50 |
| Hücum / Savunma | Σr 5 · Σd 5.2 → hücum %49 |
| Genişlik | endeks 47.6 · sol 2 · sağ 2 |
| Uzunluk | topla 74 · topsuz 64 → 69 |
| Dayanıklılık | talep 0.64 · arz — · fark — |
| Build-Up | BALANCED · güvenlik — · gereken 68 · fark — |
| Geri savunma | 6 oyuncu (LB, LCB, RCB, RB, LCM, RCM) |
| Fırsat · orta | hacim 2.2 |
| Fırsat · içe kat | hacim 0.2 |
| Fırsat · arkaya koşu | hacim 3.2 |
| Fırsat · uzaktan şut | hacim 1 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| no_anchor | uyarı | ANCHOR_COUNT = 0 = 0 | Bir CDM'yi Holding ya da Centre Half yap. | Çapa yok: savunma önünde perde yapan (savunma görevi ≥ 0,8) orta saha sayısı 0. |


Değerlendirilmedi (oyuncu gerekir): counter_risk, no_box_target, stamina_gap, buildup_mismatch

### (b) Oyunculu (11 slot)

| Metrik | Değer |
|---|---|
| Bant · hat | BALANCED · 50 |
| Hücum / Savunma | Σr 5 · Σd 5.2 → hücum %49 |
| Genişlik | endeks 47.6 · sol 2 · sağ 2 |
| Uzunluk | topla 74 · topsuz 64 → 69 |
| Dayanıklılık | talep 0.64 · arz 0.68 · fark -0.04 |
| Build-Up | BALANCED · güvenlik 56.4 · gereken 68 · fark -11.6 |
| Geri savunma | 6 oyuncu (LB, LCB, RCB, RB, LCM, RCM) |
| Fırsat · orta | hacim 2.2 / kalite 42.2 / skor 0.9 |
| Fırsat · içe kat | hacim 0.2 / kalite 65.3 / skor 0.1 |
| Fırsat · arkaya koşu | hacim 3.2 / kalite 56.4 / skor 1.8 |
| Fırsat · uzaktan şut | hacim 1 / kalite 62 / skor 0.6 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| no_box_target | uyarı | CROSS_VOLUME = 2.2 ≥ 1.8<br>AERIAL_TARGET_QUALITY = 59.8 < 68 | Boylu/havada güçlü bir forvet (Target Forward) ekle ya da kanatları içe keset. | Ceza sahasında hedef yok: orta kanalı yüksek (orta hacmi 2.2 ≥ 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) kalitesi 59.8 < 68. |
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| no_anchor | uyarı | ANCHOR_COUNT = 0 = 0 | Bir CDM'yi Holding ya da Centre Half yap. | Çapa yok: savunma önünde perde yapan (savunma görevi ≥ 0,8) orta saha sayısı 0. |


## E. 4-2-3-1 (LM-CAM-RM) — kötü kurulmuş: iki AWB + çapasız CDM çifti + False 9 + çok yüksek hat + Short

Formasyon 4-2-3-1 (2) · build-up Short · hat 95 · roller: LB attacking_wingback_attack, RB attacking_wingback_attack, LDM box_crasher_balanced, RDM box_crasher_balanced, LM winger_attack, RM winger_attack, CAM classic_10_attack, ST false_9_build_up

### (a) Yalnız roller

| Metrik | Değer |
|---|---|
| Bant · hat | AGGRESSIVE · 95 |
| Hücum / Savunma | Σr 5.7 · Σd 3.9 → hücum %59.3 |
| Genişlik | endeks 41.2 · sol 2 · sağ 2 |
| Uzunluk | topla 58 · topsuz 52 → 55 |
| Dayanıklılık | talep 0.88 · arz — · fark — |
| Build-Up | SHORT · güvenlik — · gereken 72 · fark — |
| Geri savunma | 2 oyuncu (LCB, RCB) |
| Fırsat · orta | hacim 3.2 |
| Fırsat · içe kat | hacim 0.6 |
| Fırsat · arkaya koşu | hacim 3.4 |
| Fırsat · uzaktan şut | hacim 1.5 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| rest_defence_low_high_line | risk | REST_DEFENCE_COUNT = 2 < 3<br>BAND_ORDINAL = 3 ≥ 2 | Hattı düşür ya da en az 3 oyuncuyu topun gerisinde tutan roller seç. | Yüksek hatta geri savunma zayıf: topun gerisinde kalan oyuncu 2 (eşik 3); hat High/Aggressive bandında (bant sırası 3 ≥ 2). Kontra riski artar. |
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| striker_line_no_runner | bilgi | STRIKER_RUNBEHIND_MAX = 0.15 < 0.4 | Bir forveti Advanced Forward yap ya da Shadow Striker ekle. | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 < 0.4. |
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX(LEFT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(LEFT) = 0.92 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(LEFT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sol kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.92 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX(RIGHT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(RIGHT) = 0.92 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(RIGHT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sağ kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.92 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |
| no_anchor | uyarı | ANCHOR_COUNT = 0 = 0 | Bir CDM'yi Holding ya da Centre Half yap. | Çapa yok: savunma önünde perde yapan (savunma görevi ≥ 0,8) orta saha sayısı 0. |


Değerlendirilmedi (oyuncu gerekir): counter_risk, no_box_target, stamina_gap, buildup_mismatch

### (b) Oyunculu (11 slot)

| Metrik | Değer |
|---|---|
| Bant · hat | AGGRESSIVE · 95 |
| Hücum / Savunma | Σr 5.7 · Σd 3.9 → hücum %59.3 |
| Genişlik | endeks 41.2 · sol 2 · sağ 2 |
| Uzunluk | topla 58 · topsuz 52 → 55 |
| Dayanıklılık | talep 0.88 · arz 0.64 · fark 0.24 |
| Build-Up | SHORT · güvenlik 60.5 · gereken 72 · fark -11.5 |
| Geri savunma | 2 oyuncu (LCB, RCB) |
| Fırsat · orta | hacim 3.2 / kalite 38 / skor 1.2 |
| Fırsat · içe kat | hacim 0.6 / kalite 68.3 / skor 0.4 |
| Fırsat · arkaya koşu | hacim 3.4 / kalite 56.6 / skor 1.9 |
| Fırsat · uzaktan şut | hacim 1.5 / kalite 61.5 / skor 0.9 |

| Kod | Şiddet | Kanıt (değer işlem eşik) | Öneri | Üretilen metin |
|---|---|---|---|---|
| rest_defence_low_high_line | risk | REST_DEFENCE_COUNT = 2 < 3<br>BAND_ORDINAL = 3 ≥ 2 | Hattı düşür ya da en az 3 oyuncuyu topun gerisinde tutan roller seç. | Yüksek hatta geri savunma zayıf: topun gerisinde kalan oyuncu 2 (eşik 3); hat High/Aggressive bandında (bant sırası 3 ≥ 2). Kontra riski artar. |
| counter_risk | risk | BAND_ORDINAL = 3 ≥ 2<br>CB_PACE_AVG = 62.75 < 66 | Hattı düşür ya da daha hızlı stoper(ler) kullan. | Kontra riski: hat yüksek (bant sırası 3 ≥ 2) ve stoperlerin ortalama hızı 62.75 < 66. |
| no_box_target | uyarı | CROSS_VOLUME = 3.2 ≥ 1.8<br>AERIAL_TARGET_QUALITY = 58.18 < 68 | Boylu/havada güçlü bir forvet (Target Forward) ekle ya da kanatları içe keset. | Ceza sahasında hedef yok: orta kanalı yüksek (orta hacmi 3.2 ≥ 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) kalitesi 58.18 < 68. |
| stamina_gap | uyarı | STAMINA_GAP = 0.24 > 0.08 | Hattı/baskıyı düşür, en yorucu rolleri (Box-to-Box, Attacking Wingback) hafiflet ya da rotasyon yap. | Dayanıklılık açığı: rollerin ve hattın istediği efor, oyuncuların Stamina'sını 0.24 (eşik 0.08) aşıyor. |
| buildup_mismatch | uyarı | BUILDUP_IS(SHORT) = 1 = 1<br>BUILDUP_SAFETY = 60.5 < 72 | Build-up'ı Balanced yap ya da pas güvenliği yüksek stoper/CDM kullan. | Build-up uyumsuz: Short Passing seçili ama kaleci/stoper/CDM pas güvenliği 60.5 < 72. |
| midfield_outnumbered | uyarı | MIDFIELD_COUNT = 2 < 3 | Bir orta sahayı merkezde tutan role çevir (Box-to-Box, Playmaker) ya da 3'lü orta saha formasyonuna geç. | Orta sahada sayısal azlık: topla merkezde (x 30-70, y 35-65) oyuncu 2 < 3. |
| striker_line_no_runner | bilgi | STRIKER_RUNBEHIND_MAX = 0.15 < 0.4 | Bir forveti Advanced Forward yap ya da Shadow Striker ekle. | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 < 0.4. |
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX(LEFT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(LEFT) = 0.92 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(LEFT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sol kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.92 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX(RIGHT) = 28 ≥ 20<br>SIDE_WINGER_W_MAX(RIGHT) = 0.92 ≥ 0.8<br>SIDE_DEF_DUTY_MAX(RIGHT) = 0.3 < 0.35 | Bek ya da kanattan birini savunma görevli role çevir (Fullback/Wingback Balanced ya da Wide Midfielder Defend). | sağ kanatta açık: bek bindiriyor (ileri kayma 28 ≥ 20), kanat oyuncusu çizgide (genişlik 0.92 ≥ 0.8) ve o tarafta savunma görevi en fazla 0.3 < 0.35. |
| no_anchor | uyarı | ANCHOR_COUNT = 0 = 0 | Bir CDM'yi Holding ya da Centre Half yap. | Çapa yok: savunma önünde perde yapan (savunma görevi ≥ 0,8) orta saha sayısı 0. |


## Özet

| Taktik | (a) bulgu | (b) bulgu | Kodlar (b) |
|---|---|---|---|
| A | 3 | 3 | corridor_no_width, midfield_outnumbered, wing_gap_overlap |
| B | 1 | 1 | midfield_outnumbered |
| C | 0 | 3 | counter_risk, no_box_target, stamina_gap |
| D | 2 | 3 | no_box_target, midfield_outnumbered, no_anchor |
| E | 6 | 10 | rest_defence_low_high_line, counter_risk, no_box_target, stamina_gap, buildup_mismatch, midfield_outnumbered, striker_line_no_runner, wing_gap_overlap, no_anchor |
