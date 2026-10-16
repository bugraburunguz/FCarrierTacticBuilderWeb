# V3-05c-c — Yakalama dosyası girişi + EA ödül verisi + yeni şart tipleri

Ajan EA sitesine/Web App'e erişmedi; gerçek yakalamadan yalnız tip/alan adları (görev metnindeki bulgular) kullanıldı, test verileri sentetik.

## 1. Yakalama dosyası içe aktarma (v3)

- Uzantının "Dışa aktar" dosyası (`fcareer-captures.json`: `{url, status, ts, body}[]` ya da `{captures: [...]}`) artık HAR-01 ile **aynı akışta**: hedef seçimi (Kulübümü senkronla / Bilgi tabanına katkı) → tarayıcıda ayrıştırma (Web Worker) → özet → onay → gönderim.
- Ortak parça, kopya yok: `CaptureFileImport` (HAR ve yakalama dosyası iki kaynak; yalnız metinler farklı), `HarImport` bunun ince sarmalayıcısı. Süzgeç tek: `filterEntries` (deny → eşleşme → 200 → boyut → JSON → katkıda `stripFields`), `parseHar` ve yeni `parseCaptureFile` ikisi de bunu çağırır; kurallar tek kaynaktan (`GET /ut/capture/rules`).
- Katkı hedefinde `personalOnly` uçları (kulüp, transfer listesi…) alınmaz, `stripFields` uygulanır.
- **Ham dosya sunucuya gitmez**: önceki sayfa dosyayı süzmeden olduğu gibi `/ut/capture`'a gönderiyordu (yetki/oturum uçları dahil); şimdi yalnız süzülmüş yakalamalar, yalnız onaydan sonra. Uzantının `fcareer://discovery` girdileri dosya yolunda atlanır.

## 2. Ödülde EA kart verisi (API CONTRACT CHANGE)

- Backend `RewardAllowlist`: `UtCaptureService.hubRewards`, `awardSets` yolu ve `SbcChallengeParser` itemData'yı artık atmıyor; `Reward.item` yalnız **resourceId, assetId, rating, preferredPosition, possiblePositions, rareflag, nation, leagueId, teamid** (allowlist — alan tek tek okunur, geri kalan hiç kopyalanmaz). Kart örneği kimliği (id), owners, timestamp, lastSalePrice, contract, lifetimeStats, statsList, loyaltyBonus, loansInfo, injury*, pile, discardValue, untradeable ve bilinmeyen yeni alanlar alınmaz (testte ayrı ayrı doğrulandı).
- Bilgi tabanına yazılan `reward` / `awards` / `objectives[].rewards` JSON'u da yazım anında aynı allowlist'ten yeniden kurulur (`ContributionService.apply`).
- Testin bulduğu ek sızıntı: yakalama yanıtındaki ham `sbcDetails` gövdesi ödüllerin tam itemData'sını kullanıcıya geri yolluyordu → ödüller orada da allowlist'ten geçiyor.
- Web: ödül kartı önce bu veriden çizilir (reyting/mevki ödül kartından; ad katalogdan: yeni toplu `GET /players/assets?id=…`, tek istek, bilinmeyen kimlik 404 değil yanıtta yok). `ut_item` yalnız EA verisi olmayan ödüller için yedek. Katalog yüz statları ödül sürümüne ait olmayabileceği için kullanılmadı.
- Fixture: aynı alan adları, sentetik değerler (`RewardItemFixture`, `tests/fixtures/sbcFixture.ts` `EA_REWARD`, `tests/fixtures/captures/sample-captures.json`).

## 3. Şart tipleri

Listedeki 16 tipin hepsi tanınıyor, her biri için birim test (`SbcChallengeParserTest`: parametreli 10 ana tip + yapı tipleri SCOPE/PLAYER_COUNT/PLAYER_LEVEL/CLUB_ID/LEAGUE_ID/NATION_ID). Tablo: `05_SBC_VERI_HATTI.md` §2.3.

| Tip | Anlam |
|---|---|
| PLAYER_ATTRIBUTE | **doğrulanmadı** — kodda/veride karşılığı yok; arayüz "Özellik şartı (doğrulanmadı)", çözücü zorlamaz |
| ACADEMY_PLAYER_SLOTTING | **doğrulanmadı** — tek dayanak EA iç adı "academy" = Evolutions (`/academy/` uçları); Evolution oyuncusu yerleşimiyle ilgili olduğu varsayım; arayüz "Evolution oyuncusu şartı (doğrulanmadı)", çözücü zorlamaz |

Bilinmeyen tip: `kind: "UNKNOWN"` + `eaType` + `raw`; arayüzde **"Bilinmeyen şart"** çipi (`RequirementItem`, her iki SBC sayfasında), çözücü notlarında görünür.

## 4. Doğrulama — gerçek dosya iki hedefle içe aktarıldı

Dosya (`fcareer-captures.json`, 7,6 MB) `/ut/import` → "Yakalama dosyasından içe aktar" akışından, yerel test hesaplarıyla (yalnız localhost) iki hedefle gönderildi; içerik yazdırılmadı, yalnız sayılar.

