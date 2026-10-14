# V3-05a — UT kart veritabanı (Katalog şablonu): ekran onayı bekliyor

**Kapsam:** `/players` UT modunda yeni `CardDatabasePage` (`src/features/cards/`); kariyer modunda mevcut `PlayersPage` aynen (V3-06). Kararlar: EA render yok (kendi çerçevemiz), promo/çok-versiyon veri modeli ayrı iş, oyuncu sayfası rotası 05b'de `/ut/players/:assetId` (şimdilik kartlar `/players/:id`'ye gider).

- **Filtre çubuğu (yapışkan cam, ≥820 px):** arama, sıralama (OVR, isim, yaş, zayıf ayak, hareket), Izgara/Tablo anahtarı, 12 mevki çipi (çoklu seçim), "Daha fazla filtre" (futbol, lig, uyruk, ayak, OVR aralığı, zayıf ayak ≥, hareket ≥; süzgeç varsa açık gelir). Mobilde arama + "Filtreler (n)" düğmesi → alttan sheet (`MobileSheet`, Radix Dialog, opak yüzey); mevki çipleri yatay kaydırılan tek satır. Tüm süzgeçler adres çubuğunda (`?mevki=ST&ovrmin=88&gorunum=table`), varsayılanlar yazılmaz.
- **Izgara:** `PlayerCard` (md, kendi çerçeve) + mevki · yaş + karşılaştır; blur yok (`.glass-3`). **Tablo:** yapışkan başlık, sıralanabilir başlıklar (`aria-sort`), 8 kolon.
- **Sayfalama:** `useInfiniteQuery`, 48'lik sayfalar + "48 kart daha yükle"; toplam ve gösterilen sayı `role=status`.
- **Durumlar (Q1):** iskelet, boş ("Süzgeçleri temizle"), hata ("Tekrar dene").
- **Testler:** `cardFilters.test.ts` (5: adres gidiş-dönüş, geçersiz değer, sunucu sorgusu, rozet sayısı), `cardDatabase.test.tsx` (8: ızgara, mevki sorgusu, adresten süzgeç, tablo sıralama + aria-sort, daha fazla yükle, boş, hata, mobil sheet). Web 617 test yeşil; lint + build temiz.
- **Kapılar:** `scripts/card-db-shots.mjs`: 20 çekim (ızgara, filtreli, tablo, boş, mobil sheet / masaüstü gelişmiş × koyu/açık × 375/1280): 0 yatay taşma, axe serious/critical 0, konsol/ağ hatası 0. Görüntüler `screens/V3-05a/`.

**Dürüst notlar:** "Karşılaştırma" tepsisi (mevcut global bileşen) ızgaranın alt kenarında kartların üstüne biner; V3-08'de ele alınır. Rarity/kalite/PlayStyle/fiyat süzgeçleri bu turda yok: sunucuda `ps` var ama PlayStyle listesi uç noktası ve fiyat/rarity verisi (CARD-05/07) bulunmadığından eklenmedi. Tam ekran Lighthouse ve ≥200 satır sanal liste yok: "daha fazla yükle" ile DOM büyür (20.039 kartlık katalogda 1.000+ satırda performans ölçülmedi).
