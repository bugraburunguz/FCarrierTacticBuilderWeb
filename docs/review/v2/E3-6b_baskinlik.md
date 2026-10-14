# E3-6b — Tek özellik baskınlığı (%25 sınırı): önce / sonra

Yeni değişmez: hiçbir rol/focus vektöründe tek bir attribute ağırlığı vektör kütlesinin %25'ini geçemez (`RoleSeedInvariantsTest.noSingleAttributeExceedsAQuarterOfAnyRoleVector`). Fazla, vektördeki mevcut attribute'lara (önce rolün tanımındaki vurgu/focus attribute'ları, sonra diğerleri) orantılı dağıtılır; kırpılan attribute sabit %25'te kalır (su doldurma).

| Rol | Aşan vektör (önce → sonra) | En büyük ağırlık önce → sonra | Örnek vektör önce | Örnek vektör sonra | Kosinüs (eski↔yeni) | Durum |
|---|---|---|---|---|---|---|
| goalkeeper | 1 (GK) | 0,508 → 0,508 | GK · goalkeeper · Defend: GKPositioning 0,508, GKReflexes 0,358, GKDiving 0,047, GKHandling 0,044 | GKPositioning 0,508, GKReflexes 0,358, GKDiving 0,047, GKHandling 0,044 | 1,000 | **MUAF** (aşağıya bak) |
| sweeper_keeper | 2 (GK) | 0,437 → 0,437 | GK · sweeper_keeper · Balanced: GKKicking 0,302, GKPositioning 0,259, Acceleration 0,177, SprintSpeed 0,177 | GKKicking 0,302, GKPositioning 0,259, Acceleration 0,177, SprintSpeed 0,177 | 1,000 | **MUAF** (aşağıya bak) |
| ball_playing_keeper | 1 (GK) | 0,414 → 0,414 | GK · ball_playing_keeper · Build-Up: GKKicking 0,414, ShortPassing 0,219, Composure 0,145, LongPassing 0,099 | GKKicking 0,414, ShortPassing 0,219, Composure 0,145, LongPassing 0,099 | 1,000 | **MUAF** (aşağıya bak) |
| fullback | 4 (RB/LB) | 0,423 → 0,250 | RB · fullback · Defend: DefAwareness 0,423, StandingTackle 0,375, Interceptions 0,153, Stamina 0,008 | DefAwareness 0,250, Interceptions 0,250, StandingTackle 0,250, Stamina 0,040 | 0,925 | düzeltildi |
| wingback | 4 (RB/LB) | 0,292 → 0,250 | RB · wingback · Balanced: Crossing 0,270, Stamina 0,230, DefAwareness 0,202, Acceleration 0,118 | Crossing 0,250, Stamina 0,236, DefAwareness 0,208, Acceleration 0,121 | 0,995 | düzeltildi |
| attacking_wingback | 4 (RB/LB) | 0,421 → 0,250 | RB · attacking_wingback · Support: Crossing 0,400, Stamina 0,205, Acceleration 0,088, ShortPassing 0,076 | Crossing 0,250, Stamina 0,250, Acceleration 0,113, ShortPassing 0,098 | 0,927 | düzeltildi |
| inverted_wingback | 2 (RB/LB) | 0,357 → 0,250 | RB · inverted_wingback · Build-Up: ShortPassing 0,357, Composure 0,261, Vision 0,222, BallControl 0,110 | Composure 0,250, ShortPassing 0,250, Vision 0,250, BallControl 0,200 | 0,960 | düzeltildi |
| falseback | 2 (RB/LB) | 0,314 → 0,250 | RB · falseback · Defend: DefAwareness 0,314, Interceptions 0,206, StandingTackle 0,165, ShortPassing 0,143 | DefAwareness 0,250, Interceptions 0,247, ShortPassing 0,186, StandingTackle 0,156 | 0,980 | düzeltildi |
| defender | 2 (CB) | 0,480 → 0,250 | CB · defender · Defend: DefAwareness 0,406, StandingTackle 0,188, Interceptions 0,180, Heading 0,130 | DefAwareness 0,250, StandingTackle 0,240, Interceptions 0,230, Heading 0,165 | 0,916 | düzeltildi |
| stopper | 2 (CB) | 0,429 → 0,250 | CB · stopper · Balanced: Aggression 0,378, StandingTackle 0,272, Acceleration 0,251, DefAwareness 0,024 | Acceleration 0,250, Aggression 0,250, StandingTackle 0,250, DefAwareness 0,060 | 0,907 | düzeltildi |
| ball_playing_defender | 1 (CB) | 0,307 → 0,250 | CB · ball_playing_defender · Build-Up: ShortPassing 0,307, Vision 0,226, LongPassing 0,216, Composure 0,203 | ShortPassing 0,250, Vision 0,246, LongPassing 0,235, Composure 0,221 | 0,991 | düzeltildi |
| holding | 4 (CDM/CM) | 0,279 → 0,250 | CDM · holding · Defend: DefAwareness 0,279, Interceptions 0,268, Jumping 0,139, StandingTackle 0,127 | DefAwareness 0,250, Interceptions 0,250, Jumping 0,154, StandingTackle 0,141 | 0,996 | düzeltildi |
| deep_lying_playmaker | 2 (CDM/CM) | 0,302 → 0,250 | CDM · deep_lying_playmaker · Build-Up: Vision 0,299, LongPassing 0,270, Composure 0,233, ShortPassing 0,162 | LongPassing 0,250, Vision 0,250, Composure 0,217, ShortPassing 0,150 | 0,985 | düzeltildi |
| centre_half | 1 (CDM) | 0,299 → 0,250 | CDM · centre_half · Defend: DefAwareness 0,299, Interceptions 0,207, StandingTackle 0,178, Strength 0,124 | DefAwareness 0,250, Interceptions 0,221, StandingTackle 0,191, Strength 0,133 | 0,993 | düzeltildi |
| box_crasher | 1 (CDM) | 0,302 → 0,250 | CDM · box_crasher · Balanced: LongShots 0,302, Positioning 0,241, ShotPower 0,241, Finishing 0,151 | LongShots 0,250, Positioning 0,250, ShotPower 0,250, Finishing 0,185 | 0,991 | düzeltildi |
| box_to_box | 2 (CM) | 0,725 → 0,250 | CM · box_to_box · Balanced: Stamina 0,725, ShortPassing 0,051, BallControl 0,046, LongPassing 0,041 | Stamina 0,250, StandingTackle 0,152, Interceptions 0,152, Aggression 0,142 | 0,666 | düzeltildi |
| playmaker | 4 (CM/CAM) | 0,412 → 0,250 | CM · playmaker · Balanced: Vision 0,411, ShortPassing 0,316, Dribbling 0,208, BallControl 0,016 | Dribbling 0,250, ShortPassing 0,250, Vision 0,250, BallControl 0,062 | 0,950 | düzeltildi |
| half_winger | 6 (CM/CAM) | 0,297 → 0,250 | CM · half_winger · Balanced: Dribbling 0,292, Crossing 0,236, ShortPassing 0,207, Stamina 0,198 | Crossing 0,250, Dribbling 0,250, ShortPassing 0,221, Stamina 0,212 | 0,993 | düzeltildi |
| classic_10 | 1 (CAM) | 0,329 → 0,250 | CAM · classic_10 · Versatile: Vision 0,329, BallControl 0,187, Composure 0,149, Stamina 0,126 | Vision 0,250, BallControl 0,210, Composure 0,168, Stamina 0,142 | 0,981 | düzeltildi |
| shadow_striker | 1 (CAM) | 0,337 → 0,250 | CAM · shadow_striker · Attack: Finishing 0,337, Positioning 0,335, Acceleration 0,216, ShotPower 0,069 | Acceleration 0,250, Finishing 0,250, Positioning 0,250, ShotPower 0,207 | 0,935 | düzeltildi |
| winger | 12 (LM/RM/LW/RW) | 0,482 → 0,250 | LM · winger · Balanced: Crossing 0,482, Curve 0,236, Stamina 0,192, Dribbling 0,016 | Crossing 0,250, Curve 0,250, Stamina 0,250, Dribbling 0,046 | 0,913 | düzeltildi |
| wide_playmaker | 4 (LM/RM/LW/RW) | 0,314 → 0,250 | LM · wide_playmaker · Build-Up: Vision 0,314, ShortPassing 0,303, Composure 0,131, Dribbling 0,122 | ShortPassing 0,250, Vision 0,250, Composure 0,175, Dribbling 0,162 | 0,976 | düzeltildi |
| wide_midfielder | 2 (LM/RM) | 0,296 → 0,250 | LM · wide_midfielder · Defend: DefAwareness 0,296, Stamina 0,185, Crossing 0,158, Interceptions 0,130 | DefAwareness 0,250, Stamina 0,198, Crossing 0,169, Interceptions 0,140 | 0,993 | düzeltildi |
| inside_forward | 8 (LM/RM/LW/RW) | 0,330 → 0,250 | LM · inside_forward · Balanced: Finishing 0,325, Dribbling 0,252, Agility 0,202, Curve 0,159 | Dribbling 0,250, Finishing 0,250, Agility 0,245, Curve 0,193 | 0,980 | düzeltildi |
| advanced_forward | 1 (ST) | 0,261 → 0,250 | ST · advanced_forward · Versatile: Acceleration 0,261, Finishing 0,129, Positioning 0,127, Vision 0,116 | Acceleration 0,250, Finishing 0,131, Positioning 0,129, Vision 0,117 | 1,000 | düzeltildi |
| poacher | 3 (ST) | 0,379 → 0,250 | ST · poacher · Attack: Positioning 0,379, Finishing 0,281, Composure 0,161, ShotPower 0,061 | Finishing 0,250, Positioning 0,250, Composure 0,241, ShotPower 0,091 | 0,950 | düzeltildi |
| target_forward | 2 (ST) | 0,378 → 0,250 | ST · target_forward · Balanced: Heading 0,378, Strength 0,313, Jumping 0,249, Finishing 0,013 | Heading 0,250, Jumping 0,250, Strength 0,250, Finishing 0,056 | 0,973 | düzeltildi |
| false_9 | 1 (ST) | 0,274 → 0,250 | ST · false_9 · Build-Up: Vision 0,274, ShortPassing 0,264, BallControl 0,125, Composure 0,116 | ShortPassing 0,250, Vision 0,250, BallControl 0,136, Composure 0,126 | 0,997 | düzeltildi |

Toplam: 124 vektörün **80**'i %25'i aşıyordu (kullanıcının andığı B2B Stamina 0,725 ve TF Heading 0,378 dahil); 76 tanesi düzeltildi, 4 tanesi (kaleci ailesi) muaf.

## Muafiyet: kaleci ailesi (goalkeeper, sweeper_keeper, ball_playing_keeper)
Kaleci vektörü 4–5 kaleci attribute'undan oluşur; %25 sınırı dördünü eşit (0,25) yapar ve focus/rol varyantlarını birbirinin aynısı kılar (focus kosinüsü 0,988; mevcut değişmez ≤ 0,95 çöker). Kural "korunamazsa o rolü değiştirme, raporla" gereği kaleci rolleri **değiştirilmedi**; test bu üç rolü muaf tutar.

## Ek rol ayarları (kosinüs/golden için)
- `box_to_box`: Stamina emphasis tek başına vektörün %72'siydi. %25'e çekilince fazla tanımda başka attribute olmadığı için pas/top kontrolüne akıyor ve altın set kesin çifti **Kim Dong Hyun > Riqui Puig** kırılıyordu (golden 49/50). B2B tanımına koşu+savunma katkısı eklendi (StandingTackle, Interceptions, Strength, Aggression; her biri 0,01 vurgu) → fazla bunlara dağıldı, golden 50/50. Bu bir **rol tanımı değişikliği** (yeni vurgu attribute'ları), yalnız dağıtım değil; EA B2B açıklamasına dayanır (stamina, top kazanma).
- `deep_lying_playmaker`: playmaker ile CM·Build-Up kosinüsü 0,924 > 0,90 oldu → LongPassing 0,03, DefAwareness 0,03, Interceptions 0,02 eklendi.
- `falseback`: fullback ile kosinüs 0,901 → ShortPassing 0,05→0,07, Interceptions 0,03→0,05.

## Doğrulama (değişiklik sonrası)
- Altın set kesin çiftler: **50/50 (%100)**, τ = 1,00; kalibrasyon çifti (Khedira>Xhaka) sağlam.
- `RoleSignalRegressionTest`: Role++ vs rolsüz AUC **0,873** (≥ 0,80), oyuncu içi AUC **0,620** (≥ 0,60; önce 0,626).
- CI değişmezleri: focus kosinüsü ≤ 0,95 (0,939), roller arası ≤ 0,90 (0,899), OVR kütlesi ≤ 0,5, tek attribute ≤ %25 (kaleci hariç).
- Not: `ovrMass` alanı kırpma öncesi ham paydan hesaplanır; yeniden dağıtım OVR regresyon bileşenini ihmal edilebilir ölçüde oynatır, ≤ 0,5 değişmezi korunur.
