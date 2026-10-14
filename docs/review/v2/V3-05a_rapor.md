# V3-05a — UT kart veritabanı (Katalog şablonu): ekran onayı bekliyor

**Kapsam:** `/players` UT modunda yeni `CardDatabasePage` (`src/features/cards/`); kariyer modunda mevcut `PlayersPage` aynen (V3-06). Kararlar: EA render yok (kendi çerçevemiz), promo/çok-versiyon veri modeli ayrı iş, oyuncu sayfası rotası 05b'de `/ut/players/:assetId` (şimdilik kartlar `/players/:id`'ye gider).

- **Filtre çubuğu (yapışkan cam, ≥820 px):** arama, sıralama (OVR, isim, yaş, zayıf ayak, hareket), Izgara/Tablo anahtarı, 12 mevki çipi (çoklu seçim), "Daha fazla filtre" (futbol, lig, uyruk, ayak, OVR aralığı, zayıf ayak ≥, hareket ≥; süzgeç varsa açık gelir). Mobilde arama + "Filtreler (n)" düğmesi → alttan sheet (`MobileSheet`, Radix Dialog, opak yüzey); mevki çipleri yatay kaydırılan tek satır. Tüm süzgeçler adres çubuğunda (`?mevki=ST&ovrmin=88&gorunum=table`), varsayılanlar yazılmaz.
- **Izgara:** `PlayerCard` (md, kendi çerçeve) + mevki · yaş + karşılaştır; blur yok (`.glass-3`). **Tablo:** yapışkan başlık, sıralanabilir başlıklar (`aria-sort`), 8 kolon.
- **Sayfalama:** `useInfiniteQuery`, 48'lik sayfalar + "48 kart daha yükle"; toplam ve gösterilen sayı `role=status`.
- **Durumlar (Q1):** iskelet, boş ("Süzgeçleri temizle"), hata ("Tekrar dene").
- **Testler:** `cardFilters.test.ts` (5: adres gidiş-dönüş, geçersiz değer, sunucu sorgusu, rozet sayısı), `cardDatabase.test.tsx` (8: ızgara, mevki sorgusu, adresten süzgeç, tablo sıralama + aria-sort, daha fazla yükle, boş, hata, mobil sheet). Web 617 test yeşil; lint + build temiz.
- **Kapılar:** `scripts/card-db-shots.mjs`: 20 çekim (ızgara, filtreli, tablo, boş, mobil sheet / masaüstü gelişmiş × koyu/açık × 375/1280): 0 yatay taşma, axe serious/critical 0, konsol/ağ hatası 0. Görüntüler `screens/V3-05a/`.

**Dürüst notlar:** "Karşılaştırma" tepsisi (mevcut global bileşen) ızgaranın alt kenarında kartların üstüne biner; V3-08'de ele alınır. Rarity/kalite/PlayStyle/fiyat süzgeçleri bu turda yok: sunucuda `ps` var ama PlayStyle listesi uç noktası ve fiyat/rarity verisi (CARD-05/07) bulunmadığından eklenmedi. Tam ekran Lighthouse ve ≥200 satır sanal liste yok: "daha fazla yükle" ile DOM büyür (20.039 kartlık katalogda 1.000+ satırda performans ölçülmedi).

## 05a-b (onay sonrası düzeltmeler)
1. **Karşılaştırma tepsisi** (tüm UT sayfaları): boşken DOM'da hiç yok; ilk oyuncuda çıkar. Masaüstünde altta sabit çubuk + eşit yükseklikte yer tutucu (`data-compare-spacer`): ölçüm, sayfa sonunda altbilgi alt kenarı çubuğun üst kenarının üstünde (çakışma yok). Mobilde çubuk yok; küçük yüzen "Karşılaştır (n)" düğmesi (genişlik < %60) → alttan sheet. "Sürükle-bırak" metni kalktı (sürükleme yalnız fareyle çubuğa bırakma olarak duruyor). Test: `CompareTray.test.tsx` (4) — önce kırmızı. Not: boş tepsi artık görünmediği için kariyer `PlayersPage`'te "sürükleyip bırakma" hedefi yalnız en az bir oyuncu varken var; her satırda zaten Karşılaştır düğmesi bulunuyor.
2. **Karttaki düğme:** `aria-label` + `title` "Karşılaştırmaya ekle"; eklenince ✓ ve "Karşılaştırmadan çıkar"; dokunma hedefi ≥ 32 px (mobilde 44).
3. **Uzun isimler:** kart ad bloğunda `truncate` + `title`=tam ad, yatay dolgu 22 → 30 px (bayrak/lig sütunlarına binmesin). Test: Kvaratskhelia + 5 uzun isim (Alexander-Arnold, Aubameyang, Szczęsny, Wijnaldum, Zinchenko).
4. **Pencereleme (yeni paket yok):** `VirtualChunk` (IntersectionObserver, ±1200 px): görünüm dışındaki 24'lük parça DOM'dan kalkar, ölçülmüş yükseklikte yer tutucu kalır; ızgara ve tablo (`<tbody>` parçaları). Test: `VirtualChunk.test.tsx` (3). **Ölçüm** (`scripts/card-db-perf.mjs`, 2.016 kart yüklü, tepeden dibe kaydırma):

| Ekran | Görünüm | Kaydırmada en çok DOM düğümü | Aynı anda satır/kart | Uzun görev (>50 ms) |
|---|---|---|---|---|
| 1280 | ızgara | 6.294 | 96 | 0 |
| 1280 | tablo | 2.176 | 96 | 0 |
| 375 | ızgara | 3.206 | 48 | 0 |
| 375 | tablo | 1.920 | 96 | 0 |

   Pencerelemesiz 2.016 kartın DOM'u yaklaşık 2.016 × ~65 düğüm ≈ 130 bin olurdu. Sayfa yüksekliği parçaların ölçülmemiş (tahmini) yüksekliğinden dolayı kaydırma sırasında az oynayabilir.
5. **Mobil tablo:** OVR ve Oyuncu sütunları (başlık dahil) yatay kaydırmada sabit (`sticky left-0` / `left-14`, opak zemin).
6. **Çekimler:** 28 (ızgara, filtreli, tablo, boş, sheet/gelişmiş, tepsi × 375/1280 × koyu/açık): 0 taşma, axe serious/critical 0, konsol/ağ hatası 0, tepsi geometri kontrolleri yeşil. Web 631 test, lint + build temiz.
