# E3-2 — Oyuncu içi doğrulama: PlayStyle KAPALI ↔ AÇIK (FAM kapalı) (2026-10-14)

Ağırlıklar **ayarlanmadı**. Aynı yöntem (E3-5c_oyuncu_ici.md): oyuncunun mevkisindeki Role+/++ rolleri vs almadığı roller, levelFit çiftleri. PS açık = LE `trait*/icontrait*` bitleri `LePlaystyleBits` ile çözülüp PS terimi motora verildi; aşinalık (FAM) her iki durumda kapalı.

- PS kapalı: Oyuncu içi AUC: çift-ağırlıklı 0,623 · oyuncu ortalaması 0,605 · oyuncu sayısı 21618 · çift 148881 (hedef ≥ 0,70)
- PS açık: Oyuncu içi AUC: çift-ağırlıklı 0,626 · oyuncu ortalaması 0,607 · oyuncu sayısı 21618 · çift 148881 (hedef ≥ 0,70)
- Varsayılan roller (PS kapalı → açık): 0.593 → 0.592 · diğer roller: 0.632 → 0.636

- Oyuncu içi AUC < 0,65 olan roller (PS açık): GK · ball_playing_keeper 0.476 · ST · advanced_forward 0.479 · CDM · centre_half 0.507 · GK · goalkeeper 0.528 · LB · wingback 0.528 · CM · box_to_box 0.529 · RB · inverted_wingback 0.529 · RB · wingback 0.531 · GK · sweeper_keeper 0.536 · CB · stopper 0.551 · CDM · box_crasher 0.555 · CB · defender 0.558 · RW · winger 0.576 · LW · winger 0.579 · LB · inverted_wingback 0.581 · RW · inside_forward 0.585 · LW · inside_forward 0.588 · LM · winger 0.595 · ST · poacher 0.600 · RM · winger 0.603 · CM · deep_lying_playmaker 0.634 · CAM · classic_10 0.635 · LM · inside_forward 0.639 · RM · inside_forward 0.641 · LM · wide_playmaker 0.643 · RM · wide_playmaker 0.646 · CM · holding 0.647
- ≥ 0,70 olan roller (PS açık): 9 / 49

| Mevki · rol | çift | AUC PS kapalı | AUC PS açık | fark | not |
|---|---|---|---|---|---|
| CAM · classic_10 | 156 | 0.603 | 0.635 | +0.032 |  |
| CAM · half_winger | 2131 | 0.666 | 0.664 | -0.002 |  |
| CAM · playmaker | 5278 | 0.696 | 0.698 | +0.002 |  |
| CAM · shadow_striker | 3438 | 0.661 | 0.670 | +0.009 |  |
| CB · ball_playing_defender | 3119 | 0.696 | 0.704 | +0.008 |  |
| CB · defender | 8059 | 0.555 | 0.558 | +0.003 |  |
| CB · stopper | 2188 | 0.548 | 0.551 | +0.003 |  |
| CB · wide_back | 2067 | 0.669 | 0.680 | +0.011 |  |
| CDM · box_crasher | 4836 | 0.550 | 0.555 | +0.005 |  |
| CDM · centre_half | 2201 | 0.507 | 0.507 | +0.000 |  |
| CDM · deep_lying_playmaker | 4157 | 0.739 | 0.735 | -0.004 |  |
| CDM · holding | 7113 | 0.669 | 0.664 | -0.005 |  |
| CDM · wide_half | 2575 | 0.654 | 0.651 | -0.003 |  |
| CM · box_to_box | 9624 | 0.525 | 0.529 | +0.004 |  |
| CM · deep_lying_playmaker | 3619 | 0.642 | 0.634 | -0.008 |  |
| CM · half_winger | 3693 | 0.681 | 0.686 | +0.005 |  |
| CM · holding | 3716 | 0.641 | 0.647 | +0.006 |  |
| CM · playmaker | 4114 | 0.762 | 0.758 | -0.004 |  |
| GK · ball_playing_keeper | 970 | 0.476 | 0.476 | +0.000 |  |
| GK · goalkeeper | 3425 | 0.528 | 0.528 | +0.000 | varsayılan rol |
| GK · sweeper_keeper | 487 | 0.536 | 0.536 | +0.000 |  |
| LB · attacking_wingback | 2135 | 0.669 | 0.685 | +0.016 |  |
| LB · falseback | 844 | 0.660 | 0.662 | +0.002 |  |
| LB · fullback | 3476 | 0.724 | 0.725 | +0.001 | varsayılan rol |
| LB · inverted_wingback | 451 | 0.563 | 0.581 | +0.018 |  |
| LB · wingback | 3770 | 0.514 | 0.528 | +0.014 |  |
| LM · inside_forward | 3240 | 0.624 | 0.639 | +0.015 |  |
| LM · wide_midfielder | 2718 | 0.818 | 0.815 | -0.003 |  |
| LM · wide_playmaker | 1289 | 0.643 | 0.643 | +0.000 |  |
| LM · winger | 5747 | 0.596 | 0.595 | -0.001 | varsayılan rol |
| LW · inside_forward | 2265 | 0.575 | 0.588 | +0.013 |  |
| LW · wide_playmaker | 728 | 0.639 | 0.651 | +0.012 |  |
| LW · winger | 3161 | 0.580 | 0.579 | -0.001 | varsayılan rol |
| RB · attacking_wingback | 2080 | 0.649 | 0.659 | +0.010 |  |
| RB · falseback | 1179 | 0.687 | 0.686 | -0.001 |  |
| RB · fullback | 3651 | 0.706 | 0.704 | -0.002 | varsayılan rol |
| RB · inverted_wingback | 586 | 0.534 | 0.529 | -0.005 |  |
| RB · wingback | 3562 | 0.526 | 0.531 | +0.005 |  |
| RM · inside_forward | 2952 | 0.623 | 0.641 | +0.018 |  |
| RM · wide_midfielder | 2705 | 0.826 | 0.822 | -0.004 |  |
| RM · wide_playmaker | 1167 | 0.632 | 0.646 | +0.014 |  |
| RM · winger | 5782 | 0.606 | 0.603 | -0.003 | varsayılan rol |
| RW · inside_forward | 2038 | 0.574 | 0.585 | +0.011 |  |
| RW · wide_playmaker | 683 | 0.637 | 0.656 | +0.019 |  |
| RW · winger | 3281 | 0.576 | 0.576 | +0.000 | varsayılan rol |
| ST · advanced_forward | 5545 | 0.478 | 0.479 | +0.001 | varsayılan rol |
| ST · false_9 | 2936 | 0.696 | 0.701 | +0.005 |  |
| ST · poacher | 2680 | 0.592 | 0.600 | +0.008 |  |
| ST · target_forward | 1264 | 0.790 | 0.801 | +0.011 |  |
