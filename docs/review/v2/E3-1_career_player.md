# E3-1 — career_player tasarımı, şema ve mimari kural (2026-10-14)

Kapsam: tasarım + **yalnız ekleme** göçü (V31) + kırmızı/cırcır mimari testi. Veri silen/değiştiren göç **yok**; kod hâlâ eski overlay tablolarını okuyor. Doldurma ve okuma geçişi E3-2.

## Bugünkü durum (yerel veri)
- Kimlik: `base_player` (ad, doğum, boy/kilo, ayak, cinsiyet; `owner_career_id` ile kariyerde üretilen 77 oyuncu).
- Katalog derecesi: `player_rating` (sürüm başına). Kariyer overlay'i: `career_player_rating` (43.211 satır; tam attribute/PlayStyle/AcceleRATE/run style/face stats) + `career_player_data` (43.288 satır; ovr, pot, team_id, free_agent, loan_from_team_id) + `career_team`.
- Okuma bugün **karışık**: `PlayerSearchRepository` ve `CareerDeskService` katalog `player_rating` ile overlay'i LEFT JOIN'liyor (overlay yoksa katalog değerine düşüyor); `CareerService` kariyer silerken üretilmiş oyuncuların `player_rating` satırlarını da siliyor. Bu, "tek doğruluk kaynağı" ilkesini ihlal ediyor (kataloğa sızan kariyer değeri / kariyere sızan katalog değeri riski).

## Hedef şema (V31)
- `career_player(career_id, player_id)` PK; 13 §3.1'deki kolonlar + `free_agent`, `run_style1/2`, `face_stats` (bugünkü overlay'den taşınacaklar). `available` = `loan_from_team_id IS NULL` (generated, stored). `attrs SMALLINT[34]` sırası **Attr enum sırası**; `role_familiarity JSONB` `{kod%100: 1|2}` (LE `role1..9`; Role++ = kod ≥ 100); `value_source` LE/MODELED/MANUAL; bilinmeyen para alanları NULL (0 değil).
- `career.engine_version` (varsayılan `v3`), `career.data_version` (her içe aktarma/elle düzenlemede artar → önbellek anahtarı).
- `user_tactic` (5 slot/kullanıcı, kariyere bağlı ya da genel; E3-9 replika bağlama için). Şimdilik kullanılmıyor.
- FK'ler `ON DELETE CASCADE`: kariyer silinince `career_player` kendiliğinden gider; üretilmiş `base_player` silinirse satırı düşer (silme sırası sorunu yok).
- Karar (attrs dizi mi 34 kolon mu): dizi. Gerekçe: motorun girdisi zaten `Map<Attr,int>`, tek kolon kopyalama kolay, 13 §3.1 ile aynı. Bedel: SQL'de attribute filtresi `attrs[i]` (indeks sabitleri Attr sırasından üretilir) ve ayrı kolonlarda olan bugünkü `ovr_min` gibi filtreler `ovr` kolonunda kalır.

## Eski → yeni eşleme (E3-2 doldurma kuralları)
| career_player kolonu | kaynak |
|---|---|
| ovr, pot, team_id, free_agent, loan_from_team_id | `career_player_data` (overall, potential, …) |
| attrs, playstyles, accelerate, weak_foot, skill_moves, positions, run_style1/2, face_stats, body_type | `career_player_rating` satırı varsa o; yoksa **doldurma anında** `player_rating` (kariyerin game_version'ı) kopyalanır → çalışma zamanında katalog yedeği (fallback) kalmaz |
| dob, height_cm, weight_kg, preferred_foot | `base_player` (kopya; LE içe aktarımı sonradan düzeltebilir) |
| role_familiarity | LE `role1..9` (yeni içe aktarma alanı; kod tablosu `seed/le-role-codes.json`) |
| contract/wage/release clause/value/form/injury | LE v2 içe aktarma (yok/NULL; MODELED değer yalnız `value_source='MODELED'`) |
| as_of | `career.current_game_date` (yoksa içe aktarma zamanı) |

## Göç planı (E3-2, veri silmeden)
1. **İçe aktarıcı çift yazar**: `CareerImportService`/`CareerDeskService`/üretim yolu hem eski tablolara hem `career_player`'a yazar (özellik bayrağı `fcareer.career.player-model=dual|new`). `data_version` artar.
2. **Doldurma (backfill)**: mevcut kariyerler için tek transaction'da, önce kuru koşu + satır sayısı eşitliği (career_player = career_player_data) + yedek (repo dışı `backups/`).
3. **Okuma geçişi**: `PlayerSearchRepository`, `PlayerService.fitPlayers(careerId)`, masa/anlık görüntü sorguları `career_player`'a taşınır; kariyer dışı yollar (UT/katalog) `player_rating`'de kalır.
4. **Mimari test sıkılaşır**: aşağıdaki cırcır listesi boşalır ve `-Darch.strict` varsayılan olur.
5. **Eski tablolar silinmez**; kaldırma ayrı karar (en erken E3-10 sonrası, dry-run → yedek → tek transaction → sayım).
Geri alma: bayrağı `dual`'a çevirmek; eski tablolar hep güncel kaldığı için okuma eski yola döner.

## Mimari test: `CareerReadsOnlyCareerPlayerArchTest`
Kural: kariyer sorgusu `player_rating` ile birleşemez; `career` paketinde `player_rating` geçemez. Kaynak taraması ile çalışır.
- Cırcır (ratchet): bugünkü 3 ihlal dosyası listede (`CareerDeskService`, `CareerService`, `PlayerSearchRepository`). **Yeni ihlal build'i kırar**; düzelen dosya listede kalırsa da kırar (liste küçülmek zorunda).
- Strict test (liste boş olmalı) E3-2'ye kadar kapalı; kırmızısı `-Darch.strict=true` ile görülür (3 dosya).
- Sınır: kaynak taraması metin tabanlıdır (dosya düzeyi); yanlış pozitif olursa dosya listeye istisna olarak yazılır, kural gevşetilmez.

## Testler
- `CareerPlayerSchemaIntegrationTest` (5): kolonlar, `career` sürüm kolonları, `user_tactic`, eski tablolar yerinde, `available` kira durumundan türer. Önce kırmızı (şema yokken 3 hata), V31 sonrası yeşil.
- Mimari test yukarıda.
