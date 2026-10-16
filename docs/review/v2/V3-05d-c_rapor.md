# V3-05d-c — Kart adları, çözücü maliyeti, fiyat gözlemi tekrarı

## 1. Sahada kart adı (Q18)

**Kök neden:** çekimlerdeki "14", "29", "52" kapının kendi **sentetik kulübünden** geliyordu (adlar "Kapı Oyuncu 14"; kart soyad olarak son sözcüğü gösteriyordu). Kapı yalnız şeridin görünürlüğünü ölçtüğü için yakalamadı. Senin gerçek dosyanda 139 kulüp kartının hepsi adlı (players.json 20.034 tanım, kesilmemiş); ama tanımsız bir yakalamada kart `#<assetId>` gösterirdi.

**Düzeltme (her yerde):** ad EA assetId → katalog (`GET /players/assets`), sayfadaki tüm kartlar için tek istekte toplanan önbellekle (`lib/assetNames`). `PlayerCard` assetId taşıyan her kartta bunu kullanır; metin listeleri `CardName` ile: çözüm sahası, Kadrom (tablo), Kadro kurucu (kart paneli ve saha), tek kart teslimi listesi, Özelleştir listesi. Öncelik: katalog adı → yakalanan gerçek ad → **mevki + reyting** ("ST 84", title "Ad bilinmiyor"). Şerit harf içeren son sözcüğü gösterir; yalnız rakam ya da "#…" asla gösterilmez.

**Kapı güçlendirildi:** `pitchGate` (q17 kadro sahası + SBC çözüm sahası): şerit yalnız rakam/"#" olamaz. SBC gerçek set çekimlerinde kulüp **yerel katalogdan** kuruldu ve yakalanan ad verilmedi (`#assetId`): her kulüp kartının şeridi katalogdaki soyadla eşleşmeli → **10 görevde 0 uyuşmazlık**.

## 2. Çözücü maliyeti (değerli kartları koru)

- **Değer vekili tek yerde** (`valueProxy`): gözlenmiş fiyat varsa o; yoksa reytinge göre kesin artan değer (mevcut coinPrice eğrisi, 90 üstü katlanarak). Takas edilemez kart ×0,5 (indirim, mutlak öncelik değil: takas edilemez 86 > takas edilebilir 75). Fiyatı bilinmeyen kart artık maliyetsiz değil.
- Kulüp kartının maliyeti = değer vekili × (1 − transfer vergisi); vergi kurallardan (`GET /ut/rules` `transferTax` 0,05). Gerekçe: kartı satsan eline geçecek olan bu; aynı değerde pazardan almak yerine kulüp kartı seçilir. (Görev metninde yoktu; eşitlikte gereksiz satın almayı önlemek için eklendi.)
- **"Özel kartları koru"** (varsayılan açık, Özelleştir'de kapatılabilir): rareflag > 1 ya da ICON/HERO/HOF kulüp kartı ×1000 maliyet — yalnız şart gerektirirse seçilir. Şart cezası katsayısı 1e12: şartlar her zaman önce.
- Testler (önce kırmızı): "tam Altın 11" — gereksiz yüksek reyting yok, 86 seçilmiyor, takas edilemez 76 takas edilebilir 76'dan önce, özel kart yok; özel kart yalnız şart gerektirdiğinde (Özel FC'den en az 1); değer vekili artan/indirimli; kulüp vs pazar vergisi. Mevcut takım reytingi testleri yeşil.
- Plan paneli değer vekilini göstermiyor: "Kulüpten kullanılan: N kart · En değerli: 82".

**Gerçek setlerde en değerli kullanılan kart** (kulüp: yerel katalogdan 15 mevki × 8 reyting, 3 özel kart; 1280 koyu):

| Set / görev | Kulüpten | En değerli | Özel kart |
|---|---|---|---|
| Future Stars Challenge 2 | 5 | 78 | yok |
| 3x 79+ Upgrade | 5 | 78 | yok |
| Marquee / Como v Roma (eski satır) | 6 | 78 | yok |
| Gold Upgrade | 5 | 78 | yok |
| Silver Upgrade | 11 | 73 | yok |
| Bronze Upgrade | 3 | 62 | yok |
| Marquee / Leipzig v Frankfurt | 5 | 76 | yok |
| Marquee / Como v Roma | 6 | 76 | yok |
| Marquee / Real Madrid v Villarreal | 8 | 76 | yok |
| Marquee / Liverpool v Man City | 4 | 78 | yok |

Not: değer en aza indirildiği için plan, kulüpteki daha yüksek reytingli kart yerine pazardaki daha düşük reytingli kartı almayı da seçebiliyor (ör. Gold Upgrade: kulüpte 76/78 varken 75 alınıyor). Alınacak 52 kartın 15'inin fiyatı gözlemli.

## 3. Fiyat gözlemi tekrarı

- Doğal anahtar: katkıcı + kart + platform + tür + fiyat + gözlem zamanı. `ux_price_obs_natural` (V37) + `ON CONFLICT DO NOTHING`; yalnız yazılan gözlem sayılır. Kırmızı test: aynı yük iki kez → sayı değişmez, ikinci katkıda 0 kayıt. Canlı: aynı dosya tekrar → 0 yeni gözlem.
- Mevcut tekrarlar (onaylı protokol): dry-run 1.544 satır / 745 tekil anahtar / **799 silinecek** (beklenen ~772'den fazla: aynı yakalamada aynı kartın aynı anda aynı fiyatlı 27 ilanı da aynı doğal anahtara düşüyor) → yedek `backups/pre-v305dc-price-dedupe-20261015-223827.dump` → tek transaction (799 değilse geri alır) → **1.544 → 745**. `price_agg` zamanlanmış işle yeniden hesaplandı: 610 kova (değişmedi), toplam örnek **1.520 → 735**. Sonra V37 temiz tabloya uygulandı.

## 4. Plan paneli

Alınacak kart yoksa yalnız "Alınacak kart yok" (Toplam ve Kopyala yok).

## Kapılar ve testler

- `scripts/sbc-solve-shots.mjs --sets 4,5,6,36,47,49`: **102 çekim, 0 sorun** (9 formasyonlu görev + 1 eski satır sahalı, 2 tek kart; sentetik 9 durum); q17 çözüm sahası **87 kombinasyon, 0 sorun**; kadro sahası `scripts/q17.mjs --mode ut` **348 kombinasyon, 0 sorun** (yeni ad kuralıyla). Çözücü p95 93 ms.
- Backend tam `mvn test` **562 test, 0 hata, 4 atlanan — normal ve ters sırada**. Web **840 test**, lint 0 hata, build yeşil.
