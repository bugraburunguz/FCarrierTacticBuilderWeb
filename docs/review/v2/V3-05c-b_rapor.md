# V3-05c-b — SBC listesi düzeltmeleri + yakalama yöntemlerinin kapatılması

EA, FC 27 Web App'te hem uzantıyı hem geliştirici araçlarını bilerek engelliyor. Bu korumaları aşmaya yönelik hiçbir şey yapılmadı ve hiçbir metinde önerilmiyor.

1. **Sabit ödül alanı:** masaüstü 152px, mobil (<820px) 120px. Oyuncu ödülü → kendi PlayerCard'ımız (alan yüksekliğine sığan genişlik: 109 / 86px), paket → büyük Package simgesi + "Paket"/"N paket", bilinmeyen oyuncu → siluet + "Oyuncu ödülü", gösterilmeyen tür (ör. coin) → "Diğer ödül". Ad 2 satırlık sabit yükseklik, rozet satırı tek satır. Ölçüm (1280, aynı satırdaki kartların içerik yüksekliği = çocuklar + aralıklar): en büyük fark **0px** (375/768'de de 0).
2. **Tek tıklama hedefi:** kartın tamamı `/ut/sbc/:setId` bağlantısı; erişilebilir ad = set adı; görünür odak halkası (`focus-visible:ring-2` + ofset). "Çöz →" ikincil görünümlü etiket (dolu düğme değil; metin `--ink`: vurgu rengi açık temada 4,28:1 kalıyordu). Kart içinde başka etkileşimli öğe yok (test + axe nested-interactive 0).
3. **Yakalama yöntemleri kapalı (kod duruyor):** `lib/features.ts` → `captureImportEnabled()` = `VITE_CAPTURE_IMPORT === 'on'`, varsayılan kapalı. `/ut/import` bayrak kapalıyken yalnız not: "EA, FC 27 Web App'te uzantıları ve geliştirici araçlarını engelliyor; kulüp ve SBC yakalama şu an kullanılamıyor." HAR bölümü, DevTools talimatı ve uzantı yöntemi görünmez (test + kapı ölçümü). SBC listesinin KB-boş metni aynı gerçeği söyler; içe aktarmaya, uzantıya ya da HAR'a yönlendirmez. HAR-01 testleri bileşeni doğrudan (bayrak açık eşdeğeri) test etmeye devam ediyor; sayfa testi her iki bayrak durumunu kapsıyor.
4. **Kategori etiketleri (değiştirilmedi, `SBC_CATEGORY_LABELS`):**
   - Favourites → Favoriler
   - Players → Oyuncular
   - Icons → Icon
   - Upgrades → Yükseltmeler
   - Challenges → Mücadeleler
   - Foundations → Temeller
   - Exchanges → Takaslar
   - Special → Özel
   - Sözlükte olmayan kategori ham adıyla gösterilir.

**Kapılar:** SBC 34 çekim (`screens/V3-05c/`), içe aktarma 6 çekim (bayrak kapalı, `screens/V3-05c-b/import/`): taşma 0, axe serious/critical 0, konsol/ağ 0, sayfa minFont 11,5px, bant sızıntısı 0 ve alfa 1, içe aktarmada yöntem metni görünmez. Web 756 test, lint 0 hata, build.

**Not:** mobil ödül kartı 86px'te soyad ve stat 11px tabanına sığmadığı için gizli (OVR 22px, mevki görünür); masaüstü 109px'te soyad görünür, stat gizli (eşik 118px).