| Hedef | Özet (gönderilmeden önce) | Sonuç |
|---|---|---|
| Kulübümü senkronla | 124 yanıt · SBC seti 27 · görev 26 · kulüp kartı 139 (düzeltme sonrası; ilk koşu 1246 gösterdi, bkz. aşağı) · fiyat 819 · objective 0 · atlanan 7 | 200: 160 kart, 825 fiyat, 27 set, 26 görev, 39 evolution, aktif kadro yok, 5 bilinmeyen yol. Kişisel sonuç sunucuda saklanmaz, içe aktaran tarayıcıda kalır → **kendi tarayıcında senin de bir kez çalıştırman gerekir** |
| Bilgi tabanına katkı | 89 yanıt · kulüp kartı 0 (kişisel uçlar alınmadı) · atlanan 42 | ilk denemede 402 (yerelde katkıcı 0). Onayınla: yalnız `kb-import-…@example.test` (user 101) için tek INSERT (dry-run → yedek `backups/pre-v305cc-kb-import-20261015-123300.dump` → tek transaction). Sonra 200: **92 yeni**, 0 kuyruk, fiyat 0 kayıt / 819 atlandı |

Salt-okunur sayılar (önce → sonra): `sbc_set` 1 → **28** (28 aktif; 13'ünde EA kart verili ödül), `sbc_challenge` 1 → **27**, `evolution` 0 → **39**, `objective_group` 0 → 0 (dosyada objective yok), `ut_item` 0 → **0**, fiyat gözlemi (`price_obs`) 0 → **0**.

- **Fiyat 0'ın nedeni**: gözlem `ut_item`'a bağlanır; yerel `ut_item` boş (dolduran tek yol admin ucu `POST /ut/admin/items/sync`, `X-Admin-Key` ister; `.env` okunmadığı için ajan çalıştırmadı). 819 gözlemin hepsi "unknownItem" atlandı. Sen sync'i çalıştırıp katkıyı tekrarlarsan temel kartların fiyatları kaydolur (özel sürüm kartları ut_item'da yoksa yine atlanır).
- **Test hesabı duruyor**: `contrib_event.contributor_id` NO ACTION → hesabı silmek katkı kaydını (kaynak bilgisini) silmeyi gerektirir; onay kapsamı dışında olduğu için silinmedi. Giriş bilgisi saklanmadı; temizlik ayrı karar.
- `/ut/sbc` gerçek setlerle (`screens/V3-05c-c/sbc-real/`, 375/1280 × koyu/açık): 4 çekim 0 sorun; 28 set, **10 oyuncu ödülü kartı EA verisinden** (reyting/mevki yakalamadan; 10/10 ad katalogdan `/players/assets`), `ut_item` isteği 0.
- Gerçek veride bulunan ve düzeltilen: (1) 3 "Pick" setinin ödülü oyuncu değil seçim jetonu (assetId 0, mevki yok, reyting 99) — "99 Ödül oyuncusu" kartı olarak çiziliyordu → artık "Oyuncu seçimi" rozeti (allowlist'e itemType eklenmedi; assetId > 0 + mevki koşulu); (2) içe aktarma özeti kulüp kartını tekrar yakalanan sayfalardan sayıyordu (22 yanıt / 1246 öğe / 139 tekil) → kart kimliği bir kez sayılır.

## 5. Kategori sözlüğü (değişmedi)

EA adları İngilizce (Web App en_US); sözlük `SBC_CATEGORY_LABELS` aynen:

| EA | Türkçe |
|---|---|
| Favourites | Favoriler |
| Players | Oyuncular |
| Icons | Icon |
| Upgrades | Yükseltmeler |
| Challenges | Mücadeleler |
| Foundations | Temeller |
| Exchanges | Takaslar |
| Special | Özel |

Sözlükte olmayan kategori ham adıyla gösterilir (ör. "Seasonal Exchange").

## Testler ve kapılar

- Backend tam `mvn test`: **552 test, 0 hata, 4 atlanan — normal ve ters sırada**. Önce kırmızı: `RewardItemAllowlistTest` (3), `UtCaptureServiceTest` (hub/objective/challenge + yanıtta yasak alan yok), `SbcChallengeParserTest` (16 tip, bilinmeyen tip, ödül itemData), `ContributionPipelineIntegrationTest` (KB'ye yazılan reward), `PlayerAssetLookupIntegrationTest` (toplu ad).
- Web: **796 test**, lint 0 hata, build yeşil. Önce kırmızı: `captureFile.test.ts`, `captureFileImport.test.tsx`, `requirementItem.test.tsx`, `sbcListPage`/`sbcList` (EA kartı önce, ut_item yedek).
- Kapılar: SBC `screens/V3-05c/` 34 çekim 0 sorun (EA verisinden çizilen ödül kartı her çekimde ölçüldü); yakalama dosyası içe aktarma `screens/V3-05c-c/import/` 24 çekim 0 sorun (boş, kişisel özet, katkı özeti, hata × 375/768/1280 × koyu/açık; hiçbir şey gönderilmedi). Özet: kişisel SBC 2 · görev 2 · kulüp 3 · fiyat 2 · objective 2 · atlanan 2; katkı kulüp 0 · atlanan 3.
