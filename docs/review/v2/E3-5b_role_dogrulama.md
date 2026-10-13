# E3-5b — Bağımsız doğrulama: EA Role+/Role++ verisi ↔ levelFit (2026-10-14)

Sonuçları **ayarlamak için kullanmadım**; hiçbir ağırlık/vektör değişmedi. Karar sizde.

## Kaynak ve kapsam
- Kaynak: LE dökümü `ml-service/data/fc27-dump/players.csv` (`role1..role9`; kod 1–52 = Role+, +100 = Role++; kod → "MEVKİ Rol" adı LE `localize.json` `player_role_N` dizgelerinden, `seed/le-role-codes.json`, `verified:true` gözlem).
- **21.619 oyuncunun tamamında** en az bir rol var (50.877 rol yuvası). **Role++ yalnız 279 oyuncuda, 331 yuvada** (özel/üst kartlar); Role+ ise çoğu oyuncuda kendi mevkisinin temel rolleri için geniş dağıtılmış (örn. kalecilerin %70'i `Goalkeeper+`).
- Resmî ingestion (EA ratings sitesi) yükünde rol alanı yok; kariyer içe aktarmasında (`career_player_rating`) da aşinalık kolonu henüz yok (E3-2'de eklenecek). Bu yüzden doğrulama LE dökümü üzerindedir.

## Yöntem
- Her oyuncu için FitEngineV3 `currentFit`, **aşinalık (FAM) terimi kapalı**, PlayStyle terimi de kapalı (trait bit maskesi çözülmedi); sonra aynı (cinsiyet, mevki, rol, focus) için OVR ±3 (<30'da genişleyen) bandında **levelFit**. Norm popülasyonu bu dökümün kendisi. Rol ID'sinde focus yok: oyuncunun focus'lar arasındaki **en yüksek levelFit**'i alındı.
- Her (mevki, rol) için: Role++ / Role+ / rolsüz medyan levelFit ve AUC (pozitif = Role+ veya ++, negatif = aynı mevkideki rolsüzler). Ek sütun: yalnız ++ vs rolsüz AUC.
- Test: `RoleFamiliarityValidationTest` (opt-in `-Drole.validation=true`, çıktı `target/role-validation.md`). Küçük gruplar (n<15) tabloda yok; n++<5 olan roller için ++ AUC'si gürültülüdür.

## Özet sonuç
| Ölçüt | Sonuç | Hedef |
|---|---|---|
| Ağırlıklı ortalama AUC (Role+ **veya** ++ vs rolsüz) | **0,613** | ≥ 0,75 → **tutmadı** |
| Ağırlıklı ortalama AUC (**yalnız ++** vs rolsüz) | **0,828** (n++≥5 olan 22 rolde 0,837) | (hedef tanımı +/++ içindi) |
| Role++ medyan levelFit | çoğu rolde 78–99 | rolsüz medyan 41–70 |
| Tek tek AUC (+/++) < 0,6 | CAM half_winger 0,597 · CB stopper 0,555 · CDM holding 0,560 · CDM wide_half 0,549 · GK goalkeeper **0,347** · GK sweeper_keeper 0,565 · LB fullback 0,501 · LM winger 0,519 · LW winger 0,507 · RB fullback 0,493 · RM winger 0,539 · RW winger 0,486 · ST advanced_forward **0,371** | — |
| Yalnız ++ AUC < 0,6 (n++≥5) | CDM box_crasher 0,575 (n++=8) | — |

## Yorum (hipotez, test edilmedi)
- **Role++ sinyali güçlü**: motor ++ oyuncuları rolsüzlerden ayırıyor (0,83). Role+ ise kalabalık ve geniş dağıtıldığı için "tamamlayıcı" grup zaten rolün bir kısmını taşıyor; `+ vs rolsüz` AUC'sini düşüren bu.
- **Ters çıkan roller** (GK goalkeeper 0,35, ST advanced_forward 0,37, RW/LW winger ≈0,5, fullback ≈0,5) hep "varsayılan/temel" roller. Bu mevkilerde rolü *olmayan* oyuncular başka bir rol (sweeper keeper, false 9, inside forward…) ile işaretli, yani rolsüz grup kendi içinde farklı arketipler; bizim vektörlerimiz bu temel rolleri özelleşmiş rollerden yeterince ayırmıyor olabilir ya da EA bu temel rolü "herkese" veriyor.
- Role+ eşiği/atanma kuralı bilinmiyor; bu yüzden AUC<0,6 zayıf-rol listesi "vektör zayıf" kanıtı değil, "bu etiket bu rolü iyi ayırt etmiyor" işareti.

## Tablo (tam)
| Mevki · rol | n(++) | n(+) | n(rolsüz) | medyan levelFit ++ | medyan + | medyan rolsüz | AUC (+/++ vs rolsüz) | AUC (yalnız ++) |
|---|---|---|---|---|---|---|---|---|
| CAM · classic_10 | 2 | 57 | 4028 | 77,1 | 77,5 | 64,0 | 0,683 | 0,690 |
| CAM · half_winger | 2 | 759 | 3326 | 90,3 | 73,3 | 66,5 | 0,597 | 0,916 |
| CAM · playmaker | 10 | 1836 | 2241 | 96,9 | 74,0 | 60,9 | 0,662 | 0,949 |
| CAM · shadow_striker | 15 | 1194 | 2878 | 77,5 | 72,2 | 41,1 | 0,781 | 0,828 |
| CB · ball_playing_defender | 27 | 1282 | 3655 | 88,0 | 79,1 | 55,9 | 0,726 | 0,848 |
| CB · defender | 2 | 3027 | 1935 | 73,1 | 61,0 | 46,9 | 0,671 | 0,776 |
| CB · stopper | 3 | 894 | 4067 | 98,8 | 60,9 | 56,7 | 0,555 | 0,992 |
| CB · wide_back | 3 | 887 | 4074 | 83,9 | 75,8 | 63,4 | 0,614 | 0,670 |
| CDM · box_crasher | 8 | 1243 | 3968 | 56,0 | 65,1 | 45,2 | 0,659 | 0,575 |
| CDM · centre_half | 2 | 653 | 4564 | 74,6 | 67,1 | 48,7 | 0,678 | 0,788 |
| CDM · deep_lying_playmaker | 13 | 1119 | 4087 | 91,4 | 77,1 | 65,0 | 0,664 | 0,919 |
| CDM · holding | 3 | 1890 | 3326 | 95,8 | 69,0 | 64,0 | 0,560 | 0,910 |
| CDM · wide_half | 4 | 708 | 4507 | 87,1 | 70,2 | 65,0 | 0,549 | 0,871 |
| CM · box_to_box | 15 | 2452 | 4095 | 94,2 | 69,6 | 55,0 | 0,638 | 0,914 |
| CM · deep_lying_playmaker | 14 | 930 | 5618 | 93,4 | 79,1 | 66,6 | 0,662 | 0,843 |
| CM · half_winger | 2 | 931 | 5629 | 90,8 | 76,1 | 65,8 | 0,638 | 0,908 |
| CM · holding | 3 | 975 | 5584 | 81,1 | 74,3 | 64,5 | 0,607 | 0,565 |
| CM · playmaker | 13 | 1031 | 5518 | 95,4 | 76,0 | 66,3 | 0,640 | 0,896 |
| GK · ball_playing_keeper | 13 | 473 | 1956 | 63,9 | 61,8 | 47,5 | 0,604 | 0,683 |
| GK · goalkeeper | 11 | 1703 | 728 | 86,3 | 52,9 | 61,0 | 0,347 | 0,847 |
| GK · sweeper_keeper | 1 | 244 | 2197 | 72,9 | 64,1 | 54,9 | 0,565 | 0,702 |
| LB · attacking_wingback | 10 | 585 | 2143 | 97,0 | 72,2 | 49,2 | 0,728 | 0,967 |
| LB · falseback | 2 | 235 | 2501 | 80,9 | 70,5 | 59,1 | 0,648 | 0,817 |
| LB · fullback | 0 | 890 | 1848 | NaN | 69,4 | 70,5 | 0,501 | NaN |
| LB · inverted_wingback | 4 | 125 | 2609 | 81,2 | 71,7 | 59,0 | 0,636 | 0,812 |
| LB · wingback | 6 | 1030 | 1702 | 67,1 | 64,0 | 47,4 | 0,667 | 0,737 |
| LM · inside_forward | 10 | 1162 | 3499 | 83,1 | 76,7 | 54,3 | 0,721 | 0,797 |
| LM · wide_midfielder | 3 | 972 | 3696 | 75,8 | 80,5 | 55,6 | 0,727 | 0,677 |
| LM · wide_playmaker | 5 | 496 | 4170 | 83,5 | 75,9 | 59,3 | 0,695 | 0,848 |
| LM · winger | 2 | 2076 | 2593 | 81,3 | 65,8 | 64,5 | 0,519 | 0,751 |
| LW · inside_forward | 15 | 1195 | 2141 | 93,3 | 69,8 | 57,2 | 0,634 | 0,905 |
| LW · wide_playmaker | 3 | 389 | 2959 | 83,0 | 76,9 | 58,5 | 0,689 | 0,900 |
| LW · winger | 4 | 1663 | 1684 | 68,8 | 63,7 | 63,8 | 0,507 | 0,623 |
| RB · attacking_wingback | 8 | 571 | 2197 | 89,0 | 75,6 | 49,0 | 0,757 | 0,917 |
| RB · falseback | 4 | 318 | 2454 | 85,5 | 68,2 | 59,8 | 0,608 | 0,882 |
| RB · fullback | 3 | 939 | 1834 | 78,9 | 70,0 | 70,7 | 0,493 | 0,635 |
| RB · inverted_wingback | 2 | 170 | 2604 | 87,2 | 71,3 | 58,3 | 0,618 | 0,871 |
| RB · wingback | 3 | 982 | 1791 | 64,4 | 65,0 | 47,6 | 0,673 | 0,792 |
| RM · inside_forward | 14 | 1046 | 3483 | 85,9 | 76,0 | 54,7 | 0,713 | 0,793 |
| RM · wide_midfielder | 3 | 970 | 3570 | 82,0 | 80,3 | 55,7 | 0,714 | 0,799 |
| RM · wide_playmaker | 3 | 443 | 4097 | 85,5 | 78,2 | 59,4 | 0,706 | 0,852 |
| RM · winger | 0 | 2077 | 2466 | NaN | 66,5 | 62,6 | 0,539 | NaN |
| RW · inside_forward | 14 | 1060 | 2255 | 92,6 | 69,5 | 58,1 | 0,624 | 0,841 |
| RW · wide_playmaker | 4 | 377 | 2948 | 84,2 | 76,0 | 59,0 | 0,684 | 0,879 |
| RW · winger | 4 | 1710 | 1615 | 89,7 | 62,1 | 64,9 | 0,486 | 0,757 |
| ST · advanced_forward | 10 | 1963 | 2176 | 78,9 | 53,1 | 68,0 | 0,371 | 0,622 |
| ST · false_9 | 14 | 1152 | 2983 | 90,3 | 76,0 | 48,0 | 0,760 | 0,873 |
| ST · poacher | 10 | 1083 | 3056 | 87,6 | 66,9 | 58,3 | 0,605 | 0,783 |
| ST · target_forward | 5 | 578 | 3566 | 99,0 | 82,8 | 49,7 | 0,782 | 0,929 |

Oyuncu: 21619 · ağırlıklı ortalama AUC (+/++): 0,613 · yalnız ++ ağırlıklı AUC: 0,828 · hedef ≥ 0,75 · AUC < 0,6 olanlar: CAM half_winger (AUC 0,597, n+=761); CB stopper (AUC 0,555, n+=897); CDM holding (AUC 0,560, n+=1893); CDM wide_half (AUC 0,549, n+=712); GK goalkeeper (AUC 0,347, n+=1714); GK sweeper_keeper (AUC 0,565, n+=245); LB fullback (AUC 0,501, n+=890); LM winger (AUC 0,519, n+=2078); LW winger (AUC 0,507, n+=1667); RB fullback (AUC 0,493, n+=942); RM winger (AUC 0,539, n+=2077); RW winger (AUC 0,486, n+=1714); ST advanced_forward (AUC 0,371, n+=1973)
