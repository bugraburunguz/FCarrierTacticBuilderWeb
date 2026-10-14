# V3-05b-b — V3-05a/05b ekran onayı sonrası düzeltmeler

1. **Yapışkan yüzeyler (Q5):** kart veritabanı filtre çubuğu ve UT oyuncu versiyon şeridi `glass-sticky` (= mevcut `--sheet-bg`, alfa 0,97; yeni token yok). Şerit önceden yalnız kendisini saran bir `div` içinde sticky olduğundan hiç yapışmıyordu; artık kart bölümünün doğrudan çocuğu. Ölçüm (`scripts/lib/readability.mjs` → `stickyCover`): arka plan alfası (computed) ≥ 0,92 ve yüzey kutusunda 15 noktada `elementFromPoint` en üstte yüzeyin kendisi; yüzey gizlenince aynı noktalarda kart/ızgara bulunur (arkadan geçiyor ama görünmüyor). 1280 ızgara 1.200px: 15/15 nokta üstte, 15 noktada altta kart; 375/768 oyuncu sayfası: şerit top 54, altta kart.
2. **Mobil UT oyuncu (<820px):** kart 180px ortalı; versiyon şeridi + "başka versiyon yok" aynı satırda; zayıf ayak/hareket/ayak tek satır; Karşılaştır başlık satırında. Sekme çubuğu üst kenarı 375×812'de **636px** (≤ 640). Mobil çekimler tam sayfa.
3. **Roller:** FitBadge "%95" (tek yerden; kariyer de). Satırda "Seviyesine göre %N" kaldırıldı, sekme başında tek HelpPopover (`ROLES_HELP`, `lib/fitLabels.ts`). "Biçilmiş kaftan" mevki başına yalnız en iyi role ve yalnız `tailored=true` ise; "Neden?" anlatımındaki ikinci çip bu ekranda kapalı (`FitNarrativeView showTailored`).
4. **Statlar:** etiketlerde ellipsis yok (`break-words`); 375/768/1280'de kesilen etiket 0 (scrollWidth ≤ clientWidth). "Savunma farkındalığı" 2 satır, "Kayarak/Ayakta müdahale" 1 satır. 375'te tek sütun.
5. **Kart okunabilirliği (Q18 her boyutta):** PlayerCard varsayılanı `minText` 11 / `minRating` 14; okunamayan öğe gizlenir (önce ülke/kulüp/lig çipleri, sonra 6 stat), ölçekli soyad okunamıyorsa gizlenir; saha kartları (minText açık) alt şerit davranışını korur.

| Ölçüm (kart içi en küçük yazı / OVR) | 375 | 768 | 1280 |
|---|---|---|---|
| Kart veritabanı ızgarası (124px kart) | 13,1 / 31,7 | 13,1 / 31,7 | 13,1 / 31,7 |
| UT oyuncu kartı | 19 / 46 (180px) | 19 / 46 (180px) | 12,4 / 23,3 (280px) |

Izgarada her görünür kartta soyad var; çipler ve 6 stat 124px kartta sığmadığı için gizli (tablo görünümü var).

**Kapılar:** `card-db-shots.mjs` 48 çekim (375/768/1280 × koyu/açık, kaydırılmış ızgara dahil) sorunlu 0; `ut-player-shots.mjs` 30 çekim (4 sekme + kaydırılmış Statlar) sorunlu 0: taşma 0, axe serious/critical 0, konsol/ağ hatası 0. Görüntüler `screens/V3-05a/`, `screens/V3-05b/`.

**Dürüst notlar:** (1) v3 üst başlık ve sol menü yapışmıyor (`.glass { position: relative }` Tailwind `sticky`'yi eziyor); bu yüzden yapışkan yüzeylerin üstündeki 48-64px'te kaydırılan içerik görünür. Kapsam dışı, V3-08 listesinde. (2) 320px'te başlıktaki bir bağlantı yatay taşma yapıyor (bu işten önce de vardı). (3) 375'te sekme payı 4px; uzun kulüp/lig adı meta satırını 3 satıra çıkarırsa sınır aşılabilir.
