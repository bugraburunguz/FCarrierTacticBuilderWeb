# E3-5c — Oyuncu içi doğrulama (karar testi) (2026-10-14)

Ağırlıklar **ayarlanmadı**. Hangi rol vektörlerine bakılacağına karar sizde. levelFit E3-5c-1 sürümü (pürüzsüz eşleme), aşinalık (FAM) ve PlayStyle terimleri kapalı.

## Yöntem
Her oyuncu için, aynı mevkideki roller arasında EA'nın **Role+/++ verdiği** rollerin levelFit'i ile **vermediği** rollerin levelFit'i çift çift karşılaştırılır (kazanma = 1, eşitlik = 0,5). Mevki, OVR ve oyuncu popülasyonu sabit kalır (oyuncu kendi kendinin kontrolü). Rol bazında: o rol pozitifken, oyuncunun aynı mevkideki rolsüz rollerini yenme oranı. Kaynak: LE dökümü (21.619 oyuncu, 148.881 çift). Test: `RoleFamiliarityValidationTest` (opt-in `-Drole.validation=true`).

## Sonuç
| Ölçüt | Sonuç | Hedef |
|---|---|---|
| Oyuncu içi AUC, çift-ağırlıklı | **0,623** | ≥ 0,70 → **tutmadı** |
| Oyuncu içi AUC, oyuncu ortalaması | 0,605 | — |
| Varsayılan roller (GK goalkeeper, ST AF, winger×4, fullback×2) | **0,593** (34.068 çift) | — |
| Diğer roller | 0,632 (114.813 çift) | — |
| ≥ 0,70 olan rol | 7 / 49 | — |

≥ 0,70 olanlar: RM wide_midfielder 0,826 · LM wide_midfielder 0,818 · ST target_forward 0,790 · CM playmaker 0,762 · CDM deep_lying_playmaker 0,739 · LB fullback 0,724 · RB fullback 0,706 (ve ST false_9 / CAM playmaker / CB ball_playing_defender ≈ 0,696).
En zayıflar: GK ball_playing_keeper 0,476 · ST advanced_forward 0,478 · CDM centre_half 0,507 · LB wingback 0,514 · CM box_to_box 0,525 · RB wingback 0,526 · GK goalkeeper 0,528 · GK sweeper_keeper 0,536 · CB stopper 0,548 · CDM box_crasher 0,550 · CB defender 0,555.

## Eski "Role+/++ vs rolsüz" metriği hakkında not
Eski metrik raporda kalıyor (`E3-5b_role_dogrulama.md`; yeni levelFit ile yeniden koşuldu: +/++ 0,610, yalnız ++ 0,843). **Not: EA varsayılan rolü jenerik profillere veriyor (GK goalkeeper: + medyan 52,3 < rolsüz 60,6; ST advanced_forward: + 52,4 < rolsüz 66,7), bu metrik varsayılan rollerde yanıltıcı** (rolü *olmayan* oyuncular özel rol taşıyan arketipler). Oyuncu içi metrik bu karışıklığı kaldırıyor ama varsayılan rollerde yine düşük (0,593): orada iki açıklama mümkün ve ayırt etmedim: (a) vektörlerimiz varsayılan rolü özelleşmişlerden yeterince ayırmıyor, (b) EA bu rolü "herkese" veriyor, bilgi taşımıyor.

## Tablo (rol bazında, ≥ 15 çift)
| Mevki · rol (pozitif olduğunda) | çift | oyuncu içi AUC | not |
|---|---|---|---|
| CAM · classic_10 | 156 | 0,603 |  |
| CAM · half_winger | 2131 | 0,666 |  |
| CAM · playmaker | 5278 | 0,696 |  |
| CAM · shadow_striker | 3438 | 0,661 |  |
| CB · ball_playing_defender | 3119 | 0,696 |  |
| CB · defender | 8059 | 0,555 |  |
| CB · stopper | 2188 | 0,548 |  |
| CB · wide_back | 2067 | 0,669 |  |
| CDM · box_crasher | 4836 | 0,550 |  |
| CDM · centre_half | 2201 | 0,507 |  |
| CDM · deep_lying_playmaker | 4157 | 0,739 |  |
| CDM · holding | 7113 | 0,669 |  |
| CDM · wide_half | 2575 | 0,654 |  |
| CM · box_to_box | 9624 | 0,525 |  |
| CM · deep_lying_playmaker | 3619 | 0,642 |  |
| CM · half_winger | 3693 | 0,681 |  |
| CM · holding | 3716 | 0,641 |  |
| CM · playmaker | 4114 | 0,762 |  |
| GK · ball_playing_keeper | 970 | 0,476 |  |
| GK · goalkeeper | 3425 | 0,528 | varsayılan rol |
| GK · sweeper_keeper | 487 | 0,536 |  |
| LB · attacking_wingback | 2135 | 0,669 |  |
| LB · falseback | 844 | 0,660 |  |
| LB · fullback | 3476 | 0,724 | varsayılan rol |
| LB · inverted_wingback | 451 | 0,563 |  |
| LB · wingback | 3770 | 0,514 |  |
| LM · inside_forward | 3240 | 0,624 |  |
| LM · wide_midfielder | 2718 | 0,818 |  |
| LM · wide_playmaker | 1289 | 0,643 |  |
| LM · winger | 5747 | 0,596 | varsayılan rol |
| LW · inside_forward | 2265 | 0,575 |  |
| LW · wide_playmaker | 728 | 0,639 |  |
| LW · winger | 3161 | 0,580 | varsayılan rol |
| RB · attacking_wingback | 2080 | 0,649 |  |
| RB · falseback | 1179 | 0,687 |  |
| RB · fullback | 3651 | 0,706 | varsayılan rol |
| RB · inverted_wingback | 586 | 0,534 |  |
| RB · wingback | 3562 | 0,526 |  |
| RM · inside_forward | 2952 | 0,623 |  |
| RM · wide_midfielder | 2705 | 0,826 |  |
| RM · wide_playmaker | 1167 | 0,632 |  |
| RM · winger | 5782 | 0,606 | varsayılan rol |
| RW · inside_forward | 2038 | 0,574 |  |
| RW · wide_playmaker | 683 | 0,637 |  |
| RW · winger | 3281 | 0,576 | varsayılan rol |
| ST · advanced_forward | 5545 | 0,478 | varsayılan rol |
| ST · false_9 | 2936 | 0,696 |  |
| ST · poacher | 2680 | 0,592 |  |
| ST · target_forward | 1264 | 0,790 |  |

Oyuncu içi AUC: çift-ağırlıklı 0,623 · oyuncu ortalaması 0,605 · oyuncu sayısı 21618 · çift 148881 (hedef ≥ 0,70)
