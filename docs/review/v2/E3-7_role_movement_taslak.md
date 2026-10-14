# E3-7 (ilk adım, onay bekliyor) — `seed/role-movement.fc27.json` taslağı: 5 rol + 6 takım metriği

**Kod yazılmadı; seed dosyası oluşturulmadı.** Aşağıdaki değerler taslaktır: hepsi `verified:false`. Kaynak olarak yalnız EA'nın rol açıklaması (`roles.json` `movementTags`: cut_inside, box_to_box_runs, hold_line, overlap, screen_defence…) ve genel futbol okuması kullanıldı; **oyun içi gözlem yapılmadı** (`_basis` bunu açıkça yazar). Sayıların ölçeği senin onayınla/gözlemle kalibre edilecek.

## 1. Alanlar ve birimler

Saha: formations.json ile aynı (x 0-100 soldan sağa, y 0 = rakip kale, 100 = kendi kale; slot x/y'leri oradan gelir).

| Alan | Tanım | Aralık |
|---|---|---|
| `dxIn` | Topla (hücumda) yatay kayma; **sahanın ortasına doğru** pozitif (sol/sağ ayna otomatik: x<50 ise +x, x>50 ise −x yönü) | 0-30 birim |
| `dyFwd` | Topla ileri kayma (y azalır) | 0-35 birim |
| `w` (genişlik eğilimi) | Hücumda çizgiye yapışma payı: 0 = içeride, 1 = çizgide | 0-1 |
| `r` (ileri koşu oranı) | Hücum evrelerinin hangi kesrinde topun/son hattın ilerisine koşar | 0-1 |
| `d` (savunma görevi) | Savunma evrelerinin hangi kesrinde geri döner/hattı tutar; topun gerisinde kalma eğilimi | 0-1 |
| `p` (pres yoğunluğu) | Top kaybında/rakip ilk pasında basma eğilimi | 0-1 |
| `s` (stamina maliyeti) | Maçın tamamında göreli yorgunluk (1 = en pahalı rol) | 0-1 |

## 2. Beş rol (taslak)

| Rol (pozisyon) | dxIn | dyFwd | w | r | d | p | s | `_basis` |
|---|---|---|---|---|---|---|---|---|
| **Inside Forward — Attack** (LM/RM/LW/RW) | 20 | 12 | 0,35 | 0,85 | 0,15 | 0,35 | 0,70 | EA tanımı: kanattan içeri kesip bitirir (`cut_inside`,`shoot`); sayılar tahmin, gözlem yok |
| **Box-to-Box — Balanced** (CM) | 0 | 8 | 0,20 | 0,60 | 0,55 | 0,65 | 0,95 | EA tanımı: iki kale arası gidip gelir (`box_to_box_runs`); en yüksek stamina; gözlem yok |
| **Fullback — Defend** (LB/RB) | 4 | 2 | 0,80 | 0,15 | 0,90 | 0,45 | 0,45 | EA tanımı: hattı tutar, çizgide kalır (`hold_line`); gözlem yok |
| **Attacking Wingback — Attack** (LB/RB) | 0 | 28 | 1,00 | 0,90 | 0,20 | 0,55 | 1,00 | EA tanımı: bindirir, uzak direğe orta (`overlap`,`cross_far_post`); gözlem yok |
| **Holding — Defend** (CDM/CM) | 0 | 0 | 0,10 | 0,05 | 0,95 | 0,50 | 0,40 | EA tanımı: savunma önünde perde (`screen_defence`); gözlem yok |

Hepsi `verified:false`. Beklenen JSON biçimi (örnek giriş, dosyaya yazılmadı):

```json
{ "id": "inside_forward_attack", "dxIn": 20, "dyFwd": 12, "w": 0.35, "r": 0.85, "d": 0.15, "p": 0.35, "s": 0.70,
  "verified": false, "_basis": "EA rol açıklaması (cut_inside, shoot); oyun içi gözlem YOK" }
```

**Yapısal bulgu:** `roles.json`'da Box-to-Box yalnız **CM**'dir; 4-2-3-1'de CM slotu yoktur (CDM çifti vardır), dolayısıyla B2B bu formasyonda yerleştirilemez. Örnekte B2B yer almaz; B2B değerleri 4-3-3 / 4-1-4-1 gibi CM'li formasyonlarda kullanılır. (B2B'nin CDM'de de oynatılması istenirse bu rol tanımı kararıdır, E3-7 dışı.)

## 3. Altı takım metriğinin bu değerlerden hesabı — tek örnek

Örnek taktik: **4-2-3-1 (LM-CAM-RM)** (`formations.json` "4-2-3-1 (2)"; LAM/RAM'li sürüm CAM slotu olduğu için Inside Forward'ı kabul etmez), **build-up Balanced, hat 55** (bant BALANCED, ≤60 → pres çarpanı 1,00). Roller: LB Fullback Defend · LCB/RCB Defender Defend · RB Attacking Wingback Attack · LDM/RDM Holding Defend · LM Inside Forward Attack · CAM Playmaker Balanced · RM Winger Balanced · ST Advanced Forward Attack. (Defender, Playmaker, Winger, Advanced Forward satırları yalnız örneği tamamlayan **yardımcı taslak** değerlerdir: Defender 0/0/0,10/0,05/0,95/0,35/0,35 · Playmaker 0/6/0,20/0,35/0,30/0,45/0,60 · Winger 0/14/0,90/0,60/0,30/0,45/0,75 · AdvFwd 0/10/0,30/0,95/0,05/0,30/0,60; onaya sunulan 5 rolün parçası değildir.) Kaleci dışarıda, 10 saha oyuncusu.

Topla konum: x' = x + yön·dxIn, y' = y − dyFwd. Topsuz: y'' = y − (hat−50)·0,2 (ST hariç).

| Slot | x → x' | y → y' (topla) | y'' (topsuz) |
|---|---|---|---|
| LB | 12 → 16 | 75 → 73 | 74 |
| LCB / RCB | 37 / 63 | 80 → 80 | 79 |
| RB | 88 → 88 | 75 → 47 | 74 |
| LDM / RDM | 38 / 62 | 60 → 60 | 59 |
| LM | 10 → 30 | 45 → 33 | 44 |
| CAM | 50 | 34 → 28 | 33 |
| RM | 90 → 90 | 45 → 31 | 44 |
| ST | 50 | 14 → 4 | 14 |

| Metrik | Hesap (taslak) | Örnek sonucu |
|---|---|---|
| **Hücum / Savunma** | Σr (hücum görevi) vs Σd (savunma görevi): hücum % = 100·Σr/(Σr+Σd) | Σr = 4,00; Σd = 5,70 → **Hücum %41 / Savunma %59** |
| **Genişlik** | topla x' ile ortalama \|x'−50\| / 50 (×100); sol (x'<25) ve sağ (x'>75) kanat doluluğu | ortalama = 36,4 → **36**; sol 1 (LB), sağ 2 (RB, RM) — LM içe kestiği için sol kanat boş kalır |
| **Uzunluk** | topla y' yayılımı ve topsuz y'' yayılımı (max−min), ikisinin ortalaması; hat yüksekliği y''de | topla 76, topsuz 65 → **70,5** |
| **Dayanıklılık** | talep = ort(s) × bant pres çarpanı; arz = (ort. Stamina − 40)/50 (0-1); fark = arz − talep | talep = 0,560; varsayımsal ort. Stamina 72 → arz 0,640 → **+0,08 (yeterli, sınırda)** |
| **Build-Up** | GK+2CB+CDM'lerin ort. (Short Passing, Composure, Ball Control, Vision) ≥ tipin eşiği (Short 72 / Balanced 68 / Counter 62; Counter'da ek: koşucuların pace+Positioning'i) | varsayımsal ort. 70 → Balanced eşiği 68 → **+2 (karşılıyor)**; gerçek oyuncu verisi atanınca hesaplanır |
| **Geri savunma (rest-defence)** | topun gerisinde kalanlar: d ≥ 0,5 ve dyFwd ≤ 10 olan oyuncu sayısı; her biri için hız/hat yüksekliği kontrolü ayrıca | LB, LCB, RCB, LDM, RDM → **5 oyuncu** (RB bindirdiği için sayılmaz) |

Eşikler (0,5; 72/68/62; 0,2 hat katsayısı; pres çarpanları 0,85/1,00/1,15/1,30) **taslaktır, `verified:false`** ve gözlemle kalibre edilecek.

## 4. Onayına sunulan sorular
1. Alan seti (dxIn, dyFwd, w, r, d, p, s) ve birimler uygun mu? (Ek alan/çıkarma isteği?)
2. Beş rolün sayıları nasıl kalibre edilecek: senin oyun içi gözlemin mi, yoksa şimdilik EA açıklamasından türetilen bu taslakla mı başlayalım (hepsi `verified:false` kalır)?
3. Box-to-Box'ın yalnız CM olması yapısal bulgu: bu formasyonlarda B2B yok sayılsın mı?
4. Yardımcı 4 rolün (Defender, Playmaker, Winger, Advanced Forward) taslağı da aynı biçimde sana sunulsun mu, yoksa 30 rolün tamamı için tek tabloda mı?
