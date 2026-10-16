# E3-9 — replikalar: tacticCode ve analiz bulguları

112 replika (yer tutucu `ucl_winner_2026_tbd` hariç). `tacticCode` sunucuda `EaTacticCodec` ile üretildi ve decode edilince seed ayarlarıyla (formasyon, build-up, hat, 11 × mevki/rol/focus) **birebir** aynı çıktı (`ReplicaSeedIntegrationTest`, 106/106). Analiz etiketsizdir: formasyon konumları + replikanın rolleri + build-up + hat (oyuncu yok; oyuncu gerektiren kurallar çalışmaz).

## Özet

- Uyarı/risk üreten replika: **17 / 112**; yalnız bilgi ya da bulgusuz: 95
- Kural başına bulgu sayısı: striker_line_no_runner 13 · midfield_thin 13 · corridor_no_width 12 · wing_gap_overlap 3 · no_anchor_info 3 · no_runner_for_counter 1 · narrow_shape 1 · no_anchor 1

## Uyarı/risk üreten replikalar (veri mi kural mı? incelenecek)

| Replika | Formasyon · build-up · hat | Benzerlik | Uyarı/risk kodları |
|---|---|---|---|
| ferguson_united_2008 (Manchester United 2007-08, Sir Alex Ferguson) | 4-3-3 (2) · BALANCED · 50 | 4/5 | corridor_no_width[RIGHT] (uyarı) |
| guardiola_barcelona_2009 (FC Barcelona 2008-09, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 72 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| guardiola_barcelona_2011 (FC Barcelona 2010-11, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 92 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| dimatteo_chelsea_2012 (Chelsea 2011-12, Roberto Di Matteo) | 4-2-3-1 (2) · COUNTER · 15 | 4/5 | no_runner_for_counter (uyarı) |
| ancelotti_real_2014 (Real Madrid 2013-14, Carlo Ancelotti) | 4-3-3 (2) · BALANCED · 45 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| flick_bayern_2020 (Bayern Münih 2019-20, Hansi Flick) | 4-2-3-1 (2) · BALANCED · 95 | 4/5 | wing_gap_overlap[LEFT] (risk) |
| ancelotti_real_2022 (Real Madrid 2021-22, Carlo Ancelotti) | 4-3-3 (2) · BALANCED · 38 | 3/5 | corridor_no_width[LEFT] (uyarı) |
| ranieri_leicester_2016 (Leicester City 2015-16, Claudio Ranieri) | 4-4-2 · COUNTER · 25 | 5/5 | corridor_no_width[RIGHT] (uyarı) |
| cruyff_barcelona_1992 (FC Barcelona 1991-92, Johan Cruyff) | 4-3-3 (2) · SHORT_PASSING · 80 | 3/5 | corridor_no_width[LEFT] (uyarı) |
| kovacs_ajax_1972 (AFC Ajax 1971-72, Ștefan Kovács) | 4-3-3 (2) · SHORT_PASSING · 93 | 3/5 | wing_gap_overlap[LEFT] (risk) |
| lobanovskyi_dynamokyiv_1986 (Dinamo Kyiv 1985-86, Valeriy Lobanovskyi) | 4-4-2 · BALANCED · 80 | 3/5 | no_anchor (uyarı) |
| mourinho_chelsea_2005 (Chelsea 2004-05, José Mourinho) | 4-3-3 (2) · BALANCED · 52 | 4/5 | corridor_no_width[RIGHT] (uyarı) |
| guardiola_bayern_2014 (FC Bayern München 2013-14, Pep Guardiola) | 4-3-3 (2) · SHORT_PASSING · 82 | 4/5 | corridor_no_width[RIGHT] (uyarı) |
| dezerbi_brighton_2023 (Brighton & Hove Albion 2022-23, Roberto De Zerbi) | 4-2-3-1 (2) · SHORT_PASSING · 68 | 3/5 | corridor_no_width[RIGHT] (uyarı) |
| motta_bologna_2024 (Bologna FC 2023-24, Thiago Motta) | 4-1-4-1 · SHORT_PASSING · 66 | 3/5 | corridor_no_width[RIGHT] (uyarı) |
| postecoglou_celtic_2023 (Celtic 2022-23, Ange Postecoglou) | 4-3-3 (2) · SHORT_PASSING · 86 | 4/5 | corridor_no_width[LEFT] (uyarı) |
| iraola_bournemouth_2025 (AFC Bournemouth 2024-25, Andoni Iraola) | 4-2-3-1 (2) · COUNTER · 94 | 3/5 | wing_gap_overlap[LEFT] (risk) |
## Değerlendirme: kural mı veri mi?

- **no_anchor (1)**: tetikleyen bacaklar: FULLBACKS_DYFWD_MIN + HIGH_LINE_THIN_REST → 1. Kural kararı (Buğra): hat bacağı "hat ≥ HIGH VE geri savunma < 5"; çapa tanımı d ≥ 0,8 roller + tüm Deep-Lying Playmaker focus'ları.
- **striker_line_no_runner (13)**: forvet hattında arkaya koşan (runBehind ≥ 0,4) yok; şiddet bilgi, çoğu Poacher/Target/False 9 kullanan klasik forvet düzeni: veri hatası değil, rol seçimi gerçekçi (kural bilgi kalmalı).
- **corridor_no_width / wing_gap_overlap**: replikaların bilinçli kanat/bek mekanizmalarını (içe kesen kanat + bek bindirmesi) işaret eder; seed'deki gerçek şekille uyumlu, veri hatası görünmüyor; eşik tartışılabilir.
- Benzerlik ≤ 3 olan replikalar ayrıca `verify` listesindedir (REP-06); bu rapor onların analizini yapar, doğrulamaz.


## Karar 1-2 etkisi: eski "hat ≥ HIGH" bacağıyla uyarı alan 13 replika

İki değişiklik: (1) hat bacağı artık "hat ≥ HIGH VE geri savunma < 5"; (2) Deep-Lying Playmaker (her focus) çapa sayılır.

| Replika | Geri savunma | DLP | Çözen | Şimdiki bulgu |
|---|---|---|---|---|
| guardiola_city_2023 | 6 | CDM Build-Up | hat bacağı (geri savunma 6 ≥ 5) + DLP çapa | yok |
| rodgers_liverpool_2014 | 5 | CDM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| alonso_leverkusen_2024 | 5 | CM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| cruyff_barcelona_1992 | 6 | CDM Build-Up | hat bacağı (geri savunma 6 ≥ 5) + DLP çapa | yok |
| sacchi_milan_1989 | 6 | CM Build-Up | hat bacağı (geri savunma 6 ≥ 5) + DLP çapa | yok |
| vangaal_ajax_1995 | 6 | — | hat bacağı (geri savunma 6 ≥ 5) | no_anchor_info |
| guardiola_bayern_2014 | 5 | CDM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| sarri_napoli_2018 | 5 | CDM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| dezerbi_sassuolo_2021 | 5 | CDM Build-Up, CDM Roaming | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| michel_girona_2024 | 5 | CDM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| motta_bologna_2024 | 5 | CDM Build-Up | hat bacağı (geri savunma 5 ≥ 5) + DLP çapa | yok |
| nagelsmann_leipzig_2020 | 6 | — | hat bacağı (geri savunma 6 ≥ 5) | no_anchor_info |
| postecoglou_celtic_2023 | 6 | CDM Build-Up | hat bacağı (geri savunma 6 ≥ 5) + DLP çapa | yok |

Her 13 vakada geri savunma ≥ 5: yalnız (1) bile uyarıyı kaldırır; DLP olanlarda (2) "çapa yok" bilgisini de kaldırır (11 replika: bulgu kalmadı); DLP olmayan van Gaal Ajax 1995 ve Nagelsmann Leipzig 2020 yalnız bilgi seviyesine düştü.

## Tüm replikalar

| Replika | Kod | Formasyon · build-up · hat | Bulgu (şiddet kod) |
|---|---|---|---|
| delbosque_real_2000 | `BhcrvxKndhdA` | 5-2-1-2 · BALANCED · 42 | — |
| hitzfeld_bayern_2001 | `DxdthwcS2FPC` | 3-4-1-2 · BALANCED · 40 | — |
| delbosque_real_2002 | `kY8EL#cYwCwk` | 4-2-3-1 (2) · BALANCED · 48 | bilgi striker_line_no_runner |
| ancelotti_milan_2003 | `1w%@V6m7BRR1` | 4-1-2-1-2 (2) · BALANCED · 50 | — |
| mourinho_porto_2004 | `AxZKoEaKNeMC` | 4-1-2-1-2 (2) · BALANCED · 64 | — |
| benitez_liverpool_2005 | `eY2#V%%Eoc6d` | 4-2-3-1 (2) · BALANCED · 42 | — |
| rijkaard_barcelona_2006 | `LBkVEhm1XnYt` | 4-3-3 (2) · SHORT_PASSING · 64 | — |
| ancelotti_milan_2007 | `uwGUckPA6%qt` | 4-3-2-1 · BALANCED · 46 | — |
| ferguson_united_2008 | `?BXeo&3wi6b?` | 4-3-3 (2) · BALANCED · 50 | uyarı corridor_no_width[RIGHT] |
| guardiola_barcelona_2009 | `SBrQ7KL4e8f1` | 4-3-3 (2) · SHORT_PASSING · 72 | uyarı corridor_no_width[LEFT] |
| mourinho_inter_2010 | `mY?QgU#s#uK&` | 4-2-3-1 (2) · COUNTER · 35 | — |
| guardiola_barcelona_2011 | `hB6@ARaHUL%G` | 4-3-3 (2) · SHORT_PASSING · 92 | uyarı corridor_no_width[LEFT] |
| dimatteo_chelsea_2012 | `BYZh@tZ#b9FM` | 4-2-3-1 (2) · COUNTER · 15 | uyarı no_runner_for_counter; bilgi striker_line_no_runner |
| heynckes_bayern_2013 | `JZh34br78JmL` | 4-2-3-1 (2) · BALANCED · 66 | — |
| ancelotti_real_2014 | `qAD#LudwPKep` | 4-3-3 (2) · BALANCED · 45 | uyarı corridor_no_width[LEFT] |
| luisenrique_barcelona_2015 | `JBiHyZ597xmL` | 4-3-3 (2) · BALANCED · 66 | — |
| zidane_real_2016 | `yALQT8NGXSux` | 4-3-3 (2) · BALANCED · 46 | — |
| zidane_real_2017 | `FxeruPgZatxF` | 4-1-2-1-2 (2) · BALANCED · 52 | — |
| zidane_real_2018 | `soEWTWsABM#r` | 4-3-1-2 · BALANCED · 42 | — |
| klopp_liverpool_2019 | `NBmrkj$hZX6g` | 4-3-3 (2) · COUNTER · 76 | — |
| flick_bayern_2020 | `xZJ7LDMmVR22` | 4-2-3-1 (2) · BALANCED · 95 | risk wing_gap_overlap[LEFT] |
| tuchel_chelsea_2021 | `V5w@FBucLDxV` | 3-4-2-1 · BALANCED · 50 | — |
| ancelotti_real_2022 | `kA9CWu@K#igi` | 4-3-3 (2) · BALANCED · 38 | uyarı corridor_no_width[LEFT] |
| guardiola_city_2023 | `@JXFVRwFxF9h` | 4-1-4-1 · SHORT_PASSING · 70 | — |
| ancelotti_real_2024 | `AxZqxW1mLg8@` | 4-1-2-1-2 (2) · BALANCED · 46 | — |
| luisenrique_psg_2025 | `2BPUgmqqpmqb` | 4-3-3 (2) · SHORT_PASSING · 93 | bilgi narrow_shape |
| cuper_valencia_2001 | `c4289iEEnY#q` | 4-4-2 · COUNTER · 36 | bilgi midfield_thin |
| toppmoller_leverkusen_2002 | `z#LBJjM7Azw&` | 4-1-4-1 · BALANCED · 62 | — |
| deschamps_monaco_2004 | `z4NxNb8F?TnC` | 4-4-2 · COUNTER · 45 | — |
| wenger_arsenal_2004 | `HJhxRrPZhFMH` | 4-4-1-1 (2) · BALANCED · 55 | — |
| pellegrini_villarreal_2006 | `Kxj&TC?Wcqmq` | 4-1-2-1-2 (2) · SHORT_PASSING · 50 | — |
| spalletti_roma_2007 | `4YQcH#pgcY8Y` | 4-2-3-1 (2) · SHORT_PASSING · 55 | bilgi striker_line_no_runner |
| wenger_arsenal_2008 | `E5eiNS$weiA$` | 4-4-2 · SHORT_PASSING · 62 | bilgi midfield_thin |
| benitez_liverpool_2009 | `nY@R?zYRzD&n` | 4-2-3-1 (2) · BALANCED · 48 | — |
| klopp_dortmund_2013 | `eZ2otiA#CGSz` | 4-2-3-1 (2) · COUNTER · 93 | — |
| simeone_atletico_2014 | `14PBeb5rAzZD` | 4-4-2 · COUNTER · 35 | bilgi midfield_thin |
| rodgers_liverpool_2014 | `LxkZ7b7TWznd` | 4-1-2-1-2 (2) · COUNTER · 66 | — |
| allegri_juventus_2015 | `&oMA$YNfAcwz` | 4-3-1-2 · BALANCED · 46 | — |
| ranieri_leicester_2016 | `i48u7Yj#te2v` | 4-4-2 · COUNTER · 25 | uyarı corridor_no_width[RIGHT]; bilgi midfield_thin |
| jardim_monaco_2017 | `U5ua9q?o28gm` | 4-4-2 · COUNTER · 64 | bilgi midfield_thin |
| allegri_juventus_2017 | `uYG4$4#hhqKt` | 4-2-3-1 (2) · BALANCED · 42 | — |
| guardiola_city_2018 | `cB1i1M@UPaK@` | 4-3-3 (2) · SHORT_PASSING · 76 | — |
| tenhag_ajax_2019 | `KZiupU$8uqnt` | 4-2-3-1 (2) · SHORT_PASSING · 74 | bilgi striker_line_no_runner |
| pochettino_tottenham_2019 | `WxvAHkGoLgTX` | 4-1-2-1-2 (2) · BALANCED · 62 | — |
| klopp_liverpool_2020 | `LBkpyTrffV#%` | 4-3-3 (2) · BALANCED · 78 | — |
| inzaghi_inter_2023 | `YxzYxwiwaAVX` | 5-3-2 · BALANCED · 46 | — |
| alonso_leverkusen_2024 | `j5?t6M8sxJQF` | 3-4-2-1 · SHORT_PASSING · 68 | — |
| inzaghi_inter_2025 | `TxufspVrV9PR` | 5-3-2 · BALANCED · 38 | — |
| flick_barcelona_2025 | `mZ?M1wBaiEys` | 4-2-3-1 (2) · BALANCED · 96 | — |
| irureta_deportivo_2004 | `zYLdFXjFVTPz` | 4-2-3-1 (2) · BALANCED · 50 | — |
| cruyff_barcelona_1992 | `PBotGzB@rLcz` | 4-3-3 (2) · SHORT_PASSING · 80 | uyarı corridor_no_width[LEFT] |
| sacchi_milan_1989 | `m5AyfQ6w7Eyr` | 4-4-2 · BALANCED · 88 | bilgi midfield_thin |
| capello_milan_1994 | `85W#kk1E#4Y9` | 4-4-2 · BALANCED · 58 | bilgi midfield_thin |
| kovacs_ajax_1972 | `wBJWfg&kjw$V` | 4-3-3 (2) · SHORT_PASSING · 93 | risk wing_gap_overlap[LEFT] |
| herrera_inter_1965 | `WAwA8cHq4SCi` | 4-4-2 (2) · COUNTER · 20 | bilgi midfield_thin |
| lobanovskyi_dynamokyiv_1986 | `f55r4jSRDfsj` | 4-4-2 · BALANCED · 80 | bilgi midfield_thin; uyarı no_anchor |
| lobanovskyi_dynamokyiv_1999 | `EBcu9SksPsgH` | 4-1-3-2 · BALANCED · 74 | bilgi midfield_thin |
| vangaal_ajax_1995 | `gR5maK&Gcc?E` | 4-3-3 (4) · SHORT_PASSING · 82 | bilgi no_anchor_info |
| ferguson_manutd_1999 | `@5ZLfjTVhdD@` | 4-4-2 · BALANCED · 55 | bilgi midfield_thin; bilgi no_anchor_info |
| mourinho_chelsea_2005 | `kA9o668q%gQk` | 4-3-3 (2) · BALANCED · 52 | uyarı corridor_no_width[RIGHT] |
| conte_juventus_2014 | `Mpm4Cwg6@2QM` | 3-1-4-2 · BALANCED · 55 | — |
| conte_chelsea_2017 | `DBeFkvvJ1R3C` | 3-4-3 · BALANCED · 45 | — |
| guardiola_bayern_2014 | `mB@qAWZeYMDK` | 4-3-3 (2) · SHORT_PASSING · 82 | uyarı corridor_no_width[RIGHT] |
| bielsa_athletic_2012 | `fB4hVDDJSHbk` | 4-3-3 (2) · BALANCED · 94 | — |
| mourinho_realmadrid_2012 | `?ZWsPiyQiaa%` | 4-2-3-1 (2) · COUNTER · 50 | — |
| spalletti_napoli_2023 | `UBtW1iEGnEx3` | 4-3-3 (2) · SHORT_PASSING · 74 | — |
| klopp_dortmund_2012 | `hZ5PonDNFJN2` | 4-2-3-1 (2) · COUNTER · 92 | — |
| simeone_atletico_2021 | `@pZLfPPwNBL?` | 3-1-4-2 · BALANCED · 40 | — |
| ancelotti_chelsea_2010 | `FxeRrpfZfNhH` | 4-1-2-1-2 (2) · BALANCED · 66 | — |
| benitez_valencia_2004 | `xYJ7S9Ka8Rdx` | 4-2-3-1 (2) · BALANCED · 52 | — |
| sarri_napoli_2018 | `qBDUEee8f#3%` | 4-3-3 (2) · SHORT_PASSING · 80 | — |
| sarri_empoli_2015 | `Spqe62rF$U@1` | 4-3-1-2 · SHORT_PASSING · 76 | — |
| italiano_fiorentina_2023 | `$Z9Ps3WRAtaK` | 4-2-3-1 (2) · SHORT_PASSING · 93 | — |
| italiano_bologna_2025 | `tZFb&@G6S1ay` | 4-2-3-1 (2) · BALANCED · 92 | — |
| dezerbi_brighton_2023 | `DZbHiT&vXHx$` | 4-2-3-1 (2) · SHORT_PASSING · 68 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner |
| dezerbi_sassuolo_2021 | `NZ$XsfP@@LLv` | 4-2-3-1 (2) · SHORT_PASSING · 70 | — |
| gasperini_atalanta_2020 | `35S1udbFdj78` | 3-4-2-1 · BALANCED · 95 | bilgi striker_line_no_runner |
| gasperini_atalanta_2024 | `55U5p$d@f$F@` | 3-4-2-1 · BALANCED · 96 | bilgi striker_line_no_runner |
| bielsa_leeds_2020 | `ZJxnvJpDMhmf` | 4-1-4-1 · BALANCED · 96 | — |
| michel_girona_2024 | `TBsZ&jDN@xQ1` | 4-3-3 (2) · SHORT_PASSING · 70 | — |
| motta_bologna_2024 | `HJfLQr6zbtkp` | 4-1-4-1 · SHORT_PASSING · 66 | uyarı corridor_no_width[RIGHT]; bilgi striker_line_no_runner |
| nagelsmann_leipzig_2020 | `vxJZVZDdtd7z` | 3-4-1-2 · BALANCED · 80 | bilgi no_anchor_info |
| slot_feyenoord_2023 | `oBBuJYL6dW1M` | 4-3-3 (2) · SHORT_PASSING · 80 | — |
| postecoglou_celtic_2023 | `kB9id2UU#yh#` | 4-3-3 (2) · SHORT_PASSING · 86 | uyarı corridor_no_width[LEFT] |
| iraola_bournemouth_2025 | `uZGcNAHjS2rD` | 4-2-3-1 (2) · COUNTER · 94 | risk wing_gap_overlap[LEFT] |
| favre_dortmund_2019 | `&YMa76$#nSw&` | 4-2-3-1 (2) · BALANCED · 54 | — |
| emery_villarreal_2021 | `14PBd@mnBRp&` | 4-4-2 · BALANCED · 45 | bilgi midfield_thin |
| zeman_pescara_2012 | `rBEpMded?zAx` | 4-3-3 (2) · BALANCED · 97 | — |
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
| dogan_trabzonspor_2005 | `s4G48QF&?u#7` | 4-4-2 · COUNTER · 42 | — |
| buruk_basaksehir_2020 | `kY8krWUM#Gwj` | 4-2-3-1 (2) · BALANCED · 40 | bilgi striker_line_no_runner |
| saglam_bursaspor_2010 | `kY8q1qdu2iYj` | 4-2-3-1 (2) · BALANCED · 45 | — |
| daum_fenerbahce_2005 | `qYCoz2byEGmq` | 4-2-3-1 (2) · BALANCED · 54 | bilgi striker_line_no_runner |
| denizli_besiktas_2009 | `jY7psnUrF@fi` | 4-2-3-1 (2) · BALANCED · 46 | — |
| gerets_galatasaray_2006 | `7xU5sfUhGj@8` | 4-1-2-1-2 (2) · BALANCED · 63 | — |
| cimsir_trabzonspor_2020 | `wY#a26hC8%cw` | 4-2-3-1 (2) · BALANCED · 52 | — |
| delbosque_real_2003 | `Chb%r&yW&g?C` | 4-2-2-2 · BALANCED · 54 | — |
| mancini_city_2012 | `FheFuzdQ@tZm` | 4-2-2-2 · SHORT_PASSING · 57 | — |

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

### flick_bayern_2020

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.9 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.9) ve o tarafta savunma görevi düşük (0.3). |

### ancelotti_real_2022

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### ranieri_leicester_2016

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.75 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.75) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### cruyff_barcelona_1992

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |

