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

## 4. Doğrulama — Buğra dosyayı içe aktardıktan sonra (BEKLİYOR)

Docker backend bu sürümle yeniden kuruldu (allowlist etkin). İçe aktarma yapılınca salt-okunur ölçülecek: `sbc_set`, `sbc_challenge`, `ut_item`, fiyat gözlemi ve evolution sayıları; `/ut/sbc` gerçek setlerle 375/1280 × koyu/açık; oyuncu ödüllü bir setin kartının EA verisinden çizildiği.

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
