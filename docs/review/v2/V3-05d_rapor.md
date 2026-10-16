# V3-05d — SBC çözüm sayfası (/ut/sbc/:setId/:challengeId, 08 §5)

Sayfa yalnız **plan** gösterir: EA'ya istek yok, SBC gönderme / otomatik tamamlama yok; kullanıcı görevi oyunda kendisi yapar (sayfada da yazıyor).

## 0. V3-06a kalanı: öznitelik minimumları

Kariyer listesinde "Daha fazla filtre" altında katlanmış **"Öznitelik minimumları"** grubu: eski sayfanın 10 alanı (Finishing, Vision, Crossing, Acceleration, SprintSpeed, Dribbling, Stamina, Strength, DefAwareness, Heading), adres çubuğunda `oz_<Öznitelik>`, varsayılan yazılmaz, geçersiz değer (1-99 dışı, bilinmeyen anahtar) yok sayılır, sorguya `attrMin`. Testler: gidiş-dönüş + sorgu + rozet sayısı, sayfada katlı grup → istek.

## 1. Yerleşim (v3 Detay şablonu)

- Üst: "← SBC listesi", geri sayım, oy (SbcVote), set adı, **görev sekmeleri** (setteki görevler + durum Tamamlandı/Açık; yakalamada durum var, bilgi tabanında yok → "Açık"). Seçili görev adres çubuğunda (`/ut/sbc/:setId/:challengeId`); görevsiz adres ilk açık göreve yönlenir.
- **Gereksinim çipleri**: ✓ sağlanıyor / ✗ sağlanmıyor / ? doğrulanamadı. ✗ çipi düğmedir: üstüne gelince, odakta ya da dokununca sebep ("Kimya 22/25", "Takım reytingi 86/95"); sebep `aria-describedby` ile ekran okuyucuya da gider.
- **Kahraman**: çözüm sahası — kadro çekirdeğindeki saha bileşeni (`src/features/squad/SolutionPitch` → `Pitch` salt okunur, Q16). Kart üstü rozet kısa: kulüp kartı **✓**, alınacak kartta gözlenmiş fiyat kısaltılmış ("1,6K"), fiyatı bilinmeyen kartta rozet yok (ilk sürümde "✓ Kulüp" / "fiyat yok" rozeti isim şeridini kapatıyordu, çekimde görüldü, düzeltildi).
- Yan panel (Plan): **Alışveriş listesi** (alınacak kartlar; fiyat yalnız bilgi tabanı gözleminden, yoksa "fiyat yok"; toplam yalnız bilinen fiyatlar + "N kartın fiyatı bilinmiyor"; **[Kopyala]** düz metin), **"Kulüpten kullanılan: N kart (önce takas edilemeyenler: M)"**, çözücünün zorlayamadığı şartlar, **Özelleştir** (kapalı): yalnız kulüp, bütçe üst sınırı, kadrodaki kart için Kilitle / Hariç tut (+ geri al).
- **Skor tabanlı (ITEM_SCORE)**: saha yerine skor çubuğu (hedef / mevcut, `progressbar`) + kullanılacak kart listesi; mevcut StreamlinedSolver ucu (`POST /ut/sbc/streamlined`), havuz kulüp kartlarından (reyting × tür × takas durumu; fiyat yalnız bilinen). Uç oturum ister: oturumsuzken çağrılmaz, "Giriş yap".
- Durumlar: yükleniyor (iskelet), hata (yeniden dene), görev bilgisi yok ("Bu görevin şartları bilgi tabanında yok…" + listeye dön), kulüp boş ("Kulübünü senkronla" → `/ut/import`; kare görevde plan katalogdan yine gösterilir), çözüm yok ("Çözüm bulunamadı" + **Tıkayan şartlar** listesi).
- v2 arayüzünde eski çözücü sayfası kalır; v3'te yeni sayfa.

## 2. Çözücü

