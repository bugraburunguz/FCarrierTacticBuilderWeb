# HAR-01 — HAR dosyasından yakalama içe aktarma (uzantının yerine)

Uzantıyı EA'nın tespitinden gizlemeye yönelik hiçbir değişiklik yapılmadı. EA'ya istek yok; HAR dosyası tarayıcıda (Web Worker) işlenir, ham dosya sunucuya gitmez.

## Ayrıştırıcı (`src/lib/har/harCapture.ts`, `harWorker.ts`, `parseHarFile.ts`)
| Alınan (girdi başına, yalnız `pick()` okur) | Asla okunmayan |
|---|---|
| `request.url` | `request.headers` (Authorization, Cookie, X-UT-SID…) |
| `response.status` (yalnız 200) | `request.cookies`, `response.cookies`, `Set-Cookie` |
| `startedDateTime` → `ts` (ms) | `request.postData` |
| `response.content.text` (+ `encoding: base64` ise UTF-8 çözülür) | `response.headers`, `queryString`, `timings`, `pages` |

- Çıktı: uzantının biçimi `{url, status, ts, body}`; mevcut işleme hattı değişmedi.
- Kurallar: `GET /ut/capture/rules` (ulaşılamazsa gömülü varsayılan = `extension/rules.js`); eşleme mantığı uzantıyla aynı. Deny her zaman; kişisel = `personalMatch`; katkı = `contrib.match`, `personalOnly` hariç, `stripFields` her derinlikte.
- Yalnız JSON olarak ayrışan gövdeler; gövde başına 5 MB (UTF-8), dosya başına 150 MB (dosya okunmadan kontrol). Hata metinleri Türkçe.
- **Backend (tek kaynak):** sunucu kurallarında `personalMatch` yoktu ve `personalOnly`'de uzantıdaki `/purchased/items` eksikti; istemciler kendi listelerine düşüyordu. `capture-rules.json` sürüm 2: iki alan uzantının değerleriyle eklendi (davranış uzantı için değişmedi). Test: `CaptureRulesIntegrationTest` (önce kırmızı).

## Katkı yolu kararı
`POST /ut/contrib/capture` zaten web oturumunu (JWT) kabul ediyor: `LinkTokenFilter` yalnız `X-Link-Token` varsa devreye girer; JWT'li istekte mod özniteliği yoktur ve kontrol geçer. Sunucu her iki yolda aynı doğrulamayı yapar: `contributorService.require` (yasaklı olmayan katkıcı, değilse 402) ve `personalOnly` süzmesi. Bu yüzden **yeni uç ve yeni yetki yok**; web, giriş yapmış kullanıcının oturumuyla aynı uca, uzantının yaptığı gibi 4 MB parçalar halinde ve `stripFields` uygulanmış gövdelerle gönderir. Mevcut testler bu yolu kapsıyor (`KnowledgeBaseIntegrationTest`: katkıcı olmayan JWT → 402, katkıcı JWT → 200). Web 402'yi "Bilgi tabanına katkı için katkıcı yetkisi gerekir." diye gösterir.

## Sayfa (`/ut/import`)
HAR varsayılan yöntem (en üstte): hedef (Kulübümü senkronla / Bilgi tabanına katkı), sürükle-bırak ya da seç, HelpPopover'da adım adım talimat + Chrome dışı not, paylaşma uyarısı. Özet (SBC seti/görevi, kulüp kartı, fiyat gözlemi, objective, atlanan istek) onaylanmadan hiçbir şey gönderilmez. Uzantı ve eski yakalama dosyası katlanmış "eski yöntem" bölümünde; `ExtensionSync`'te giriş engeli notu. `extension/README.md`'ye not eklendi (klasör iki git reposunun da dışında; commit edilemedi).

## Testler
- `harCapture.test.ts` (11): yalnız eşleşen 200 JSON; uzantı biçimi; base64 UTF-8; header/cookie/postData değerleri çıktının tamamında yok; atlananlar (deny 1, eşleşmeyen 1, 4xx 1, JSON değil 1); özet sayıları; katkıda personalOnly + deny + stripFields; sunucu kuralının varsayılanı ezmesi; 5 MB gövde, 150 MB dosya, bozuk JSON, HAR olmayan dosya.
- `harImport.test.tsx` (6): talimat/uyarı; dosya → özet → onay → kişisel uç (gizli değer yok, katkı ucu çağrılmaz); katkı hedefi → katkı ucu (kulüp yok, satıcı silinmiş); 402 mesajı; Vazgeç; hata metinleri.
- Fixture `tests/fixtures/har/sample.har`: sentetik, gerçek kişisel veri yok.
- Backend 528, web 754 yeşil; lint 0 hata; build (worker ayrı parça).

## Kapılar (`screens/HAR-01/`)
`import-shots.mjs`: boş, özet (gerçek tarayıcıda Web Worker ile), hata × 375/768/1280 × koyu/açık = 18 çekim, sorunlu 0: taşma 0, axe serious/critical 0, konsol/ağ 0, minFont 12px, yakalama uçlarına gönderim 0.
