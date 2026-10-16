# V3-06e — Gelişim (v3) + Masa düzeltmeleri

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-06e/`:

| Klasör | İçerik | Çekim |
|---|---|---:|
| `growth/` | Gelişim | 36 |
| `desk/` + `menu/` | Masa regresyonu | 54 |

## 0. Masa düzeltmeleri

- **a) Rozet:** zayıf halka kartlarında "Seviyesine göre %N" düz metni yerine `FitBadge` (durum + yüzde; diğer ekranlarla aynı fitLabels rozeti).
- **b) "3 iş" tekrar etmiyor:**
  - `deskRules.rankActions` tüm işleri öncelik sırasıyla veriyor; `suggestActions = rankActions().slice(0, 3)`. v2 aynı sonucu alıyor (test).
  - v3 Masa, "Zayıf halkalar"da gösterilen slotların FILL işlerini çıkarıp ilk 3'ü alıyor. Filtre yalnız v3 Masa'da.
  - Liste sıradaki işlerle doluyor: kiralık, satış, sözleşme, derinlik.
  - "Sözleşme" işi yeni bir kural değil. V3-06d'deki sözleşme uyarısının kuralı ve eşiği (oyun tarihine göre ≤ 6 ay, `lib/contract`).
  - Sözleşme işi yalnız oyun tarihi verilince üretiliyor; v2 Masa vermediği için v2 değişmedi.
  - Önceliği `35 + (6 − kalan ay)`: satıştan (40+) düşük, derinlikten yüksek. Bu öncelik değeri bu görevde verildi.

## 1–2. Gelişim (v3, `/career/growth`)

v3'te `GrowthPage`; v2 `CareerGrowthPage` v2 için kaldı.

### Veri kaynakları (yalnız mevcut uçlar)

`squad`, `snapshots`, `snapshotDiff` (`from`/`to`), `playerHistory`. Yeni puanlama ya da projeksiyon yok; eski gelişim ucu çağrılmıyor (test).

**Tek ek (API CONTRACT CHANGE):** mevcut `snapshots` ve `history` yanıtlarına `gameDate` eklendi.
- Kayıt anındaki oyun tarihi zaten `career_snapshot.game_date`'e yazılıyordu (V25/V27), ama yanıta konmuyordu.
- Bilinmiyorsa alan yok.
- Kırmızı IT önce: `CareerDeskIntegrationTest.snapshotsAndHistoryCarryTheGameDateOfEachSnapshot`.

### Eksen kararı

- Geçmişin **her** noktasında oyun tarihi varsa x = oyun tarihi; ölçek gün, ilk kayıttan itibaren, eksen başlığı "Oyun tarihi".
- Tek bir nokta bile eksikse x = içe aktarma sırası (1, 2, 3…), eksen başlığı "İçe aktarma sırası".
- Karışık ölçek yok (`historySeries`).

### Yerleşim (08 §10)

- **Oyuncu seçici:** kadro listesi; seçim adreste `?oyuncu=id` (eski `?player=` bağlantıları da açılıyor). Kariyer oyuncu sayfasının Gelişim sekmesindeki "Gelişim takibi" bağlantısı `?oyuncu=` ile geliyor.
- **Kahraman grafik:** OVR düz çizgi, POT kesikli çizgi. Noktalar fare ve klavyeyle odaklanıyor; tooltip'te tarih/sıra, OVR ve POT var (`<title>` de).
- **Plato uyarısı:** `--warn` renginde çerçeve ve metin ("Plato: … potansiyeline ulaştı (70/70)…"), `role="status"`. Kural tek kaynak: `deskRules.isPlateau` (≤ 24 yaş, OVR ≥ POT). Masa uyarısı da artık aynı fonksiyonu kullanıyor (test).
- **En çok yükselenler / Düşenler:**
  - Yatay bar grafikler, ayrı listeler; en çok 8 satır.
  - Fark: `snapshotDiff`'in CHANGED satırlarının OVR farkı. Yükselenler azalan sırada, düşenler en çok düşen başta, eşitlikte ada göre.
  - Aralık seçici: "Son iki içe aktarma" (varsayılan) ya da "Sezon başı → şimdi". İkincisi yalnız sezon verisi varsa ve aralık en az iki kayıt içeriyorsa görünüyor; son kaydın sezonundaki ilk kayıttan son kayda kadar.
- **Boş durumlar:**
  - tek içe aktarma: "Gelişimi görmek için en az iki içe aktarma gerekir." + İçe aktar bağlantısı; fark isteği atılmıyor
  - oyuncunun geçmişi yok
  - hata (yeniden dene)

### Grafik bileşeni ve erişilebilirlik

- `GrowthCharts.tsx`: kendi SVG'miz, yeni paket yok, lazy yükleniyor (ayrı parça, 6,4 kB / gzip 2,4 kB).
- **Ölçek:** `viewBox` kabın gerçek genişliğinden kuruluyor (ResizeObserver, 1 birim = 1 px). Böylece yazılar ölçeklenmiyor; 375px'te de eksen ve bar yazıları 12px.
- **x etiketleri:** sığdığı kadar etiket çiziliyor; ilk ve son her zaman, son etikete 84px'ten yakın ara etiket çizilmiyor.
- **Ekran okuyucu:** her svg `role="img"` ve özet etiket taşıyor, örneğin "OVR 52 → 58, POT 68; 4 içe aktarma, oyun tarihine göre" ya da "Patrick Mlynarski +14, Owen Taylor +2, …". Eksi için gerçek "−" işareti.
- **Tablo:** her grafikte "Tablo olarak göster" aynı veriyi tabloya çeviriyor (başlıklı; test aynı değerleri doğruluyor).
- **Renkler** (11 §3 token'ları): OVR `--accent`, POT `--ink-2` kesikli, ızgara `--glass-border`, yazı `--ink-2`/`--ink`, yükselen `--good`, düşen `--bad`. Değer her zaman metin olarak da var; renk tek başına anlam taşımıyor.

## 3. Testler (önce kırmızı)

**Web — yeni testler:**
- `growthData.test.ts` (5):
  - oyun tarihi ekseni
  - sıra ekseni
  - yükselen/düşen sıralaması
  - sezon başı aralığı
  - plato tek kaynak (Masa uyarısıyla aynı)
- `growthPage.test.tsx` (9):
  - seçim ↔ URL
  - grafik etiketi + eksen + tablo aynı veri
  - plato var/yok
  - yükselen/düşen + tablo
  - aralık seçici → `snapshotDiff(from, to)`
  - tek içe aktarma
  - geçmiş yok / hata
  - eski uç yok

**Web — güncellenen testler:**
- `careerPlayerPage.test.tsx`: Gelişim bağlantısı `?oyuncu=`.
- `deskRules.test.ts`: `rankActions`, sözleşme işi yalnız oyun tarihiyle.
- `careerDeskPage.test.tsx`: FitBadge; 3 iş tekrar etmiyor.

**Toplam:**
- Web **938 test**, lint 0 hata (34 uyarı, değişmedi), build yeşil.
- Backend **573 test, 0 hata, 5 atlanan**, normal ve ters sırada.

## 4. Kapılar

**`scripts/growth-shots.mjs`** (yeni): **36 çekim, 0 sorun.**
- **Durumlar:** çok kayıtlı oyuncu, kaydırılmış, platodaki oyuncu, tablo görünümü açık, sezon başı → şimdi, tek kayıt (boş durum); 375/768/1280 × koyu/açık.
- **Çoklu kayıt fikstürle değil, uygulamanın kendi uçlarıyla gerçek üretildi.** Yerel kayıtlarda çoklu LE içe aktarması yok. Geçici kapı hesabının kariyerinde 4 kez sırayla:
  1. oyun tarihi + sezon `PATCH`'lendi (2 sezon),
  2. OVR/POT elle güncellendi (`PUT /players/ratings` → MANUAL snapshot).

  Platodaki oyuncu son kayıtta OVR = POT yapılarak üretildi. Hesap koşu sonunda silindi. Grafikte bu noktalar "içe aktarma" olarak sayılıyor; kaynakları elle güncelleme.
- **Ölçümler:** taşma 0, axe serious/critical 0, konsol/ağ hatası 0, sayfa minFont 12px, svg yazıları en küçük 12px, bant sızıntısı 0, eksen etiketi çakışması 0.
- **Kapıda bulunup düzeltilen:** 375px'te son iki x etiketi üst üste biniyordu. Etiket seçimi düzeltildi, kapıya çakışma ölçümü eklendi. Not: bu ölçümün eski sürümde hatayı gösterdiği ayrıca koşturulamadı; karşılaştırma koşusu yanlışlıkla düzeltilmiş sürümle yapıldı.

**Masa regresyonu** (`desk-shots.mjs --out V3-06e`): **54 çekim, 0 sorun.**
- Zayıf halka kartlarında FitBadge görünüyor.
- "3 iş" zayıf halkaları (GK, LB) tekrar etmiyor; kiralık işleriyle doluyor.
- Menü aktif öğeleri doğru.
