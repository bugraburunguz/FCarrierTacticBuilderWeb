# E3-5c — levelFit tepe kararsızlığı: önce / sonra (2026-10-14)

## Değişiklik ve gerekçe
- **Bant:** minimum n = **100** (önceden 30); OVR bandı simetrik genişler, üst sınır ±15 (önceden ±10). Bant (`band_lo/band_hi`) ve n satırda kayıtlı. Üst bantlarda genişleme aşağı yönlü etki yapar (OVR 91 bandı ≈ 80–102); bu levelFit'i bir miktar yukarı çeker, kayıt altında.
- **Eşleme:** `levelFit = 50 + 50·tanh((currentFit − bant medyanı) / max(bant IQR, 8))`. Tam yüzdelik yerine bunu seçtim çünkü: (1) eğim sınırlı: en çok 50/8 = 6,25 puan/puan, yani 3 puanlık currentFit farkı en çok 18,75 levelFit puanı oynatır (hedef ≤ 25; kırmızı test dar bantta tarar); (2) geniş dağılımda IQR devreye girer, yayılma tabanı yalnız dar bantları yumuşatır; (3) medyan = 50, sonuç (0,100) açık aralığında → "100 yalnız tek en iyiye" sorunu ve eşitlik sorunu yok; (4) tablo değişmedi (`quantiles` zaten p25/p50/p75 içeriyor), yeniden üretim yeterli. Dezavantaj: değer artık "yüzdelik" değil, dağılıma göre standartlaştırılmış skor; tooltip metni "çoğundan" gibi yüzdelik dili kullanıyor, kaba olarak tutarlı (65 ≈ üst %30).
- Testler (önce kırmızı): `LevelFitCalculatorTest` (bant, medyan = 50, monoton, açık sınır, 3 puan ≤ 25 dar bantta, geniş bant yassılaşmaz). Yerel veri kontrolleri `level-fit-report.mjs`: Kampa ≥ 30, Lawlor ≥ 30, tipik oyuncular [35,65] **hepsi PASS**. Golden set (currentFit) ve kaleci merdiveni etkilenmedi (levelFit'ten bağımsız); tam `mvn test` 344 test, 0 hata.

## ST · Advanced Forward · Attack (ve PM) — önce → sonra levelFit
| Oyuncu | currentFit | önce | sonra |
|---|---|---|---|
| Harry Kane (ST AF) | 86,0 | 31,3 WEAK | **63,5** AT_LEVEL |
| Erling Haaland (ST AF) | 90,5 | 74,0 | 83,4 |
| Jude Bellingham (ST AF) | 88,0 | 48,8 | 73,5 |
| Kylian Mbappé (ST AF) | 95,8 | 93,7 | 94,6 |
| Scott McTominay (CAM Playmaker) | 87,1 | 20,5 WEAK | **34,6** WEAK |

McTominay hâlâ WEAK: currentFit 87,1 CAM Playmaker bandında gerçekten düşük kalıyor (Vision +13,6 ile bandın alt yarısı); düzeltme kararsızlığı gideriyor, onu "iyi" yapmıyor.

## 8 teşhis oyuncusu — önce → sonra levelFit
| Oyuncu | OVR | önce | sonra | bant (sonra) |
|---|---|---|---|---|
| Robert Kampa (GK) | 57 | 30,9 | 31,8 | 54–60, n=580 |
| Dominik Reimann (GK) | 68 | 38,1 | 38,5 | 65–71, n=667 |
| Torben Müsel (CDM Holding) | 67 | 31,4 | 31,7 | 64–70, n=1993 |
| Ian Lawlor (GK) | 61 | 50,1 | 50,1 | 58–64, n=714 |
| Iván Román (CB Defender) | 66 | 54,1 | 54,3 | 63–69, n=2050 |
| Joe White (CM B2B) | 64 | 56,5 | 55,9 | 61–67, n=2225 |
| Thibaut Courtois (GK) | 90 | 100 | **86,7** | 77–103, n=127 (önce 82–98, n=30) |
| Kylian Mbappé (ST AF) | 91 | 93,7 | 94,6 | 80–102, n=118 |

Orta bantlar (n zaten ≥ 100) pratikte değişmedi; değişim üst bantlarda. Rozet eşikleri aynı (≥65 / 40 / 20).
