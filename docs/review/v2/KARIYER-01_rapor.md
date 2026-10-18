# KARIYER-01 — canlı manuel test bulguları ve kariyer içe aktarma düzeltmeleri (rapor)

Kaynak: Buğra'nın canlı test notları + `live_editor_18-10-2026main_menu.log` (iki dışa aktarım: 00:51 kariyer içinden, 01:37 güncellemesiz ana menüden).
Canlıda yalnız oturumsuz sayfalar gezildi (orada hesap açılmaz/şifre girilmez); kariyer akışları yerelde test hesabı + bu log ile birebir üretildi.

## Kök nedenler ve düzeltmeler

| Bulgu | Kök neden | Düzeltme |
|---|---|---|
| "Kariyer verisi bulunamadı" | (A) Log'da birden çok dışa aktarım varken sunucu **sonuncuyu** alıyordu (ana menü, kariyer yok). (B) Betik 2.0.0 `jval()` boolean'ı `null` yazıyordu → `inCareer:null` → "kariyer dışı" | Ayrıştırıcı türüne göre seçer: kariyer içe aktarımı en son kariyer dışa aktarımını, temel veri yüklemesi en son ana menü (`BASE`) dışa aktarımını; `inCareer` boşsa oyun tarihi/kariyer tablosu kariyer sayılır (eski log'lar da çalışır). Betik 2.0.1 boolean yazar. Akan seçim: bellekte en çok iki dışa aktarım |
| Kiralıklar alınmamış, Masa/Bütçe/oyun tarihi boş, kiralık gelene "kirala" önerisi | (A)'nın sonucu: ana menü aktarımında `playerloans` ve takvim yok | Aynı düzeltme. Gerçek log'da: oyun tarihi 2026-09-12, kadro 31 |
| Transfer/kiralık listesi isteği | — | Yeni `GET /careers/{id}/moves` + Kadro → Hareketler'de "Kayda göre hareketler": kariyer kaydı ile oyunun ana kaydı farkı (bedel yok). Gerçek log: 9 gelen transfer, 4 gelen kiralık (3'ü sezon başından), 1 yeni oyuncu (altyapı), 7 giden transfer, 1 giden kiralık |
| Ouazane "bizim" görünüyor | Kariyer kaydında Ouazane gerçekten Port Vale kadro bağlantısında, kiralık kaydı yok → **gelen transfer (Ajax'tan)** | Betik ön sözleşme tablosunu (`career_presignedcontract`) okuyamıyor: ön sözleşmeyse ayırt edilemez — **sana soru** |
| Gelişim'de oyuncu açılır menüsü beyaz, oyuncu yok | Seçici yarı saydam cam zeminde; Windows Chrome yerel listeyi beyaz zemine açık renk yazıyla çiziyor | Tüm `select` seçenekleri opak tema zemini + tema yazı rengi (`--option-bg`) |
| Oyuncular kartlarında "OYUNCU" | Ana menü aktarımındaki Classic XI efsaneleri (Klasik Lig 2255, adsız) kariyer listesine girmişti; kart "Oyuncu #…"u gerçek ad sayıyordu | Doğru aktarım seçilince kariyerde yoklar; temel veri yüklemesi Klasik Lig'i hariç tutar; kart adsız oyuncuda "mevki + OVR" gösterir |
| "Oyuncu #203244" | FC27 dışa aktarımında isim tablosu yok | Katalogda adı bilinen oyuncuların isim kimliklerinden sözlük (oyunda tek isim tablosu): bu log'da adsız 67 → ~24 çözüldü; kalanlar arayüzde "Adı bilinmiyor" (API istemcisinde tek yerde). Yeniden içe aktarmada önceden adsız kalanlar adlanır |
| Filtreler kaydırmada sorun | "Daha fazla filtre" açıkken yapışkan panel 511 px (900 px ekranda) sonuçları örtüyordu | Açıkken panel sayfayla kayar, kapalıyken yapışkan; panel ekran yüksekliğiyle sınırlı. Ara adımda eklediğim `overscroll-contain` fare paneldeyken sayfa kaydırmasını kilitledi: ölçümle yakalandı, kaldırıldı |
| Potansiyel var, OVR yok | **Yeniden üretilemedi**: liste (600), kadro (31), wonderkid (40) içinde OVR boş oyuncu yok | Hangi ekranda gördüğünü sor |
| (yeni) Hızlı gezinmede "Kayıt ol" görünmesi | Kullanıcı başına dakikada 120 API isteği doluyor; `/me` 429 alınca başlık çıkış yapılmış gibi davranıyordu | Genel sınır 300/dk, görseller ayrı kova (1200/dk); `/me` 429'da 3 kez yeniden dener; oturum varken başlık "Kayıt ol" yerine yer tutucu |
| (yeni) Kiralık giden oyuncuda "Kadronda" | Sözleşme yanıtı kiralık yönünü ayırmıyordu | `loanedOut` alanı: çip "Kiralıkta", sözleşmede "Kiralık verildi / geldi" |

## EA kart görselleri

- Sunucu üzerinden: `GET /api/v1/img/card/{EA kimliği}` → varsayılan kaynak `https://ratings-images-prod.pulse.ea.com/FC27/components/items/{id}_tr-TR.webp`. Tarayıcı yalnız bizim adresimizi görür (kullanıcı IP'si EA'ya gitmez, CSP `img-src 'self'` aynı). Bellek önbelleği 128 MB, kartı olmayan oyuncu 24 saat hatırlanır, EA'ya eşzamanlı en çok 8 istek.
- Kart yoksa 200 + 1×1 saydam görsel (`X-Card-Image: missing`); web kendi kart tasarımını gösterir (konsola hata düşmez).
- Yalnız katalog/kariyer ızgarası ve kariyer oyuncu sayfası. UT'de özel sürümler (TOTW vb.) taban görselle karışmasın diye, sahadaki küçük kartlarda okunmadığı için kapalı.
- **Uyarı:** EA kartı oyuncunun EA'daki reytingini gösterir; kariyerde gelişen OVR farklı olabilir (sayısal OVR sayfada ayrıca var).
- Yayından kaldırma anahtarı: Railway'de `FCAREER_CATALOG_CARD_IMAGE_URL_TEMPLATE` boş verilirse kapanır. Yerel compose'da **varsayılan kapalı**.
- Görselin gerçekten geldiğini EA'ya istek atmadığım için doğrulayamam: canlıda Oyuncular sayfasında sen kontrol et.

## Ana veri (karışma şüphesi)

DB katalogu ana menü aktarımıyla karşılaştırıldı: ~1.700 oyuncuda kulüp/OVR farkı var ama kariyer imzası yok (kulüp farkı olan 1.777'den 3'ü kariyerle aynı, Port Vale'e kayan 0; OVR farkının 335'i kariyerle aynı, 1.338'i değil). Fark kaynaktan: katalog EA reyting sitesinden (güncel kadro), ana menü güncellemesiz oyun verisi. Yükleme yolu runbook 13. adımda (yedek → `import-base` + `overwrite=true` → kariyer log'unu yeniden içe aktar). Uç nokta artık yalnız ana menü aktarımını kabul eder; kariyer aktarımını reddeder.

## Kural ihlali (bildirim)

Yerelde yalnız web'i yeniden başlatırken compose backend'i ortam değişkenleri olmadan yeniden oluşturdu ve kart görseli vekili ~5 dakika **açık** kaldı. O arada çalıştırdığım kaydırma ölçümü Oyuncular sayfasını iki kez açtı. Yani yerel backend büyük olasılıkla EA görsel sunucusundan (ratings-images-prod.pulse.ea.com) ~48 kart görseli istedi; başarılı istekler loglanmadığı için kesin sayı yok. Fark edince kapattım. Compose'da varsayılan kapalı yapıldı; testlerde (`IntegrationTest`) vekil zaten kapalı.

## Diğer

- Yükleme sınırı 25 MB → 64 MB (LE log'u birikir; dışa aktarım başına ~11 MB).
- Betik değişti: web'deki indirme kopyası eşitlendi (2.0.1, sha256 güncel). Kariyerden yeni dışa aktarım alırken yeni betiği indir.
- Testler: yeni/değişen backend testleri (ayrıştırıcı seçimi 5, betik 1, hareketler 2, Klasik Lig 1, isim sözlüğü 1, kart vekili 4 + uç nokta 1, hız sınırı 1); CI sıra bağımlılığı: replika testi oyuncuyu adla seçiyordu, katalog filtresi eklendi.
