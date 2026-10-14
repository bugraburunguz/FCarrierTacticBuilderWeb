# E3-7b — kalibrasyon raporu

## 1. Negatif set: popüler meta formasyonlar, varsayılan roller, Balanced, hat 50, yalnız roller

Hedef: 0 uyarı ve 0 risk (bilgi serbest). `HealthyTacticsNoWarningsTest` bunu sabitler (önce kırmızı koştu).

| Formasyon | Önce (uyarı/risk) | Sonra uyarı | Sonra risk | Sonra bilgi |
|---|---|---|---|---|
| 4-3-3 | 0 | 0 | 0 | 0 |
| 4-2-3-1 | midfield_outnumbered | 0 | 0 | 0 |
| 4-2-1-3 | midfield_outnumbered | 0 | 0 | 0 |
| 3-5-2 | midfield_outnumbered | 0 | 0 | 0 |
| 4-1-2-1-2 | 0 | 0 | 0 | 0 |
| 4-4-2 | midfield_outnumbered, no_anchor | 0 | 0 | midfield_thin, no_anchor_info |
| 4-3-2-1 | no_anchor | 0 | 0 | no_anchor_info |
| 5-2-1-2 | midfield_outnumbered, no_anchor | 0 | 0 | no_anchor_info |

## 2. Beş örnek taktik: önce / sonra (bulgu sayısı: yalnız roller / oyunculu)

Önce = E3-7 raporu. Oyunculu = geçici katalog kariyerinin (aynı örnek kadro) ilk 11'i; seviye referansı katalog OVR bandının medyanıdır.

| Taktik | Önce (roller / oyunculu) | Sonra (roller / oyunculu) | Sonra: kodlar (oyunculu) |
|---|---|---|---|
| A | 3 / 3 | 2 / 2 | corridor_no_width, wing_gap_overlap |
| B | 1 / 1 | 0 / 0 | — |
| C | 0 / 3 | 0 / 1 | no_box_target |
| D | 2 / 3 | 2 / 2 | midfield_thin, no_anchor_info |
| E | 6 / 10 | 5 / 6 | rest_defence_low_high_line, no_box_target, striker_line_no_runner, wing_gap_overlap, no_anchor |

### Sonraki bulgular (kullanıcı metni ve sayısal kanıt)

**A — yalnız roller**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |

**A — oyunculu**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |

**B — yalnız roller**

_Bulgu yok._

**B — oyunculu**

_Bulgu yok._

**C — yalnız roller**

_Bulgu yok._

**C — oyunculu**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_box_target | uyarı | CROSS_VOLUME = 1.8 GTE 1.8<br>AERIAL_TARGET_QUALITY = 66.498 LT 68 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 66.5. |

**D — yalnız roller**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| midfield_thin | bilgi | CENTRAL_MIDFIELD_COUNT = 2 EQ 2 | Orta saha ince: merkezi orta saha oyuncusu 2; 3 ve üstü rahat sayılır. |
| no_anchor_info | bilgi | ANCHOR_COUNT = 0 EQ 0 | Perde yapan orta saha yok; savunma başka oyuncularla korunuyor. |

**D — oyunculu**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| midfield_thin | bilgi | CENTRAL_MIDFIELD_COUNT = 2 EQ 2 | Orta saha ince: merkezi orta saha oyuncusu 2; 3 ve üstü rahat sayılır. |
| no_anchor_info | bilgi | ANCHOR_COUNT = 0 EQ 0 | Perde yapan orta saha yok; savunma başka oyuncularla korunuyor. |

**E — yalnız roller**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| rest_defence_low_high_line | risk | REST_DEFENCE_COUNT = 2 LT 3<br>BAND_ORDINAL = 3 GTE 2 | Yüksek hatta (Aggressive) geri savunma zayıf: top kaybında geride kalan oyuncu 2; en az 3 olmalı. Kontra riski artar. |
| striker_line_no_runner | bilgi | STRIKER_RUNBEHIND_MAX = 0.15 LT 0.4 | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 (en az 0.4 beklenir). |
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 2 LT 4<br>FULLBACKS_DYFWD_MIN = 28 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

