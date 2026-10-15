# V3-05c — SBC listesi (/ut/sbc), Katalog şablonu

## 0. Önceki işten kalanlar
- **q17 dolu kariyer:** teardown önceden `^(gate-|q17-)` desenindeki *tüm* hesapları siliyordu; koşul ("yalnız kendi hesabı") kodda yoktu → `createGateAccount` artık yalnız açtığı hesabın tam e-postasını (`^…$`) siler. Yedek: `backups/pre-q17-20261015-023008.dump` (pg_dump -Fc, 12,8 MB, 53 tablo verisi). İlk koşuda 10/174 "sayfa yüklenmedi": kök neden yerel hız sınırı (oturumlu istekler önbelleksiz; 389 "Rate limit exceeded") → q17 her boyutta ve yeniden denemede geçici hız sınırı sayaçlarını sıfırlar (diğer kapı betikleri gibi). Son koşu: 348 kombinasyon (kariyer boş + dolu) sorunlu 0; dolu kariyer 174/174 geçerli ölçüm, minFont 11, OVR 14. V3-04 referansında dolu kariyerin yalnız 37 satırı geçerli ölçümdü; o 37'de fark 0. Sayaçlar her koşuda önce/sonra aynı: **1 kullanıcı, 2 kariyer** (teardown: 1 hesap | 1 kariyer, yalnız kendisi). Sonuç `screens/V3-05c/q17-kariyer.json`.
- **Kart tablosu:** OVR/Oyuncu sütunları yalnız <820px yapışkan ve opak (`.table-sticky-col`, medya sorgulu); ≥820px'te `position: static`, zemin yok, satır tek tonlu (tarayıcıda ölçüldü).
- **V3-07 notu:** UT kulüp sayfasının sabit 124px kartı progress'e eklendi.

## 1-2. Kapsam ve veri
v3'te `/ut/sbc` → `features/sbc/SbcListPage` (v2 `UtSbcPage`/`KbSbcList` dokunulmadı, `isV3()` ayrımı). Yapışkan opak filtre çubuğu (`glass-sticky`, `--header-h`, ≥820px) + set kartı ızgarası. Kaynak: `GET /ut/kb/sbc?active=true` (uzantı yakalamaları), oylar `GET /ut/sbc/votes` yalnız oturum varken (anonimde 401 döndüğü için çağrılmaz). EA'ya / hayran sitesine çağrı yok.

## 3. Backend (API CONTRACT CHANGE)
- **V35** `sbc_set.first_seen_at` (NOT NULL, varsayılan now(); mevcut satırlar = `updated_at`) ve `content_changed_at` (NULL). Yalnız sütun ekleme. Yerel DB'de uygulandı: Flyway 35; mevcut set `first_seen_at = updated_at`, `content_changed_at` boş (eski kayıt "Yeni" görünmez).
- **Upsert:** ilk eklemede `first_seen_at = now()`; `content_hash` değişince `content_changed_at = now()`; taslak satırın (`ensureSetStub`, özet `stub`) ilk gerçek içeriği değişiklik sayılmaz (`STUB_HASH` tek sabit).
- **DTO:** `SbcSetDto.firstSeenAt`, `contentChangedAt` (yoksa alan yok).
- **Ek (küçük):** `GET /ut/kb/items?resource=…` EA kaynak kimliğiyle süzer: ödül oyuncusunu ut_item'da tek istekte çözmek için.
- Test: `SbcSetSeenIntegrationTest` (4; önce kırmızı). Backend 527 yeşil (normal + reversealphabetical).

## 4-5. Kart, süzgeç, sıralama
- Kart: kategori, Yeni/Değişti (nötr çip + simge), ödül, ad (2 satır, tam ad title'da), "N görev", "Tekrar ∞/N", geri sayım (lucide Timer, dakikada bir, aria-live yok, title'da `Intl` yerel tarih), oy (lucide ThumbsUp, "%82"), "Çöz" → `/ut/sbc/:setId`.
- Rozet kuralları tek yerde (`sbcList.ts`: `BADGE_WINDOW_HOURS = 48`, `ENDING_SOON_HOURS = 24`).
- Sekmeler: Tümü · Yeni · Bitiyor · veriden gelen kategoriler (`SBC_CATEGORY_LABELS`; bilinmeyen ham adla). Arama (set adı, Türkçe büyük/küçük ve ı/i duyarsız). Sıralama: en yeni (ilk görülme), bitişi yakın. Adres çubuğu: `sekme`, `kategori`, `ara`, `sirala`; varsayılanlar yazılmaz. Mobilde "Filtreler" sheet'i.

## Gösterilmeyen alanlar ve nedenleri
| Alan | Neden |
|---|---|
| Tahmini maliyet, ucuz/değerli sıralaması | fiyat verisi yok (bu tur kapsam dışı) |
| Global "Sonraki yenileme" sayacı | veriden türetilemiyor |
| Paket adı | yakalamada yalnız paket kimliği var, ad kataloğu yok → "Paket" / "N paket" rozeti |
| Oyuncu ödülünün adı/rating'i (ut_item'da yoksa) | ödül yalnız kaynak kimliği taşır → "Oyuncu ödülü" rozeti |
| Coin vb. diğer ödül türleri | bu turda istenmedi; gösterilmez |
| Oy yüzdesi (anonim) | oy ucu oturum ister |
| Geri sayım (bitişi olmayan set) | veri yok |

**Varsayım (doğrulanmadı):** oyuncu ödülü türü `"item"` (değer = kaynak kimliği). Yerel veride yalnız `"pack"` örneği var (`SbcChallengeParserTest`).

## 6-8. Durumlar ve testler
İskelet, hata ("Tekrar dene"), kategori boş ("Bu kategoride aktif SBC yok."), bilgi tabanı boş (uzantı metni + HelpPopover + `/ut/import`). Fixture `tests/fixtures/sbcFixture.ts`: 14 set, 6 kategori (biri sözlükte yok), oyuncu (ut_item'da olan/olmayan) ve paket ödülü, ∞/N/tekrarsız, 2 saat / 3 gün sonra biten, Yeni ve Değişti, 6 oylu / 8 oysuz, çok uzun ad. Yerel DB'ye SBC yazılmadı. Birim 21 + bileşen 8 test; web 737 yeşil.

## 9. Kapılar (`screens/V3-05c/`)
`sbc-shots.mjs`: 34 çekim (ızgara, kaydırılmış, Bitiyor, boş, KB-boş, mobil sheet × 375/768/1280 × koyu/açık) sorunlu 0: taşma 0, axe serious/critical 0, konsol/ağ 0, sayfa minFont 12px, ödül kartı minFont 15,8px / OVR 38px, başlık + filtre bandı sızıntı 0 ve alfa 1. Oylu durum için oturum yalnız test tarayıcısında taklit edildi (sahte token + `/me`, `/careers`, `/ut/sbc/votes` yanıtı). Regresyon: 05a 54, 05b 32 çekim sorunlu 0.

**Dürüst not:** "Yeni"/"Değişti" ilk denemede ton çipleriydi (good/info-soft); açık temada aurora üstünde 4,38–4,46:1 kontrast verdi → nötr çip + renkli simge.
