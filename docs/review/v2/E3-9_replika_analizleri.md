# E3-9 — replikalar: tacticCode ve analiz bulguları

106 replika (yer tutucu `ucl_winner_2026_tbd` hariç). `tacticCode` sunucuda `EaTacticCodec` ile üretildi ve decode edilince seed ayarlarıyla (formasyon, build-up, hat, 11 × mevki/rol/focus) **birebir** aynı çıktı (`ReplicaSeedIntegrationTest`, 106/106). Analiz etiketsizdir: formasyon konumları + replikanın rolleri + build-up + hat (oyuncu yok; oyuncu gerektiren kurallar çalışmaz).

## Özet

- Uyarı/risk üreten replika: **34 / 106**; yalnız bilgi ya da bulgusuz: 72
- Kural başına bulgu sayısı: no_anchor 24 · striker_line_no_runner 23 · no_anchor_info 14 · midfield_thin 13 · corridor_no_width 12 · wing_gap_overlap 3 · no_runner_for_counter 1 · narrow_shape 1

## Uyarı/risk üreten replikalar (veri mi kural mı? incelenecek)

| Replika | Formasyon · build-up · hat | Benzerlik | Uyarı/risk kodları |
|---|---|---|---|
| ferguson_united_2008 (Manchester United 2007-08, Sir Alex Ferguson) | 4-3-3 (2) · BALANCED · 50 | 4/5 | corridor_no_width[RIGHT] (uyarı) |
| guardiola_barcelona_2009 (FC Barcelona 2008-09, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 72 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| guardiola_barcelona_2011 (FC Barcelona 2010-11, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 92 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| dimatteo_chelsea_2012 (Chelsea 2011-12, Roberto Di Matteo) | 4-2-3-1 (2) · COUNTER · 15 | 4/5 | no_runner_for_counter (uyarı) |
| ancelotti_real_2014 (Real Madrid 2013-14, Carlo Ancelotti) | 4-3-3 (2) · BALANCED · 45 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| luisenrique_barcelona_2015 (FC Barcelona 2014-15, Luis Enrique) | 4-3-3 (2) · BALANCED · 66 | 4/5 | no_anchor (uyarı) |
| flick_bayern_2020 (Bayern Münih 2019-20, Hansi Flick) | 4-2-3-1 (2) · BALANCED · 95 | 4/5 | wing_gap_overlap[LEFT] (risk), no_anchor (uyarı) |
| ancelotti_real_2022 (Real Madrid 2021-22, Carlo Ancelotti) | 4-3-3 (2) · BALANCED · 38 | 3/5 | corridor_no_width[LEFT] (uyarı) |
| guardiola_city_2023 (Manchester City 2022-23, Pep Guardiola) | 4-1-4-1 · SHORT_PASSING · 70 | 4/5 | no_anchor (uyarı) |
| luisenrique_psg_2025 (Paris Saint-Germain 2024-25, Luis Enrique) | 4-3-3 (2) · SHORT_PASSING · 93 | 4/5 | no_anchor (uyarı) |
| pellegrini_villarreal_2006 (Villarreal 2005-06, Manuel Pellegrini) | 4-1-2-1-2 (2) · SHORT_PASSING · 50 | 3/5 | no_anchor (uyarı) |
| rodgers_liverpool_2014 (Liverpool 2013-14, Brendan Rodgers) | 4-1-2-1-2 (2) · COUNTER · 66 | 4/5 | no_anchor (uyarı) |
| allegri_juventus_2015 (Juventus 2014-15, Massimiliano Allegri) | 4-3-1-2 · BALANCED · 46 | 4/5 | no_anchor (uyarı) |
| ranieri_leicester_2016 (Leicester City 2015-16, Claudio Ranieri) | 4-4-2 · COUNTER · 25 | 5/5 | corridor_no_width[RIGHT] (uyarı) |
| pochettino_tottenham_2019 (Tottenham Hotspur 2018-19, Mauricio Pochettino) | 4-1-2-1-2 (2) · BALANCED · 62 | 3/5 | no_anchor (uyarı) |
| alonso_leverkusen_2024 (Bayer Leverkusen 2023-24, Xabi Alonso) | 3-4-2-1 · SHORT_PASSING · 68 | 4/5 | no_anchor (uyarı) |
| cruyff_barcelona_1992 (FC Barcelona 1991-92, Johan Cruyff) | 4-3-3 (2) · SHORT_PASSING · 80 | 3/5 | corridor_no_width[LEFT] (uyarı), no_anchor (uyarı) |
| sacchi_milan_1989 (AC Milan 1988-89, Arrigo Sacchi) | 4-4-2 · BALANCED · 88 | 4/5 | no_anchor (uyarı) |
| kovacs_ajax_1972 (AFC Ajax 1971-72, Ștefan Kovács) | 4-3-3 (2) · SHORT_PASSING · 93 | 3/5 | wing_gap_overlap[LEFT] (risk), no_anchor (uyarı) |
| lobanovskyi_dynamokyiv_1986 (Dinamo Kyiv 1985-86, Valeriy Lobanovskyi) | 4-4-2 · BALANCED · 80 | 3/5 | no_anchor (uyarı) |
| vangaal_ajax_1995 (AFC Ajax 1994-95, Louis van Gaal) | 4-3-3 (4) · SHORT_PASSING · 82 | 3/5 | no_anchor (uyarı) |
| mourinho_chelsea_2005 (Chelsea 2004-05, José Mourinho) | 4-3-3 (2) · BALANCED · 52 | 4/5 | corridor_no_width[RIGHT] (uyarı) |
| guardiola_bayern_2014 (FC Bayern München 2013-14, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 82 | 4/5 | corridor_no_width[RIGHT] (uyarı), no_anchor (uyarı) |
| spalletti_napoli_2023 (SSC Napoli 2022-23, Luciano Spalletti) | 4-3-3 (2) · SHORT_PASSING · 74 | 4/5 | no_anchor (uyarı) |
| sarri_napoli_2018 (SSC Napoli 2017-18, Maurizio Sarri) | 4-3-3 (2) · SHORT_PASSING · 80 | 4/5 | no_anchor (uyarı) |
| sarri_empoli_2015 (Empoli FC 2014-15, Maurizio Sarri) | 4-3-1-2 · SHORT_PASSING · 76 | 3/5 | no_anchor (uyarı) |
| dezerbi_brighton_2023 (Brighton & Hove Albion 2022-23, Roberto De Zerbi) | 4-2-3-1 (2) · SHORT_PASSING · 68 | 3/5 | corridor_no_width[RIGHT] (uyarı) |
| dezerbi_sassuolo_2021 (US Sassuolo 2020-21, Roberto De Zerbi) | 4-2-3-1 (2) · SHORT_PASSING · 70 | 3/5 | no_anchor (uyarı) |
| michel_girona_2024 (Girona FC 2023-24, Míchel) | 4-3-3 (2) · SHORT_PASSING · 70 | 4/5 | no_anchor (uyarı) |
| motta_bologna_2024 (Bologna FC 2023-24, Thiago Motta) | 4-1-4-1 · SHORT_PASSING · 66 | 3/5 | corridor_no_width[RIGHT] (uyarı), no_anchor (uyarı) |
| nagelsmann_leipzig_2020 (RB Leipzig 2019-20, Julian Nagelsmann) | 3-4-1-2 · BALANCED · 80 | 3/5 | no_anchor (uyarı) |
| postecoglou_celtic_2023 (Celtic 2022-23, Ange Postecoglou) | 4-3-3 (2) · SHORT_PASSING · 86 | 4/5 | corridor_no_width[LEFT] (uyarı), no_anchor (uyarı) |
| iraola_bournemouth_2025 (AFC Bournemouth 2024-25, Andoni Iraola) | 4-2-3-1 (2) · COUNTER · 94 | 3/5 | wing_gap_overlap[LEFT] (risk) |
| zeman_pescara_2012 (Delfino Pescara 1936 2011-12, Zdeněk Zeman) | 4-3-3 (2) · BALANCED · 97 | 3/5 | no_anchor (uyarı) |
## Değerlendirme: kural mı veri mi?

- **no_anchor (24)**: tetikleyen bacaklar: BAND_ORDINAL + FULLBACKS_DYFWD_MIN → 7 · BAND_ORDINAL + FULLBACKS_DYFWD_MIN + REST_DEFENCE_COUNT → 2 · BAND_ORDINAL → 13 · FULLBACKS_DYFWD_MIN → 2. Yalnız "hat ≥ HIGH" bacağıyla uyarı alan 13 replika çoğunlukla yüksek baskı takımıdır (Sacchi, Cruyff, Guardiola, Sarri…): çapasız ama yüksek presli takımın koruması hat yüksekliğidir, geri savunma sayısı değil; bu bacak baskı sistemlerini fazla cezalandırıyor. **Öneri:** hat bacağını "hat ≥ HIGH VE geri savunma < 5" yap (Buğra kararı; kural bu raporda değiştirilmedi).
- **striker_line_no_runner (23)**: forvet hattında arkaya koşan (runBehind ≥ 0,4) yok; şiddet bilgi, çoğu Poacher/Target/False 9 kullanan klasik forvet düzeni: veri hatası değil, rol seçimi gerçekçi (kural bilgi kalmalı).
- **corridor_no_width / wing_gap_overlap**: replikaların bilinçli kanat/bek mekanizmalarını (içe kesen kanat + bek bindirmesi) işaret eder; seed'deki gerçek şekille uyumlu, veri hatası görünmüyor; eşik tartışılabilir.
- Benzerlik ≤ 3 olan replikalar ayrıca `verify` listesindedir (REP-06); bu rapor onların analizini yapar, doğrulamaz.


## Tüm replikalar

| Replika | Kod | Formasyon · build-up · hat | Bulgu (şiddet kod) |
|---|---|---|---|
| delbosque_real_2000 | `BhcrvxKndhdA` | 5-2-1-2 · BALANCED · 42 | bilgi no_anchor_info |
| hitzfeld_bayern_2001 | `DxdthwcS2FPC` | 3-4-1-2 · BALANCED · 40 | bilgi no_anchor_info |
| delbosque_real_2002 | `kY8EL#cYwCwk` | 4-2-3-1 (2) · BALANCED · 48 | bilgi striker_line_no_runner |
| ancelotti_milan_2003 | `1w%@V6m7BRR1` | 4-1-2-1-2 (2) · BALANCED · 50 | — |
| mourinho_porto_2004 | `AxZKoEaKNeMC` | 4-1-2-1-2 (2) · BALANCED · 64 | — |
| benitez_liverpool_2005 | `eY2#V%%Eoc6d` | 4-2-3-1 (2) · BALANCED · 42 | — |
| rijkaard_barcelona_2006 | `LBkVEhm1XnYt` | 4-3-3 (2) · SHORT_PASSING · 64 | — |
| ancelotti_milan_2007 | `uwGUckPA6%qt` | 4-3-2-1 · BALANCED · 46 | — |
| ferguson_united_2008 | `?BXeo&3wi6b?` | 4-3-3 (2) · BALANCED · 50 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner |
| guardiola_barcelona_2009 | `SBrQ7KL4e8f1` | 4-3-3 (2) · SHORT_PASSING · 72 | uyarı corridor_no_width[LEFT] |
| mourinho_inter_2010 | `mY?QgU#s#uK&` | 4-2-3-1 (2) · COUNTER · 35 | — |
| guardiola_barcelona_2011 | `hB6@ARaHUL%G` | 4-3-3 (2) · SHORT_PASSING · 92 | uyarı corridor_no_width[LEFT]; bilgi striker_line_no_runner |
| dimatteo_chelsea_2012 | `BYZh@tZ#b9FM` | 4-2-3-1 (2) · COUNTER · 15 | uyarı no_runner_for_counter; bilgi striker_line_no_runner |
| heynckes_bayern_2013 | `JZh34br78JmL` | 4-2-3-1 (2) · BALANCED · 66 | — |
| ancelotti_real_2014 | `qAD#LudwPKep` | 4-3-3 (2) · BALANCED · 45 | uyarı corridor_no_width[LEFT]; bilgi no_anchor_info |
| luisenrique_barcelona_2015 | `JBiHyZ597xmL` | 4-3-3 (2) · BALANCED · 66 | uyarı no_anchor |
| zidane_real_2016 | `yALQT8NGXSux` | 4-3-3 (2) · BALANCED · 46 | — |
| zidane_real_2017 | `FxeruPgZatxF` | 4-1-2-1-2 (2) · BALANCED · 52 | — |
| zidane_real_2018 | `soEWTWsABM#r` | 4-3-1-2 · BALANCED · 42 | — |
| klopp_liverpool_2019 | `NBmrkj$hZX6g` | 4-3-3 (2) · COUNTER · 76 | bilgi striker_line_no_runner |
| flick_bayern_2020 | `xZJ7LDMmVR22` | 4-2-3-1 (2) · BALANCED · 95 | risk wing_gap_overlap[LEFT]; uyarı no_anchor |
| tuchel_chelsea_2021 | `V5w@FBucLDxV` | 3-4-2-1 · BALANCED · 50 | bilgi no_anchor_info |
| ancelotti_real_2022 | `kA9CWu@K#igi` | 4-3-3 (2) · BALANCED · 38 | uyarı corridor_no_width[LEFT]; bilgi striker_line_no_runner |
| guardiola_city_2023 | `@JXFVRwFxF9h` | 4-1-4-1 · SHORT_PASSING · 70 | uyarı no_anchor |
| ancelotti_real_2024 | `AxZqxW1mLg8@` | 4-1-2-1-2 (2) · BALANCED · 46 | bilgi no_anchor_info |
| luisenrique_psg_2025 | `2BPUgmqqpmqb` | 4-3-3 (2) · SHORT_PASSING · 93 | bilgi striker_line_no_runner; uyarı no_anchor; bilgi narrow_shape |
| cuper_valencia_2001 | `c4289iEEnY#q` | 4-4-2 · COUNTER · 36 | bilgi midfield_thin |
| toppmoller_leverkusen_2002 | `z#LBJjM7Azw&` | 4-1-4-1 · BALANCED · 62 | — |
| deschamps_monaco_2004 | `z4NxNb8F?TnC` | 4-4-2 · COUNTER · 45 | — |
| wenger_arsenal_2004 | `HJhxRrPZhFMH` | 4-4-1-1 (2) · BALANCED · 55 | — |
| pellegrini_villarreal_2006 | `Kxj&TC?Wcqmq` | 4-1-2-1-2 (2) · SHORT_PASSING · 50 | uyarı no_anchor |
| spalletti_roma_2007 | `4YQcH#pgcY8Y` | 4-2-3-1 (2) · SHORT_PASSING · 55 | bilgi striker_line_no_runner |
| wenger_arsenal_2008 | `E5eiNS$weiA$` | 4-4-2 · SHORT_PASSING · 62 | bilgi midfield_thin |
| benitez_liverpool_2009 | `nY@R?zYRzD&n` | 4-2-3-1 (2) · BALANCED · 48 | — |
| klopp_dortmund_2013 | `eZ2otiA#CGSz` | 4-2-3-1 (2) · COUNTER · 93 | — |
| simeone_atletico_2014 | `14PBeb5rAzZD` | 4-4-2 · COUNTER · 35 | bilgi midfield_thin |
| rodgers_liverpool_2014 | `LxkZ7b7TWznd` | 4-1-2-1-2 (2) · COUNTER · 66 | uyarı no_anchor |
| allegri_juventus_2015 | `&oMA$YNfAcwz` | 4-3-1-2 · BALANCED · 46 | uyarı no_anchor |
| ranieri_leicester_2016 | `i48u7Yj#te2v` | 4-4-2 · COUNTER · 25 | uyarı corridor_no_width[RIGHT]; bilgi midfield_thin; bilgi no_anchor_info |
| jardim_monaco_2017 | `U5ua9q?o28gm` | 4-4-2 · COUNTER · 64 | bilgi midfield_thin |
| allegri_juventus_2017 | `uYG4$4#hhqKt` | 4-2-3-1 (2) · BALANCED · 42 | bilgi no_anchor_info |
| guardiola_city_2018 | `cB1i1M@UPaK@` | 4-3-3 (2) · SHORT_PASSING · 76 | — |
| tenhag_ajax_2019 | `KZiupU$8uqnt` | 4-2-3-1 (2) · SHORT_PASSING · 74 | bilgi striker_line_no_runner |
| pochettino_tottenham_2019 | `WxvAHkGoLgTX` | 4-1-2-1-2 (2) · BALANCED · 62 | uyarı no_anchor |
| klopp_liverpool_2020 | `LBkpyTrffV#%` | 4-3-3 (2) · BALANCED · 78 | bilgi striker_line_no_runner |
| inzaghi_inter_2023 | `YxzYxwiwaAVX` | 5-3-2 · BALANCED · 46 | bilgi no_anchor_info |
| alonso_leverkusen_2024 | `j5?t6M8sxJQF` | 3-4-2-1 · SHORT_PASSING · 68 | uyarı no_anchor |
| inzaghi_inter_2025 | `TxufspVrV9PR` | 5-3-2 · BALANCED · 38 | bilgi no_anchor_info |
| flick_barcelona_2025 | `mZ?M1wBaiEys` | 4-2-3-1 (2) · BALANCED · 96 | — |
| irureta_deportivo_2004 | `zYLdFXjFVTPz` | 4-2-3-1 (2) · BALANCED · 50 | — |
| cruyff_barcelona_1992 | `PBotGzB@rLcz` | 4-3-3 (2) · SHORT_PASSING · 80 | uyarı corridor_no_width[LEFT]; bilgi striker_line_no_runner; uyarı no_anchor |
| sacchi_milan_1989 | `m5AyfQ6w7Eyr` | 4-4-2 · BALANCED · 88 | bilgi midfield_thin; uyarı no_anchor |
| capello_milan_1994 | `85W#kk1E#4Y9` | 4-4-2 · BALANCED · 58 | bilgi midfield_thin |
| kovacs_ajax_1972 | `wBJWfg&kjw$V` | 4-3-3 (2) · SHORT_PASSING · 93 | bilgi striker_line_no_runner; risk wing_gap_overlap[LEFT]; uyarı no_anchor |
| herrera_inter_1965 | `WAwA8cHq4SCi` | 4-4-2 (2) · COUNTER · 20 | bilgi midfield_thin |
| lobanovskyi_dynamokyiv_1986 | `f55r4jSRDfsj` | 4-4-2 · BALANCED · 80 | bilgi midfield_thin; uyarı no_anchor |
| lobanovskyi_dynamokyiv_1999 | `EBcu9SksPsgH` | 4-1-3-2 · BALANCED · 74 | bilgi midfield_thin |
| vangaal_ajax_1995 | `gR5maK&Gcc?E` | 4-3-3 (4) · SHORT_PASSING · 82 | uyarı no_anchor |
| ferguson_manutd_1999 | `@5ZLfjTVhdD@` | 4-4-2 · BALANCED · 55 | bilgi midfield_thin; bilgi no_anchor_info |
| mourinho_chelsea_2005 | `kA9o668q%gQk` | 4-3-3 (2) · BALANCED · 52 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner |
| conte_juventus_2014 | `Mpm4Cwg6@2QM` | 3-1-4-2 · BALANCED · 55 | bilgi no_anchor_info |
| conte_chelsea_2017 | `DBeFkvvJ1R3C` | 3-4-3 · BALANCED · 45 | bilgi no_anchor_info |
| guardiola_bayern_2014 | `mB@qAWZeYMDK` | 4-3-3 (2) · SHORT_PASSING · 82 | uyarı corridor_no_width[RIGHT]; uyarı no_anchor |
| bielsa_athletic_2012 | `fB4hVDDJSHbk` | 4-3-3 (2) · BALANCED · 94 | bilgi striker_line_no_runner |
| mourinho_realmadrid_2012 | `?ZWsPiyQiaa%` | 4-2-3-1 (2) · COUNTER · 50 | bilgi no_anchor_info |
| spalletti_napoli_2023 | `UBtW1iEGnEx3` | 4-3-3 (2) · SHORT_PASSING · 74 | uyarı no_anchor |
| klopp_dortmund_2012 | `hZ5PonDNFJN2` | 4-2-3-1 (2) · COUNTER · 92 | — |
| simeone_atletico_2021 | `@pZLfPPwNBL?` | 3-1-4-2 · BALANCED · 40 | — |
| ancelotti_chelsea_2010 | `FxeRrpfZfNhH` | 4-1-2-1-2 (2) · BALANCED · 66 | — |
| benitez_valencia_2004 | `xYJ7S9Ka8Rdx` | 4-2-3-1 (2) · BALANCED · 52 | — |
| sarri_napoli_2018 | `qBDUEee8f#3%` | 4-3-3 (2) · SHORT_PASSING · 80 | bilgi striker_line_no_runner; uyarı no_anchor |
| sarri_empoli_2015 | `Spqe62rF$U@1` | 4-3-1-2 · SHORT_PASSING · 76 | uyarı no_anchor |
| italiano_fiorentina_2023 | `$Z9Ps3WRAtaK` | 4-2-3-1 (2) · SHORT_PASSING · 93 | — |
| italiano_bologna_2025 | `tZFb&@G6S1ay` | 4-2-3-1 (2) · BALANCED · 92 | — |
| dezerbi_brighton_2023 | `DZbHiT&vXHx$` | 4-2-3-1 (2) · SHORT_PASSING · 68 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner |
| dezerbi_sassuolo_2021 | `NZ$XsfP@@LLv` | 4-2-3-1 (2) · SHORT_PASSING · 70 | uyarı no_anchor |
| gasperini_atalanta_2020 | `35S1udbFdj78` | 3-4-2-1 · BALANCED · 95 | bilgi striker_line_no_runner |
| gasperini_atalanta_2024 | `55U5p$d@f$F@` | 3-4-2-1 · BALANCED · 96 | bilgi striker_line_no_runner |
| bielsa_leeds_2020 | `ZJxnvJpDMhmf` | 4-1-4-1 · BALANCED · 96 | — |
| michel_girona_2024 | `TBsZ&jDN@xQ1` | 4-3-3 (2) · SHORT_PASSING · 70 | uyarı no_anchor |
| motta_bologna_2024 | `HJfLQr6zbtkp` | 4-1-4-1 · SHORT_PASSING · 66 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner; uyarı no_anchor |
| nagelsmann_leipzig_2020 | `vxJZVZDdtd7z` | 3-4-1-2 · BALANCED · 80 | uyarı no_anchor |
| slot_feyenoord_2023 | `oBBuJYL6dW1M` | 4-3-3 (2) · SHORT_PASSING · 80 | — |
| postecoglou_celtic_2023 | `kB9id2UU#yh#` | 4-3-3 (2) · SHORT_PASSING · 86 | uyarı corridor_no_width[LEFT]; uyarı no_anchor |
| iraola_bournemouth_2025 | `uZGcNAHjS2rD` | 4-2-3-1 (2) · COUNTER · 94 | risk wing_gap_overlap[LEFT] |
| favre_dortmund_2019 | `&YMa76$#nSw&` | 4-2-3-1 (2) · BALANCED · 54 | — |
| emery_villarreal_2021 | `14PBd@mnBRp&` | 4-4-2 · BALANCED · 45 | bilgi midfield_thin |
| zeman_pescara_2012 | `rBEpMded?zAx` | 4-3-3 (2) · BALANCED · 97 | uyarı no_anchor |
| garcia_lille_2011 | `EBdGc6esmswG` | 4-3-3 (2) · BALANCED · 68 | — |
| pochettino_southampton_2014 | `hZ5hw1EzDp%m` | 4-2-3-1 (2) · BALANCED · 92 | bilgi striker_line_no_runner |
| schmidt_salzburg_2014 | `&hN?%BWmH2JK` | 4-2-2-2 · COUNTER · 97 | — |
| hasenhuttl_leipzig_2017 | `qhDUQW%c9sv@` | 4-2-2-2 · COUNTER · 95 | — |
| terim_galatasaray_2000 | `xwK@3JR5jz9A` | 4-1-2-1-2 (2) · COUNTER · 40 | — |
| terim_galatasaray_2013 | `5wSD@DZDdBW5` | 4-1-2-1-2 (2) · BALANCED · 50 | — |
| buruk_galatasaray_2024 | `LZjRaR89vvY%` | 4-2-3-1 (2) · BALANCED · 72 | — |
| zico_fenerbahce_2008 | `&YM696%oYQg&` | 4-2-3-1 (2) · BALANCED · 52 | — |
| kocaman_fenerbahce_2011 | `sYE29w%AGKor` | 4-2-3-1 (2) · BALANCED · 46 | — |
| kartal_fenerbahce_2024 | `#Zg#vYrikSVq` | 4-2-3-1 (2) · SHORT_PASSING · 64 | bilgi striker_line_no_runner |
| lucescu_besiktas_2003 | `k4?oVsUswggy` | 4-4-2 · COUNTER · 38 | bilgi midfield_thin |
| gunes_besiktas_2017 | `8ZUmLGtwgY5M` | 4-2-3-1 (2) · COUNTER · 54 | — |
| sergen_besiktas_2021 | `85WmKk$kHmo8` | 4-4-2 · BALANCED · 52 | — |
| avci_trabzonspor_2022 | `pYBH@7qRDLtp` | 4-2-3-1 (2) · BALANCED · 55 | bilgi striker_line_no_runner |
| gunes_trabzonspor_2011 | `24QEHAXAQUy1` | 4-4-2 · BALANCED · 46 | — |
| dogan_trabzonspor_2005 | `s4G48QF&?u#7` | 4-4-2 · COUNTER · 42 | bilgi no_anchor_info |
| buruk_basaksehir_2020 | `kY8krWUM#Gwj` | 4-2-3-1 (2) · BALANCED · 40 | bilgi striker_line_no_runner |
| saglam_bursaspor_2010 | `kY8q1qdu2iYj` | 4-2-3-1 (2) · BALANCED · 45 | — |

## Bulgu ayrıntıları (uyarı/risk) — kanıt sayılarıyla

### ferguson_united_2008

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.85 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.85) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### guardiola_barcelona_2009

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### guardiola_barcelona_2011

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### dimatteo_chelsea_2012

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_runner_for_counter | uyarı | BUILDUP_IS = 1 EQ 1<br>RUNBEHIND_COUNT = 0 EQ 0 | Arkaya koşan yok: Counter seçili ama arkaya koşu eğilimi yüksek (0,6 ve üstü) oyuncu sayısı 0. |

### ancelotti_real_2014

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### luisenrique_barcelona_2015

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 22 GTE 14<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### flick_bayern_2020

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 3 LT 4<br>FULLBACKS_DYFWD_MIN = 18 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### ancelotti_real_2022

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### guardiola_city_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### luisenrique_psg_2025

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 14 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### pellegrini_villarreal_2006

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 14 GTE 14 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### rodgers_liverpool_2014

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### allegri_juventus_2015

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 18 GTE 14 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### ranieri_leicester_2016

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.75 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.75) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### pochettino_tottenham_2019

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 22 GTE 14<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### alonso_leverkusen_2024

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### cruyff_barcelona_1992

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### sacchi_milan_1989

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### kovacs_ajax_1972

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 18 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### lobanovskyi_dynamokyiv_1986

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 18 GTE 14<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### vangaal_ajax_1995

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### mourinho_chelsea_2005

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### guardiola_bayern_2014

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### spalletti_napoli_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 14 GTE 14<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### sarri_napoli_2018

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### sarri_empoli_2015

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 14 GTE 14<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### dezerbi_brighton_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.75 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 0 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.75) ve bek ileri çıkmıyor (ileri çıkış 0 birim). |

### dezerbi_sassuolo_2021

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### michel_girona_2024

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### motta_bologna_2024

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### nagelsmann_leipzig_2020

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### postecoglou_celtic_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>BAND_ORDINAL = 2 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### iraola_bournemouth_2025

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |

### zeman_pescara_2012

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>REST_DEFENCE_COUNT = 3 LT 4<br>FULLBACKS_DYFWD_MIN = 22 GTE 14<br>BAND_ORDINAL = 3 GTE 2 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