**E — oyunculu**

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| rest_defence_low_high_line | risk | REST_DEFENCE_COUNT = 2 LT 3<br>BAND_ORDINAL = 3 GTE 2 | Yüksek hatta (Aggressive) geri savunma zayıf: top kaybında geride kalan oyuncu 2; en az 3 olmalı. Kontra riski artar. |
| no_box_target | uyarı | CROSS_VOLUME = 3.2 GTE 1.8<br>AERIAL_TARGET_QUALITY = 65.187 LT 68 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 3.2) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 65.19. |
| striker_line_no_runner | bilgi | STRIKER_RUNBEHIND_MAX = 0.15 LT 0.4 | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 (en az 0.4 beklenir). |
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| wing_gap_overlap [RIGHT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 2 LT 4<br>FULLBACKS_DYFWD_MIN = 28 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

## 3. İki bağlam: aynı taktik, Crewe (EFL League Two) ve dev kulüp (Real Madrid)

Seviye referansı takımın kendi liginin aynı mevki medyanıdır. Aynı taktik ve aynı roller; oyuncular takımın kendi oyuncularıdır (mevkiye göre OVR sırasıyla). Kanıtta değer · referans · marj görünür.


Takımın oyuncuları mevkiye göre OVR sırasıyla yerleştirildi; seviye referansı takımın kendi liginin aynı mevki medyanıdır (kanıtta değer · referans · marj).

### Taktik A — 4-2-3-1 (2) · BALANCED · hat 55

#### Dev kulüp — Real Madrid (LALIGA EA SPORTS)

Referans: {CB_PACE_REF=65.5, BUILDUP_SAFETY_REF=61.8, AERIAL_REF=71.3}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | WARN | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |
| wing_gap_overlap [RIGHT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |

#### Alt lig — Crewe Alexandra (EFL League Two)

Referans: {CB_PACE_REF=62.0, BUILDUP_SAFETY_REF=48.3, AERIAL_REF=63.2}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | WARN | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |
| wing_gap_overlap [RIGHT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |

### Taktik C — 4-3-3 · COUNTER · hat 80

#### Dev kulüp — Real Madrid (LALIGA EA SPORTS)

Referans: {CB_PACE_REF=65.5, BUILDUP_SAFETY_REF=61.8, AERIAL_REF=71.3}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| no_box_target | WARN | CROSS_VOLUME = 1.8 GTE 1.8<br>AERIAL_TARGET_QUALITY = 60.5 LT 68.3 · referans 71.3 · marj 3 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 60.5 · LALIGA EA SPORTS hava hedefi medyanı 71.3 · marj 3. |

#### Alt lig — Crewe Alexandra (EFL League Two)

Referans: {CB_PACE_REF=62.0, BUILDUP_SAFETY_REF=48.3, AERIAL_REF=63.2}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| counter_risk | RISK | BAND_ORDINAL = 2 GTE 2<br>CB_PACE_AVG = 52.5 LT 59 · referans 62 · marj 3 | Kontra riski: hat yüksek (High) ve stoperlerin ortalama hızı 52.5 · EFL League Two stoper medyanı 62 · marj 3. |
| no_box_target | WARN | CROSS_VOLUME = 1.8 GTE 1.8<br>AERIAL_TARGET_QUALITY = 57.46 LT 60.2 · referans 63.2 · marj 3 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 1.8) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 57.46 · EFL League Two hava hedefi medyanı 63.2 · marj 3. |
| stamina_gap | WARN | STAMINA_GAP = 0.17 GT 0.08 | Dayanıklılık açığı: rollerin ve hattın istediği efor, oyuncuların dayanıklılığından 0.17 fazla (eşik 0.08). |

### Taktik E — 4-2-3-1 (2) · SHORT · hat 95

#### Dev kulüp — Real Madrid (LALIGA EA SPORTS)

Referans: {CB_PACE_REF=65.5, BUILDUP_SAFETY_REF=61.8, AERIAL_REF=71.3}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| rest_defence_low_high_line | RISK | REST_DEFENCE_COUNT = 2 LT 3<br>BAND_ORDINAL = 3 GTE 2 | Yüksek hatta (Aggressive) geri savunma zayıf: top kaybında geride kalan oyuncu 2; en az 3 olmalı. Kontra riski artar. |
| no_box_target | WARN | CROSS_VOLUME = 3.2 GTE 1.8<br>AERIAL_TARGET_QUALITY = 62.25 LT 68.3 · referans 71.3 · marj 3 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 3.2) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 62.25 · LALIGA EA SPORTS hava hedefi medyanı 71.3 · marj 3. |
| striker_line_no_runner | INFO | STRIKER_RUNBEHIND_MAX = 0.15 LT 0.4 | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 (en az 0.4 beklenir). |
| wing_gap_overlap [LEFT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| wing_gap_overlap [RIGHT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | WARN | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 2 LT 4<br>FULLBACKS_DYFWD_MIN = 28 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

#### Alt lig — Crewe Alexandra (EFL League Two)

Referans: {CB_PACE_REF=62.0, BUILDUP_SAFETY_REF=48.3, AERIAL_REF=63.2}

| Kod | Şiddet | Kanıt (değer işlem eşik · referans · marj) | Kullanıcı metni |
|---|---|---|---|
| rest_defence_low_high_line | RISK | REST_DEFENCE_COUNT = 2 LT 3<br>BAND_ORDINAL = 3 GTE 2 | Yüksek hatta (Aggressive) geri savunma zayıf: top kaybında geride kalan oyuncu 2; en az 3 olmalı. Kontra riski artar. |
| counter_risk | RISK | BAND_ORDINAL = 3 GTE 2<br>CB_PACE_AVG = 52.5 LT 59 · referans 62 · marj 3 | Kontra riski: hat yüksek (Aggressive) ve stoperlerin ortalama hızı 52.5 · EFL League Two stoper medyanı 62 · marj 3. |
| no_box_target | WARN | CROSS_VOLUME = 3.2 GTE 1.8<br>AERIAL_TARGET_QUALITY = 59.3 LT 60.2 · referans 63.2 · marj 3 | Ceza sahasında hedef yok: orta kanalı yüksek (orta eğilimi toplamı 3.2) ama hava hedeflerinin (kafa, sıçrama, boy) ortalaması 59.3 · EFL League Two hava hedefi medyanı 63.2 · marj 3. |
| stamina_gap | WARN | STAMINA_GAP = 0.25 GT 0.08 | Dayanıklılık açığı: rollerin ve hattın istediği efor, oyuncuların dayanıklılığından 0.25 fazla (eşik 0.08). |
| striker_line_no_runner | INFO | STRIKER_RUNBEHIND_MAX = 0.15 LT 0.4 | Forvet hattında arkaya koşan yok: forvetlerin en yüksek arkaya koşu eğilimi 0.15 (en az 0.4 beklenir). |
| wing_gap_overlap [LEFT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| wing_gap_overlap [RIGHT] | RISK | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sağ kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | WARN | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 2 LT 4<br>FULLBACKS_DYFWD_MIN = 28 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |


## Notlar
- Pas güvenliği referansı GK/CB/CDM oyuncularının medyanıdır; kaleciler dahil olduğu için sayı düşük görünür, kuralın ölçtüğü ortalama da aynı grubu (GK+CB+CDM) kapsar, tanım tutarlıdır.
- Dayanıklılık kuralı mutlak kalır (yorulma mutlaktır).
- Marjlar (3) ve asgari örnek (15) `verified:false`; referans için yeterli örnek yoksa kural mutlak eşiğe düşer.
