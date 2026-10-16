# TAC-07 — oyun içi doğrulama kapandı (kaynak: Buğra, 2026-10-14)

T01–T10 oyunda kuruldu; oyundaki 10 kodun 10'u codec'in beklediğiyle **birebir** aynı. Sonuç: codec tablosu ve formasyon tabanları doğrulandı.

## Yapılanlar
- 10 kod `EaTacticCodecInGameVectorsTest` (oyun içi doğrulanmış vektörler) ve `src/test/resources/tactic-code/in-game-vectors.json` olarak eklendi (kaynak alanı: Buğra, 2026-10-14). Testler: encode birebir, decode aynı taktik, T kodları 7 doğrulanmamış formasyonu kapsıyor.
- **Kapsama kanıtı (hesapla, iddia değil):** 64 EasySBC + 10 T kodunun decode edilmiş taktiklerinde görülen (mevki, rol.focus) çiftleri codec tablosunun **113/113**'ünü, formasyonlar **29/29**'unu kapsıyor (`theSeventyFourVerifiedCodesTogetherCoverEveryCombinationAndEveryFormation`).
- `seed/ea-tactic-codec.json` → `verification` bloğu: verified:true, kaynak, 113/113, 29/29, kanıt testi (`theSeedStatesItsInGameVerification`).
- **Doğrulanmamış uyarıları kaldırma: yapılacak bir şey yok.** Kodda/arayüzde "doğrulanmadı" ya da doğrulama kaynaklı bir kilit yoktu: doğrulama durumu yalnız `14_TAKTIK_KODU.md`'deydi. `exact=false` ve `ExportWarnings` yalnız site ile EA rol kümesi arasındaki eşleme eksiklerini bildirir ("Kod sitede tam karşılanmadı"); doğrulama eksikliğinden gelmediği için olduğu gibi bırakıldı.

## 14 §6 kabul kriterleri
| Kriter | Sonuç |
|---|---|
| `EaTacticCodecTest`: 64 EasySBC + 10 T kodu, encode ve decode birebir | **Geçti** (EasySBC testi + InGameVectors testi) |
| `TacticCodeRoundTripIntegrationTest`: her T kodu import → export → aynı kod (eşleme katmanı dahil) | **Geçti** (74 kod: 64 + 10, hepsi exact) |
| Rol seçicide oyunda olmayan kombinasyon seçilemiyor; export oyunda olmayan girdide 422 | **Geçti** (TAC-08 export testleri: rol ve focus reddi; TAC-10 web seçici) — bu turda yeniden yazılmadı, mevcut testler yeşil |
| 5-3-2 export edilebiliyor, decode edilince `f532` | **Geçti** (T06 = 5-3-2, import→export birebir; FormationEaMapping testi) |
| 107 replikanın `tacticCode`'u (REP-03) | **Bu turda yok**: E3-9 (replikalar) işi; artık engelsiz |
| `SYq8#eNaswmP` import → 14 §2'deki 11 rol doğru slotlarda | **Geçti** (`theSampleCodeImportsTheElevenRolesIntoTheRightSlots`: 4-2-3-1 (2), Balanced, hat 25, 11 rol) |

E3-9 (replikalar) artık engelsiz.
