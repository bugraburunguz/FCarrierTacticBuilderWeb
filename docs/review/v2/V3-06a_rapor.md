# V3-06a — Yakalama bayrakları + kariyer oyuncu listesi (v3 Katalog) + E3-10b süzgeçleri

## 0. Revizyon: UT dondurulmadı

İlk V3-06a metni "UT SBC/kulüp/fiyat dondurulsun" diyordu; EXT-07 (uzantı dar kapsam, "FC Assist") sonrası uzantı yüklüyken giriş ve yakalama çalıştığı için **dondurma yapılmadı**. Bunun yerine tek bayrak ikiye ayrıldı (web `9db1c3f`):

| Bayrak | Varsayılan | Kapsam |
|---|---|---|
| `VITE_EXTENSION_CAPTURE` | **açık** (yalnız `off` kapatır) | uzantı senkronu, yakalama dosyası içe aktarma, yakalamaya bağlı UT ekranları (SBC, Kadrom, Objective, Evolution, Kulüp içe aktar) |
| `VITE_HAR_IMPORT` | **kapalı** (yalnız `on` açar) | yalnız HAR dosyası bölümü |

- Menü gizleme ve `CaptureOnly` notu ("Kulüp ve SBC yakalama bu sürümde kapalı.") yalnız `VITE_EXTENSION_CAPTURE=off` iken.
- "EA engelliyor" notu uzantı için kaldırıldı (yalnız HAR bağlamında anlamlıydı).
- SBC bilgi tabanı boş metni: "Aktif SBC kaydı yok. Uzantı açıkken Web App'te SBC sekmesini aç; sonra İçe aktar'dan senkronla."

### UT menüsü veri kaynakları

| Menü | Veri kaynağı | Bayrak kapalıyken |
|---|---|---|
| Kart veritabanı | katalog `/players` | görünür |
| Kadro kurucu | katalog + kural seed'i (`/ut/rules`); varsa kulüp kartları (IndexedDB) | görünür |
| Meta | `seed/ut-meta.json` + katalog (UtMetaService) | görünür |
| Replikalar | replika seed'i (`/replicas`) | görünür |
| Kadrom | yakalanan kulüp kartları (utCardStore / utCaptureStore) | gizli + not |
| SBC | yakalamadan bilgi tabanı (`/ut/kb/sbc`) | gizli + not |
| Objective | objectiveStore + bilgi tabanı objective'leri | gizli + not |
| Evolution | bilgi tabanı evolution'ları + utCaptureStore | gizli + not |
| Kulüp içe aktar | yakalama (uzantı / dosya; HAR yalnız `VITE_HAR_IMPORT=on`) | gizli + not |

## 1. Kariyer oyuncu listesi (v3 Katalog)

`/players` kariyer modunda: **v3 + oturum + seçili kariyer** → `CareerPlayersPage` (havuz = kayıt dosyası, `career=`); aksi halde mevcut oyuncu araması (`playersView`, testli).

Ortak parçalar `src/features/catalog/` altında (kopya yok; kart veritabanı da bunlara taşındı, testleri değişmeden yeşil):

| Parça | İçerik |
|---|---|
| `CatalogShell` | başlık + yapışkan opak filtre çubuğu (`glass-sticky`, `--filters-h` ölçümü), `CatalogSearch`, `PositionChips`, `CatalogFiltersButton`, `MoreFilters` |
| `CatalogResults` | iskelet / hata / boş / durum satırı, `cardGridLayout` ızgara + `VirtualChunk`, tablo yuvası, "daha fazla yükle" |
| `CatalogTable` | sütun tanımlı tablo: yapışkan başlık (≥820px filtre çubuğunun altında), <820px ilk iki sütun sabit, `aria-sort`, pencereli parçalar |
| `CatalogTile` | kart hücresi (PlayerCard hücreyi doldurur) + isteğe bağlı ek satır |
| `catalogChunks` | sayfa boyutu (48), parça (24) |