### kovacs_ajax_1972

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |

### lobanovskyi_dynamokyiv_1986

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| no_anchor | uyarı | ANCHOR_COUNT = 0 EQ 0<br>FULLBACKS_DYFWD_MIN = 18 GTE 14<br>HIGH_LINE_THIN_REST = 1 GTE 1 | Çapa yok ve savunma korumasız: perde yapan orta saha yok; geri savunma, bekin ileri çıkışı ya da hat yüksekliği riski büyütüyor. |

### mourinho_chelsea_2005

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 2 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 2 birim). |

### guardiola_bayern_2014

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |

### dezerbi_brighton_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.75 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 0 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.75) ve bek ileri çıkmıyor (ileri çıkış 0 birim). |

### motta_bologna_2024

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [RIGHT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sağ koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |

### postecoglou_celtic_2023

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| corridor_no_width [LEFT] | uyarı | SIDE_WINGER_CUTIN_MAX = 0.9 GTE 0.6<br>SIDE_FULLBACK_DYFWD_MAX = 3 LTE 5 | sol koridorda genişlik yok: kanat oyuncusu içe kesiyor (içe kesme eğilimi 0.9) ve bek ileri çıkmıyor (ileri çıkış 3 birim). |

### iraola_bournemouth_2025

| Kod | Şiddet | Kanıt | Kullanıcı metni |
|---|---|---|---|
| wing_gap_overlap [LEFT] | risk | SIDE_FULLBACK_DYFWD_MAX = 28 GTE 20<br>SIDE_WINGER_W_MAX = 0.92 GTE 0.8<br>SIDE_DEF_DUTY_MAX = 0.3 LT 0.35 | sol kanatta açık: bek ileri çıkıyor (28 birim), kanat oyuncusu çizgide (genişlik 0.92) ve o tarafta savunma görevi düşük (0.3). |