- Mantık kopyalanmadı: mevcut `solveTraditional` (beam search) + `sbcWorker` kullanılıyor; çekirdeğe taşınan/eklenen: `src/features/sbc/solve/` (`candidates` öncelik katmanları, `plan` şart → kısıt + tıkayan şart, `requirementStatus` çipler, `shoppingList`, `streamlinedPool`, `marketPool` — katalog havuzu çekimi `TraditionalSbc`'den taşındı, iki sayfa aynı fonksiyonu kullanıyor).
- **Kurallar GET /ut/rules'tan**: Worker kendi modül kopyasını taşıdığı için önceden Worker içinde kimya/rating hesabı **paketli kural kopyasıyla** yapılıyordu; artık ana iş parçacığındaki sunucu dokümanı her istekle Worker'a gidiyor (`solveAsync`, test). Eski v2 çözücü de bundan yararlanıyor.
- **Öncelik (maliyet katmanları)**: 0 kulüp — takas edilemez → 1 kulüp — düşük değerli önce (bilinen değer, yoksa reyting) → 2 bilgi tabanında gözlenmiş fiyatı olan en ucuz pazar kartı → 3 fiyatı bilinmeyen en düşük reytingli uygun katalog kartı. Katman tabanları bir üst katmandaki tek kartın alttaki 11 kartın toplamından pahalı olacağı kadar ayrık. Şart cezası katsayısı (`PENALTY_SCALE`) en pahalı 11'lik toplamdan büyük: önce şartlar, maliyet yalnız eşitlik bozucu (önceki katsayı maliyetle ölçeklendiği için katmanlı maliyette bir kimya puanını "ucuzluğa" feda edebilirdi).
- Aktif kadronun ilk 11 + yedekleri havuza girmez; kilitli kart çok düşük maliyetle her çözüme girer; hariç tutulan havuzdan düşer; "yalnız kulüp"te pazar yok; bütçede fiyatı bilinmeyen kart alınmaz ve bilinenlerin toplamı şart olarak sınırlanır ("Bütçe aşıldı" ihlali).
- **Zaman bütçesi ≤ 3 sn**: süre aşılırsa kalan adımlarda ışın daraltılır, çözüm yine döner (`elapsedMs`, `timedOut`).
- **Çözüm yoksa tıkayan şart**: havuz ön kontrolü ("Havuzda Premier League oyuncusu 1 (gerekli 3)", mevki eksikliği) + en iyi kadronun ihlalleri ("Takım rating'i 86 < 95").
- Fiyat: yeni toplu uç `GET /ut/kb/prices?resource=…` (backend; yalnız `price_agg` gözlemi, son kova p50 / en düşük BIN; gözlemi olmayan kart yanıtta yok, tahmin yok). Eski `estimateCoinPrice` bu sayfada kullanılmıyor.
- Deterministik testler (sentetik kulüp `tests/fixtures/sbcClubFixture.ts`, 60 kart): öncelik katmanları; takım reytingi; kimya + lig ("Premier League'den en az 3"); ülke/kulüp sayısı (en çok 4 ülke, en az 5 kulüp); skor tabanlı havuz; çözümsüz (tıkayan şart); aynı girdi aynı çözüm; yalnız kulüp + bütçe; kilit + hariç tut; çipler; alışveriş listesi + kopya metni.

## 3. Doğrulanamayan şartların arayüzdeki davranışı

| Tip | Çip | Çözücü |
|---|---|---|
| PLAYER_ATTRIBUTE | ? "Özellik şartı (doğrulanmadı)", sebep "Kart verisinden doğrulanamıyor" | zorlamaz; "Elle kontrol et" notunda |
| ACADEMY_SLOTTING (ACADEMY_PLAYER_SLOTTING) | ? "Evolution oyuncusu şartı (doğrulanmadı)" | zorlamaz; notta |
| UNKNOWN | ? EA tip adı + değer, sebep "Bilinmeyen şart: doğrulanamadı" | zorlamaz; notta |
| RARITY, RARITY_GROUP, TRADABILITY, FIRST_OWNER, LEGEND_COUNT, TEAM_STAR_RATING | ? (kart verisinde nadirlik grubu / ilk sahip / ticaret durumu yok) | zorlamaz; notta |
| Adı çözülemeyen kulüp/lig/ülke (FROM) | ? "Kulüp/lig/ülke adı çözülemedi" | bilinen adlar zorlanır |

? çipi sağlanıyor sayılmaz; plan "tüm şartlar sağlandı" demez, kullanıcı oyunda kontrol eder.

## 4. Kapılar

`scripts/sbc-solve-shots.mjs` → `docs/review/v2/screens/V3-05d/`:

- Sentetik: çözüm, skor tabanlı, çözümsüz, doğrulanamayan, kulüp boş, Özelleştir açık × 375/768/1280 × koyu/açık = 36 çekim; gerçek içe aktarılmış set (`screens/V3-05d/gercek/`) × 375/1280 × koyu/açık = 4 çekim. **40 çekim, 0 sorun**: taşma 0, axe serious/critical 0, konsol/ağ 4xx-5xx 0, sayfa minFont ≥ 11px, saha kartı minFont ≥ 11 / OVR ≥ 14, üst başlık bant sızıntısı 0 (alfa 1), çözüm çekiminde 11 kart.
- **q17/Q18 çözüm sahası**: 29 diziliş × 375/768/1280×800 = **87 kombinasyon, 0 sorun** (ölçüm `scripts/lib/pitchGate.mjs`'e taşındı; `scripts/q17.mjs` kadro sayfası için aynı fonksiyonu kullanıyor).
- Gerçek setlerden yalnız **Marquee Matchups / Como 1907 v AS Roma** kare görevi bilgi tabanında dizilişle var (içe aktarılan 27 görevin çoğu set açılmadan yakalandığı için şartsız/dizilişsiz); skor tabanlı gerçek görev yok → skor görünümü sentetikle.
- Kapıda bulunup düzeltilen: çip `span`'ında `aria-label` (axe aria-prohibited-attr) → ekran okuyucu metni; kart üstü uzun rozet isim şeridini kapatıyordu → kısa rozet; dolu ama yetersiz kulüpte "Kulüp kartın yok" deniyordu → yalnız gerçekten boşken.

### Çözücü süresi

Tarayıcıda Worker'ın ölçtüğü `elapsedMs` (çekimler + q17 matrisi, 121 çözüm; havuz: 60 kulüp + katalog adayları): **p50 20 ms, p95 24 ms, en çok 64 ms** — zaman bütçesi (3 sn) hiç devreye girmedi. Ağ (katalog/fiyat istekleri) bu süreye dahil değil.

### Fiyat bilgisi olan / olmayan kart oranı

- Gerçek veri: katalogun en yüksek reytingli 300 kartında gözlenmiş fiyatı olan **0/300**; gerçek set çözümünde alınacak 2 kartın **2'sinin fiyatı bilinmiyor**. Neden: fiyat gözlemi `ut_item`'a bağlı ve yerel `ut_item` boş (V3-05c-c §4; admin `POST /ut/admin/items/sync` + katkı tekrarı gerekir). Sayfa tahmin göstermiyor: "fiyat yok", toplam 0, "N kartın fiyatı bilinmiyor".
- Sentetik: katalog adaylarının yarısının gözlenmiş fiyatı var; öncelik katmanı bilinen fiyatlı kartı bilinmeyenden önce seçiyor (test).

## Testler

- Backend: `PriceCaptureIntegrationTest` toplu fiyat ucu (önce kırmızı). Tam `mvn test` **553 test, 0 hata, 4 atlanan — normal ve ters sırada**.
- Web: **823 test**, lint 0 hata, build yeşil. Önce kırmızı: `plan.test.ts` (11), `sbcSolvePage.test.tsx` (11), `careerFilters`/`careerPlayersPage` (öznitelik minimumları). `solveAsync.test.ts` (Worker'a kural gönderimi) düzeltmeyle birlikte yazıldı, öncesinde değil.

## Açık

- Gerçek veride yalnız 1 kare görev dizilişli; daha fazla set için Web App'te SBC setlerini açıp yeniden yakalama gerekir.
- Fiyatlar için `ut_item` admin senkronu (senin tarafında, `X-Admin-Key`).