Kart ve tablo: OVR, POT (aralık modunda aralık), yaş, mevki, kulüp, değer (tahminse ≈), **sözleşme (yalnız kayıtta veri varken)**, ulaşılabilirlik kovası, rol seçiliyse rol uyumu. Kart → `/players/:id`. Eski fit/roleFit uçları kullanılmıyor (ENG-M8); rol uyumu yalnız v3 motorundan sunucuda.

Süzgeçler adres çubuğunda (kart veritabanıyla aynı Türkçe anahtarlar: `ara, mevki, cins, lig, uyruk, ayak, takim, serbest, ovrmin…, degermin/degermax, butce, sozlesme, kiralik, kova, rol, sirala, yon, gorunum`).

## 2. E3-10b süzgeçleri

| Süzgeç | Durum | Not |
|---|---|---|
| Değer aralığı | **eklendi** | backend `value_min` yeni (`value_max` vardı); giriş milyon € |
| Bütçeme sığar | **eklendi** | `value_max = min(bütçe, değer en çok)`; bütçe kayıtta yoksa pasif, nedeni yazılı ve ipucu: "Bütçe kayıt dosyasında yok" (0'a çevrilmez, ENG-02). Yerel iki kariyerde bütçe var → etkin |
| Sözleşme ≤ 6 ay | **eklendi, veri yoksa gizli** | oyun tarihine göre (`contract_until ≤ current_game_date + 6 ay`, ENG-04). Yerel Crewe ve Port Vale kayıtlarında **sözleşme verisi ve oyun tarihi yok** → bu iki kariyerde gizli; facet testle veri gelince görünür |
| Kiralık | **eklendi, veri yoksa gizli** | `loan_from_team_id`; Port Vale'de 1.426 kiralık satır → görünür, Crewe'de veri yok → gizli |
| Kiralanabilir (transfer/kiralık listesinde) | **eklenmedi — veri yok** | kayıt dosyası içe aktarımında liste durumu alanı yok |
| Ulaşılabilirlik kovası (ALINABILIR/ZOR/HAYAL) | **eklendi** (sütun + süzgeç) | öneri hattının sınıflandırıcısı (`FeasibilityInputs` → `FeasibilityBuckets`, CareerRecommender ile ortak; öneri davranışı değişmedi). HAYAL varsayılan gizli değil |
| Rol uyumuna göre sırala | **eklendi** | kullanıcı rol seçer, sunucu tüm süzülmüş havuzu `FitEngineV3.currentFit` ile sıralar (`sort=role&role=`) |
| "Fırsat" sıralaması | **eklenmedi** | tanımı belirsiz (değer/OVR mi, potansiyel/bedel mi?); tanım kararı gelince |
| Lig, uyruk, ayak, takım, serbest oyuncu, futbol (erkek/kadın) | **korundu** | eski kariyer aramasında vardı; yeni sayfaya taşındı (havuzda iki futbol da var; varsayılan erkek, eski sayfa gibi) |
| Özellik en az (10 özellik) | **taşınmadı — açık** | eski sayfada vardı; Katalog çubuğuna 10 alan eklemek yerine ayrı karar (ör. "Özellikler" katlanır bölümü) |

**Karar (rol sıralaması):** rol seçilince havuz, rolün mevkisinde oynayabilen mevkilerle sınırlanır (öneri hattıyla aynı eşik: `posDist ≥ minPositionFactor` 0,85); kullanıcı mevki seçtiyse kesişim. Aksi halde kaleciler de ST rolünde sıralanırdı.

## 3. Rol sıralaması performansı

`scripts/career-list-perf.mjs` → `screens/V3-06a/perf-role-sort.json`. Geçici test hesabıyla (yalnız localhost; koşu sonunda yalnız o hesap silindi) Crewe Alexandra ve Port Vale kulüplerinde kariyer açıldı: havuz 22.314 oyuncu (kullanıcının kayıtlarıyla aynı büyüklük: 22.324 / 22.381). Kullanıcının kendi kariyerleri okunmadı (oturum bilgisi yok, ajan şifre girmez). 72 rolün her biri önbellek ısınmadan istendi.

| Kariyer | Rol sıralaması (önbelleksiz) p50 / p95 / max | 2. sayfa (önbellek) p95 | Kova süzgeci p95 | Rol + kova + değer + yaş p95 |
|---|---|---|---|---|
| Crewe Alexandra | 264 / **412** / 548 ms | 89 ms | 392 ms | 95 ms |
| Port Vale | 261 / **392** / 415 ms | 86 ms | 386 ms | 140 ms |

Kapı p95 ≤ 2 s: **yeşil**. Önbellek: kariyer veri sürümü + süzgeç imzası + kova + rol@mevki anahtarlı, 32 kayıt, 5 dk.

## 4. Testler

- Backend `CareerPlayerListIntegrationTest` (5; önce kırmızı): value_min, facets, kiralık + oyun tarihli sözleşme, kova sütun + süzgeç, rol sıralaması sayfalar boyunca azalan + bilinmeyen rol 404. Tam `mvn test` **533 test, 0 hata, 4 atlanan — normal ve ters sırada**. İlk koşuda `CareerReadsOnlyCareerPlayerArchTest` yakaladı: facet sorguları katalog deposundaydı → `CareerPlayerRepository`'ye taşındı (kural gevşetilmedi).
- Web (önce kırmızı): `careerFilters.test.ts` (adres ↔ süzgeç gidiş-dönüş, bütçe bilinmiyor, oyun tarihli sözleşme, rol sıralaması isteği, futbol, korunan eski süzgeçler), `careerPlayersPage.test.tsx` (kart bağlantısı + kova, opak çubuk, tablo sütunları, adres → sorgu, bütçe pasif + açıklama, sözleşme/kiralık görünürlüğü, rol isteği + rol uyumu, takım/serbest, boş durum), `playersView.test.ts`, menü bayrağı testleri (`navConfig`, `CaptureOnly`, `UtImportPage`, `UtSquadPage.freeze`). Web **785 test**, lint 0 hata (31 uyarı, değişmedi), build yeşil.

## 5. Kapılar ve ekran görüntüleri

| Kapı | Çekim | Sorun |
|---|---|---|
| Kariyer listesi `screens/V3-06a/career-list/` (ızgara, tablo, kaydırılmış ızgara/tablo, süzülmüş, boş, mobil sheet × 375/768/1280 × koyu/açık) | 40 | 0 (taşma 0, axe serious/critical 0, konsol/ağ 0, minFont 11px, bant sızıntısı 0, yüzey alfa 1) |
| UT menüsü bayrak kapalı `screens/V3-06a/ut-flag-off/` (menü, SBC, Kadrom, İçe aktar × 375/1280 × koyu/açık) | 16 | 0 (yakalama girişleri menüde yok, not her sayfada) |
| Kart veritabanı (V3-05a, ortak parçalara taşındı) | 54 | 0 |
| SBC (V3-05c, boş metin değişti) | 34 | 0 |
| İçe aktarma (HAR-01, `VITE_HAR_IMPORT=on` dev sunucusu) | 18 | 0 |

Kapılarda bulunup düzeltilenler:
- Açık tema: kova çipi (yeşil ton, cam üstünde 4,46:1) → nötr çip + renkli nokta.
- Mobil menü (Radix Popover) diyaloğunun adı yoktu → `aria-label="Menü"` (önceki kapılar menüyü açmıyordu).
- 375px içe aktarma: HelpPopover paneli sağ kenarda sayfayı taşırıyordu → <640px sabit, kenarlardan 16px; yerel dosya girişi `max-w-full`.
- Kariyer havuzunda kadın futbolu oyuncuları erkek kulübü listesine karışıyordu → futbol süzgeci (varsayılan erkek).
