# E3-7 — `role-movement.fc27.json` tablosu (onay bekliyor; motor koduna BAĞLANMADI)

Alanlar: dxIn · dyFwd (birim) | w · r · d · p · s | cross · cutIn · runBehind · longShot (0-1). Hepsi `verified:false`; `_basis`: EA rol açıklaması + futbol okuması, **oyun içi gözlem yok**. 72 satır (roles.json'daki rol × focus kombinasyonlarının tamamı).

## Kaleci (5)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Goalkeeper · Defend | GK | 0 | 0 | 0 | 0 | 1 | 0.05 | 0.1 | 0 | 0 | 0 | 0 |
| Goalkeeper · Balanced | GK | 0 | 1 | 0 | 0 | 0.98 | 0.08 | 0.12 | 0 | 0 | 0 | 0 |
| Sweeper Keeper · Balanced | GK | 0 | 4 | 0 | 0 | 0.92 | 0.15 | 0.2 | 0 | 0 | 0 | 0 |
| Sweeper Keeper · Build-Up | GK | 0 | 3 | 0 | 0 | 0.9 | 0.12 | 0.2 | 0 | 0 | 0 | 0 |
| Ball-Playing Keeper · Build-Up | GK | 0 | 2 | 0 | 0 | 0.92 | 0.08 | 0.15 | 0 | 0 | 0 | 0 |

## Bek (11)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fullback · Defend | RB/LB | 1 | 2 | 0.8 | 0.15 | 0.9 | 0.45 | 0.45 | 0.1 | 0 | 0.05 | 0.02 |
| Fullback · Balanced | RB/LB | 2 | 8 | 0.75 | 0.3 | 0.75 | 0.45 | 0.55 | 0.3 | 0 | 0.1 | 0.05 |
| Fullback · Versatile | RB/LB | 4 | 10 | 0.65 | 0.35 | 0.7 | 0.45 | 0.6 | 0.3 | 0.05 | 0.12 | 0.05 |
| Wingback · Balanced | RB/LB | 0 | 18 | 0.9 | 0.55 | 0.55 | 0.5 | 0.75 | 0.5 | 0.05 | 0.35 | 0.05 |
| Wingback · Support | RB/LB | 0 | 14 | 0.9 | 0.45 | 0.6 | 0.5 | 0.7 | 0.45 | 0.05 | 0.25 | 0.05 |
| Attacking Wingback · Support | RB/LB | 0 | 22 | 0.95 | 0.75 | 0.4 | 0.55 | 0.9 | 0.65 | 0.05 | 0.45 | 0.05 |
| Attacking Wingback · Attack | RB/LB | 0 | 28 | 1 | 0.9 | 0.3 | 0.55 | 0.95 | 0.75 | 0.05 | 0.6 | 0.05 |
| Inverted Wingback · Build-Up | RB/LB | 14 | 8 | 0.25 | 0.25 | 0.65 | 0.45 | 0.55 | 0.05 | 0.25 | 0.05 | 0.05 |
| Inverted Wingback · Attack | RB/LB | 14 | 14 | 0.25 | 0.4 | 0.55 | 0.45 | 0.65 | 0.05 | 0.35 | 0.15 | 0.1 |
| Falseback · Defend | RB/LB | 12 | 0 | 0.3 | 0.05 | 0.92 | 0.4 | 0.35 | 0 | 0 | 0 | 0 |
| Falseback · Balanced | RB/LB | 12 | 3 | 0.3 | 0.1 | 0.85 | 0.4 | 0.4 | 0.05 | 0 | 0 | 0 |

## Stoper (10)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Defender · Defend | CB | 0 | 0 | 0.1 | 0.05 | 0.95 | 0.35 | 0.35 | 0 | 0 | 0 | 0 |
| Defender · Balanced | CB | 0 | 2 | 0.1 | 0.08 | 0.9 | 0.4 | 0.4 | 0 | 0 | 0 | 0 |
| Stopper · Balanced | CB | 0 | 4 | 0.1 | 0.1 | 0.85 | 0.6 | 0.5 | 0 | 0 | 0 | 0 |
| Stopper · Aggressive | CB | 0 | 6 | 0.1 | 0.12 | 0.8 | 0.75 | 0.55 | 0 | 0 | 0 | 0 |
| Ball-Playing Defender · Defend | CB | 0 | 1 | 0.1 | 0.05 | 0.93 | 0.35 | 0.35 | 0 | 0 | 0 | 0 |
| Ball-Playing Defender · Build-Up | CB | 0 | 4 | 0.1 | 0.08 | 0.88 | 0.4 | 0.4 | 0.02 | 0 | 0 | 0.02 |
| Ball-Playing Defender · Aggressive | CB | 0 | 5 | 0.1 | 0.1 | 0.82 | 0.65 | 0.5 | 0 | 0 | 0 | 0.02 |
| Wide Back · Defend | CB | -2 | 1 | 0.45 | 0.08 | 0.92 | 0.4 | 0.45 | 0.05 | 0 | 0 | 0 |
| Wide Back · Support | CB | -6 | 5 | 0.55 | 0.2 | 0.8 | 0.45 | 0.55 | 0.2 | 0 | 0.05 | 0 |
| Wide Back · Aggressive | CB | -5 | 7 | 0.5 | 0.25 | 0.75 | 0.65 | 0.6 | 0.1 | 0 | 0.05 | 0 |

## Defansif orta saha (10)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Holding · Defend | CDM/CM | 0 | 0 | 0.1 | 0.05 | 0.95 | 0.35 | 0.4 | 0 | 0 | 0 | 0.02 |
| Holding · Roaming | CDM/CM | 0 | 4 | 0.15 | 0.15 | 0.85 | 0.45 | 0.55 | 0 | 0 | 0.05 | 0.05 |
| Holding · Ball-Winning | CDM/CM | 0 | 2 | 0.15 | 0.1 | 0.9 | 0.7 | 0.55 | 0 | 0 | 0 | 0.02 |
| Deep-Lying Playmaker · Defend | CDM/CM | 0 | 1 | 0.1 | 0.1 | 0.8 | 0.3 | 0.4 | 0 | 0 | 0.02 | 0.08 |
| Deep-Lying Playmaker · Roaming | CDM/CM | 0 | 5 | 0.15 | 0.2 | 0.7 | 0.4 | 0.55 | 0.05 | 0 | 0.05 | 0.12 |
| Deep-Lying Playmaker · Build-Up | CDM/CM | 0 | -4 | 0.1 | 0.12 | 0.75 | 0.3 | 0.45 | 0.02 | 0 | 0.03 | 0.1 |
| Centre Half · Defend | CDM | 0 | 0 | 0.05 | 0.02 | 0.98 | 0.25 | 0.35 | 0 | 0 | 0 | 0 |
| Wide Half · Defend | CDM | -6 | 1 | 0.45 | 0.1 | 0.85 | 0.4 | 0.5 | 0.15 | 0 | 0.03 | 0 |
| Wide Half · Build-Up | CDM | -8 | 3 | 0.5 | 0.15 | 0.75 | 0.35 | 0.5 | 0.2 | 0 | 0.05 | 0.03 |
| Box Crasher · Balanced | CDM | 0 | 12 | 0.2 | 0.7 | 0.3 | 0.5 | 0.75 | 0.05 | 0 | 0.4 | 0.35 |

## Orta saha (10)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Box-to-Box · Balanced | CM | 0 | 8 | 0.2 | 0.6 | 0.55 | 0.65 | 0.95 | 0.05 | 0 | 0.25 | 0.2 |
| Box-to-Box · Ball-Winning | CM | 0 | 6 | 0.2 | 0.5 | 0.65 | 0.8 | 0.95 | 0 | 0 | 0.15 | 0.12 |
| Playmaker · Balanced | CM/CAM | 0 | 6 | 0.2 | 0.35 | 0.3 | 0.45 | 0.6 | 0.05 | 0.05 | 0.15 | 0.15 |
| Playmaker · Attack | CM/CAM | 0 | 10 | 0.2 | 0.5 | 0.2 | 0.4 | 0.65 | 0.05 | 0.1 | 0.3 | 0.2 |
| Playmaker · Roaming | CM/CAM | 4 | 8 | 0.25 | 0.4 | 0.28 | 0.45 | 0.65 | 0.05 | 0.1 | 0.2 | 0.15 |
| Playmaker · Build-Up | CM/CAM | 0 | 4 | 0.15 | 0.25 | 0.35 | 0.4 | 0.5 | 0.02 | 0.02 | 0.08 | 0.12 |
| Half Winger · Balanced | CM/CAM | 0 | 12 | 0.55 | 0.55 | 0.4 | 0.5 | 0.75 | 0.4 | 0.2 | 0.3 | 0.12 |
| Half Winger · Attack | CM/CAM | 0 | 15 | 0.6 | 0.65 | 0.3 | 0.5 | 0.8 | 0.45 | 0.25 | 0.4 | 0.15 |
| Half Winger · Support | CM/CAM | 0 | 10 | 0.5 | 0.45 | 0.45 | 0.5 | 0.7 | 0.4 | 0.15 | 0.2 | 0.1 |
| Half Winger · Roaming | CM/CAM | 4 | 12 | 0.5 | 0.5 | 0.38 | 0.5 | 0.75 | 0.35 | 0.2 | 0.25 | 0.12 |

## Ofansif orta saha (4)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Classic 10 · Attack | CAM | 0 | 8 | 0.15 | 0.5 | 0.12 | 0.3 | 0.55 | 0.1 | 0.15 | 0.4 | 0.28 |
| Classic 10 · Wide | CAM | 0 | 6 | 0.45 | 0.4 | 0.18 | 0.3 | 0.55 | 0.35 | 0.15 | 0.25 | 0.15 |
| Classic 10 · Versatile | CAM | 0 | 6 | 0.2 | 0.45 | 0.2 | 0.3 | 0.55 | 0.12 | 0.15 | 0.35 | 0.22 |
| Shadow Striker · Attack | CAM | 0 | 16 | 0.2 | 0.9 | 0.1 | 0.35 | 0.7 | 0 | 0.05 | 0.85 | 0.3 |

## Kanat (11)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Winger · Balanced | LM/RM/LW/RW | 0 | 14 | 0.9 | 0.6 | 0.3 | 0.45 | 0.75 | 0.75 | 0.1 | 0.3 | 0.1 |
| Winger · Attack | LM/RM/LW/RW | 0 | 18 | 0.92 | 0.75 | 0.2 | 0.4 | 0.8 | 0.75 | 0.12 | 0.4 | 0.12 |
| Winger · Versatile | LM/RM/LW/RW | 3 | 14 | 0.8 | 0.6 | 0.28 | 0.45 | 0.75 | 0.6 | 0.2 | 0.3 | 0.12 |
| Wide Playmaker · Attack | LM/RM/LW/RW | 12 | 12 | 0.55 | 0.55 | 0.2 | 0.4 | 0.7 | 0.3 | 0.45 | 0.3 | 0.12 |
| Wide Playmaker · Build-Up | LM/RM/LW/RW | 12 | 8 | 0.55 | 0.4 | 0.28 | 0.4 | 0.6 | 0.3 | 0.4 | 0.15 | 0.08 |
| Wide Midfielder · Support | LM/RM | 0 | 8 | 0.75 | 0.35 | 0.65 | 0.55 | 0.7 | 0.45 | 0.05 | 0.12 | 0.05 |
| Wide Midfielder · Defend | LM/RM | 0 | 4 | 0.7 | 0.2 | 0.8 | 0.55 | 0.65 | 0.3 | 0 | 0.05 | 0.03 |
| Wide Midfielder · Build-Up | LM/RM | 3 | 6 | 0.6 | 0.3 | 0.6 | 0.5 | 0.65 | 0.3 | 0.1 | 0.1 | 0.05 |
| Inside Forward · Balanced | LM/RM/LW/RW | 16 | 10 | 0.35 | 0.7 | 0.25 | 0.35 | 0.65 | 0.15 | 0.75 | 0.35 | 0.35 |
| Inside Forward · Attack | LM/RM/LW/RW | 20 | 12 | 0.35 | 0.85 | 0.15 | 0.35 | 0.7 | 0.1 | 0.9 | 0.45 | 0.4 |
| Inside Forward · Roaming | LM/RM/LW/RW | 22 | 12 | 0.3 | 0.75 | 0.2 | 0.35 | 0.7 | 0.1 | 0.85 | 0.4 | 0.38 |

## Forvet (11)

| Rol · focus | Mevki | dxIn | dyFwd | w | r | d | p | s | cross | cutIn | runBehind | longShot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Advanced Forward · Attack | ST | 0 | 10 | 0.3 | 0.95 | 0.05 | 0.3 | 0.6 | 0 | 0 | 0.95 | 0.15 |
| Advanced Forward · Versatile | ST | 0 | 8 | 0.3 | 0.85 | 0.08 | 0.3 | 0.6 | 0 | 0 | 0.8 | 0.15 |
| Advanced Forward · Support | ST | 0 | 6 | 0.3 | 0.7 | 0.15 | 0.35 | 0.6 | 0 | 0 | 0.6 | 0.12 |
| Poacher · Attack | ST | 0 | 4 | 0.15 | 0.8 | 0.05 | 0.25 | 0.45 | 0 | 0 | 0.55 | 0.1 |
| Poacher · Support | ST | 0 | 3 | 0.15 | 0.65 | 0.1 | 0.28 | 0.45 | 0 | 0 | 0.4 | 0.08 |
| Poacher · Versatile | ST | 0 | 3 | 0.18 | 0.7 | 0.08 | 0.28 | 0.45 | 0 | 0 | 0.45 | 0.1 |
| Target Forward · Attack | ST | 0 | 2 | 0.25 | 0.6 | 0.1 | 0.4 | 0.55 | 0 | 0 | 0.2 | 0.08 |
| Target Forward · Balanced | ST | 0 | 1 | 0.25 | 0.5 | 0.12 | 0.4 | 0.55 | 0 | 0 | 0.1 | 0.06 |
| Target Forward · Wide | ST | -12 | 2 | 0.6 | 0.45 | 0.12 | 0.4 | 0.6 | 0 | 0 | 0.1 | 0.04 |
| False 9 · Build-Up | ST | 0 | -8 | 0.2 | 0.35 | 0.25 | 0.35 | 0.5 | 0 | 0.1 | 0.15 | 0.15 |
| False 9 · Attack | ST | 0 | -5 | 0.2 | 0.45 | 0.2 | 0.35 | 0.55 | 0 | 0.1 | 0.3 | 0.18 |

## Değişmezler (`RoleMovementInvariantsTest`, 15 test, yeşil)

Sıra değişmezleri (kalibrasyon değişse de bozulamaz):
- dyFwd: AWB Attack (28) > Wingback Balanced (18) > Fullback Balanced (8) > Fullback Defend (2)
- dxIn: Inside Forward Attack (20) > Wide Playmaker Attack (12) > Winger Balanced (0)
- w: Winger Balanced (0,90) > Inside Forward Attack (0,35)
- d: Holding Defend (0,95) > DLP Defend (0,80) > Box-to-Box Balanced (0,55) > Playmaker Balanced (0,30); Centre Half Defend (0,98) > Box Crasher Balanced (0,30)
- r: Advanced Forward Attack (0,95) > Poacher Attack (0,80) > Target Forward Attack (0,60) > False 9 Attack (0,45)
- s: Box-to-Box Balanced (0,95) ≥ AWB Attack (0,95) > Fullback Defend (0,45) > Holding Defend (0,40)
- p: Stopper'ın (en düşük 0,60) > Defender'ın (en yüksek 0,40)
- Aynı rolde: Attack.r ≥ Balanced.r ≥ Defend.r ve dyFwd aynı yönde; Defend.d ≥ Balanced.d ≥ Attack.d (tüm roller)
- Fırsat kanalları: Winger.cross > Inside Forward.cross; Inside Forward.cutIn > Winger.cutIn; AF.runBehind > Target Forward.runBehind; Shadow Striker.runBehind > Holding.runBehind; Box Crasher.longShot > Centre Half.longShot; AWB.cross > Fullback Defend.cross
- **İşaretli hareket (yeni):** dyFwd: False 9 Build-Up (−8) < False 9 Attack (−5) < 0 < Advanced Forward Attack (+10); DLP Build-Up (−4) < Holding Defend (0); dxIn: Target Forward Wide (−12) < 0, Wide Back Support (−6) < 0, Wide Half Build-Up (−8) < 0
- Düzeltmeler sabit: Fullback Defend dxIn 1; Holding Defend p 0,35; AWB Attack d 0,30; işaretli düzeltmeler (9 satır) `_basis`'te "işaretli hareket düzeltmesi, Buğra/Claude incelemesi"
- Şema: 72 satırın hepsinde 11 alan aralıkta (dxIn −15…30, dyFwd −12…35, diğerleri 0-1), `verified:false`, `_basis` dolu; satırlar `roles.json` rol × focus ile birebir

## Notlar
- AWB Attack `s` 1,00 → 0,95 sapması kabul edildi ("B2B ≥ AWB").
- 72 satır: `roles.json`'da 30 rol × focus = 72; motor kimliği `rol_focus`. Tüm değerler tek üretici betikte (`tools/fit-seeds/gen-role-movement.mjs`).
- Box-to-Box yalnız CM (EA kuralı, CDM karşılığı Box Crasher): işlem yok.
- Topsuz hat kayması (`lineShiftByBand`, `verified:false`): DEEP −6, BALANCED 0, HIGH +8, AGGRESSIVE +14 birim ileri.
