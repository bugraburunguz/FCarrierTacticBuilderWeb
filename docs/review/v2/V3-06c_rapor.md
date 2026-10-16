# V3-06c — Transfer Merkezi (v3) + kabul ölçütü doğrulaması

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-06c/`:

| Klasör | İçerik | Çekim |
|---|---|---:|
| `transfer/` | Transfer Merkezi | 42 |
| `career-player/` | kariyer oyuncu sayfası (regresyon) | 114 |
| `career-list/` | kariyer listesi (regresyon) | 40 |
| `ut-player/` | UT oyuncu sayfası (regresyon) | 32 |

## 0a. Kabul ölçütleri ve karar

İlk ölçüm (V3-06b'nin lig referansıyla) oyuncu içi AUC'yi eşik altına düşürdü (League Two'da 0,596; lig bandı taramasında 0,570–0,599). Talimat gereği iş durduruldu ve raporlandı.

Buğra'nın kararı: **lig referansı rol rozetinden çıktı**. levelFit her yerde oyuncunun kendi OVR bandı. Rozet, rol sıralaması, "Biçilmiş kaftan" ve v2 kariyer sayfası V3-06b öncesi davranışa döndü; `RoleFitV3Service`, `FitService` ve roles ucu V3-06b öncesiyle aynı. Kırmızı test önce yazıldı: `careerRolesLevelFitEqualsTheCatalog`.

| Referans | Altın set kesin çiftler (ölçüt: currentFit) | Role++ vs rolsüz AUC (≥ 0,80) | Oyuncu içi AUC (≥ 0,60) |
|---|---|---|---|
| **Ürün: kariyer = katalog (kendi OVR bandı)** | **50/50** | **0,874** | **0,620** |
| *bilgi amaçlı, ürün kullanmıyor:* lig bandı OVR 62 (League Two) | 50/50 (levelFit ile 49/50) | 0,982 | 0,596 |
| *bilgi amaçlı:* lig bandı OVR 55–85 taraması | 50/50 (levelFit ile 49–50/50) | 0,928–0,992 | 0,570–0,599 |

- Araç: `LevelReferenceAcceptanceReportTest` (opt-in `-Dacceptance.report=true`, LE dökümü gerekir). Çıktı `target/level-reference-acceptance.md`; lig satırları "bilgi amaçlı (ürün kullanmıyor)" başlığı altında. Geçici hata ayıklama satırı kaldırıldı.
- Regresyon testi `RoleSignalRegressionTest` (0,874 / 0,620) ve `GoldenSetTest` (50/50, τ = 1,0) değişmedi.
- levelFit ile 49/50'nin nedeni tek çift: Winger · Balanced, Traoré > Díaz. currentFit'te sıra doğru (64,7 > 63,2), ama iki oyuncu farklı mevki havuzunda (RM / RW), dolayısıyla farklı bant. Bu yalnız bilgi satırlarını etkiliyor.

### Yeni "Lig seviyesi" göstergesi (rol yüzdesi değil)

- **Kural:** oyuncu OVR'ı ile kariyer liginin gücü (lig OVR'ı = ligdeki kulüp güçlerinin medyanı) karşılaştırılır.
  - "Ligin üstünde (+N)"
  - "Lig seviyesinde" (|fark| ≤ 2)
  - "Ligin altında (−N)"
  - Eşik tek yerde: `lib/leagueLevel.ts`.
- **Kaynak:** `GET /players/facets?career=` artık `leagueName` + `leagueOvr` dönüyor. Lig gücü bilinmiyorsa alan yok ve gösterge çizilmiyor.
- **Görünüm:** nötr çip + yön simgesi; renk tek başına anlam taşımıyor. HelpPopover metni: "Oyuncunun OVR'ı, kariyerindeki ligin ortalama seviyesiyle karşılaştırılır."
- **Nerede görünüyor:**
  - kariyer oyuncu sayfası başlığı (Kadronda rozetinin yanında)
  - kariyer listesi (tablo sütunu + ızgara kartı)
  - Transfer Merkezi aday satırları
- **Roller sekmesi:** yardım metni fitLabels'teki "kendi seviyesindeki oyunculara göre" metnine döndü; "Seviye referansı" satırı kaldırıldı.
- **Kapıda bulunan hata (kırmızı testle düzeltildi):**
  - **Belirti:** yeni kariyerde facets, havuz tohumlanmadan çağrılınca kulüp/lig gücü boş hesaplanıyordu ve sonuç `data_version` anahtarıyla önbellekte kalıcı oluyordu (tohumlama sürümü artırmıyor). Liste sayfasında gösterge hiç çıkmıyordu.
  - **Düzeltme:** `teamStrengths` artık önce havuzu tohumluyor (`byIds` ile aynı yol).

## 0b. Mobil rol adı

`RoleRow` (UT + kariyer ortak): 480px altında rol adı tam satırda, kısaltılmıyor; çip, rozet ve rol puanı alt satıra iniyor. Kapılar artık kesilen rol adını ölçüyor (`roleNamesClipped`); UT ve kariyer çekimlerinde 0.

## 1–2. Transfer Merkezi (v3)

**Rota.** v3'te `/career/transfer` → `TransferCenterPage`; v2 `CareerTransferPage` v2 için kaldı.

**Yalnız v3 uçları:**
- rol uyumu `/fit/role` + `engineVersion: 'v3'` (`useSlotFits`)
- öneriler `POST /careers/{id}/recommendations`
- kısa liste uçları

Test, eski uçların (`/advisor/tactic`, `/recommend/preview`, `/players/{id}/development`, `/fit/squad`) çağrılmadığını doğruluyor.

**Yeniden kullanılanlar (mantık kopyası yok):**
- `useSlotFits` / `needsFromFits`
- `RecommendationPanel`: yeni isteğe bağlı prop'lar; v2 çağrıları değişmedi
  - `rowExtra`, `cardWidth`
  - uzak ihtimaller anahtarı dışarıdan kontrol edilebilir, etiket değiştirilebilir
- `RecommendationRow`, `MoneyInput`, `ShortlistLabel`, `PlayerCard`, `BucketChip`, `LeagueLevelChip`, `HelpPopover`
- İhtiyaç listesi `transferNeeds` olarak `features/transfer/transferPlan.ts`'e taşındı; v2 sayfası da onu kullanıyor.

**Yerleşim:**
- **Bütçe bandı:**
  - transfer bütçesi
  - kısa listenin tahmini bedeli (pazarlık tavanı, yoksa piyasa değeri; bedeli bilinmeyen sayısı ayrıca yazılıyor)
  - alım sonrası bütçe
  - Bütçe bilinmiyorsa "—" ve "Bütçe girilmemiş…" açıklaması; 0 yazılmıyor. 480px altında kutular alt alta.
- **İhtiyaçlar:**
  - Sahadaki rozetle aynı kaynak: sarı/kırmızı, seviyesine göre artan; ayrıca derinlik açıkları.
  - Her ihtiyaç bir çip; mobilde yatay kaydırılıyor.
  - Adres çubuğunda `?ihtiyac=`, `?kadro=tum` ("Tüm kadro"), `?uzak=1`. Masa'dan gelen `?pos=&role=` bağlantıları da çalışıyor.
  - Zayıf halka yoksa "Adaylar" bölümü "Tüm kadroyu göster" ile çıkış veriyor.
- **Adaylar (kahraman):**
  - Öneri hattının kuralları aynı (doğal mevki önce, mevki dışı ≤ 2, HAYAL varsayılan dışarıda); "Uzak ihtimalleri göster" anahtarı var.
  - Satırda:
    - sm kart (mobilde 60px)
    - rol uyumu rozeti
    - değer çubuğu (değerin bütçeye oranı, veri varsa); ücret özet veride yok, bu yüzden gösterilmiyor
    - ulaşılabilirlik kovası
    - alım sonrası bütçe
    - Lig seviyesi
    - kısa listeye ekle
    - oyuncu sayfası bağlantısı
- **Kısa liste:** oyuncu adıyla (WEB-BUG-13), her satırda "Pazarlık tavanı" MoneyInput (WEB-BUG-09, odak çıkınca kaydeder), toplam ve bütçe etkisi, Çıkar.
- **Satış planı:**
  - Sütunlar: oyuncu · değer · sözleşme bitişi (oyun tarihine göre kalan ay) · öneri (Sat / Kirala / Tut) · gerekçe.
  - Veri olmayan sütun gösterilmiyor.
  - "Tut" satırları açılır bölümde (mobilde liste kısa kalsın).
  - Masaüstünde tablo, mobilde kart listesi.

### Satış planı kuralları (Masa "3 iş" ile tek kaynak)

Kurallar `deskRules.sellAdvice`'a çıkarıldı; `suggestActions` da onu kullanıyor. Yeni kural yok.

| Öneri | Koşul | Gerekçe metni |
|---|---|---|
| Sat | ilk 11 dışı ve (satılık etiketi **ya da** 29+ yaş ve değeri var) | "N yaşında, ilk 11'de değil, tahmini değer €…" (+ "satılık işaretli") |
| Kirala | ilk 11 dışı, ≤ 21 yaş, potansiyel ≥ 6 puan üstünde, kilitli değil | "N yaşında, potansiyeli G puan üstünde ama ilk 11'de değil." |
| Tut | ilk 11'de / başka kulüpte kiralık / kural dışı | "İlk 11'de" / "Başka kulüpte kiralık" / "Satış ya da kiralama kuralına girmiyor" |

## 3. Performans (öneri isteği p95 ≤ 2 sn)

- **Araç:** `CareerRecommendationReportRunner` (`timing=true`; yeni `timing-positions`). Gerçek kariyerler 4 ve 50, ayrı geçici konteynerde.
- **Kapsam:** 12 ihtiyaç (GK, RB, CB, LB, CDM, CM, CAM, RM, LM, RW, LW, ST) × (1 soğuk + 2 ısınma + 20 ölçüm).
- **Hariç:** HTTP ve kredi işlemi.

| Kariyer | p50 | p95 | En yavaş | Soğuk ilk çağrı (en çok) |
|---|---:|---:|---:|---:|
| Crewe (id 4) | 167 ms | **219 ms** | 258 ms | 894 ms (GK, kulüp gücü hesabı dahil) |
| Port Vale (id 50) | 172 ms | **220 ms** | 230 ms | 728 ms |

Hedef karşılandı. Ölçüm tek kullanıcı ve tek istekle yapıldı; eşzamanlı yük ölçülmedi.

## 4. Testler (önce kırmızı)

**Backend** `CareerPlayerPageIntegrationTest` (8):
- kariyer levelFit = katalog
- facets lig gücü (iki sırada da kararlı)
- tohumlanmamış havuz

Tam `mvn test`: **571 test, 0 hata, 5 atlanan** (yeni opt-in rapor testi dahil) — normal ve ters sırada.

**Web:**

| Test | Kapsam |
|---|---|
| `leagueLevel.test.ts` | eşik, ±, bilinmiyor |
| `careerPlayerPage.test.tsx` | yardım metni eski hâlinde; başlık göstergesi; <480px rol adı |
| `careerPlayersPage.test.tsx` | liste sütunu ve ızgara kartı |
| `deskRules.test.ts` | `sellAdvice`; Masa ile aynı "Sat" listesi |
| `transferPlan.test.ts` | alım sonrası bütçe, kısa liste bedeli, oyun tarihine göre ay |
| `transferCenterPage.test.tsx` (12) | aşağıda |

`transferCenterPage.test.tsx` kapsamı:
- ihtiyaç ↔ adres; Tüm kadro; adresten açılış
- ihtiyaç yokken çıkış
- bütçe bandı; bütçe yok
- aday satırı (alım sonrası bütçe, lig seviyesi, bağlantı, kısa listeye ekle)
- kısa liste (ad, tavan kaydı, çıkar)
- HAYAL anahtarı (adres + istek); kapalıyken istek
- satış planı (öneri, gerekçe, oyun tarihine göre ay)
- yalnız v3 uçları
- boş durum

Web **879 test**, lint 0 hata (34 uyarı, değişmedi), build yeşil.

## 5. Kapılar

**`scripts/transfer-shots.mjs`** (yeni): **42 çekim, 0 sorun.**
- **Durumlar** (375/768/1280 × koyu/açık):
  - varsayılan (zayıf halka yok)
  - ihtiyaç seçili (Tüm kadro, 12 ihtiyaç, gerçek adaylar)
  - uzak ihtimaller açık
  - kısa liste dolu
  - satış planı kaydırılmış (bant)
  - boş aday
  - bütçe yok
- **Ölçümler:** taşma 0, axe serious/critical 0, konsol/ağ hatası 0, minFont 12px, bant sızıntısı 0.
- **Öneri ucu ücretli:** her farklı istek (mevki, rol, uzak ihtimaller) gerçek uca bir kez gidiyor, sonra o gerçek yanıt yalnız test tarayıcısında yeniden oynatılıyor. Koşu başına 3 gerçek istek. Yalnız "boş aday" durumu fikstür.
- **Kapıda bulunup düzeltilenler:**
  - Aday satırındaki HAYAL kova çipi koyu temada 4,41:1 kontrasttaydı (v2'den beri). Satır artık nötr `BucketChip` kullanıyor.
  - "Hayal transferler" başlık sırası h4 → h3.
  - 480px altında aday satırının uyum sütunu adı sıkıştırıyordu; satırın altına indirildi.
  - Bütçe kutuları 375px'te sıkışıyordu; 480px altında alt alta dizildi.
  - Kapı betiklerine `--out` eklendi; regresyon koşuları commit'li çekimleri ezmiyor.

**Regresyon:**

| Kapı | Çekim | Sorun | Not |
|---|---:|---:|---|
| Kariyer listesi | 40 | 0 | her liste çekiminde Lig seviyesi çipi var |
| Kariyer oyuncu sayfası | 114 | 0 | — |
| UT oyuncu sayfası | 32 | 0 | — |

## Notlar

- Taze Crewe kariyerinde (kapı hesabı) zayıf halka ya da derinlik açığı yok. Varsayılan görünüm boş ihtiyaç + "Tüm kadroyu göster"; aday çekimleri Tüm kadro üzerinden alındı.
- Bir kaynak dosya düzenlemesi (`RecommendationPanel`'de iki satıra aynı prop'un eklenmesi) Edit aracı yerine bir Python satırıyla yapıldı. İçerik aynı; kural ihlali olarak not edildi.
- "İhtiyaç yokken Tüm kadroyu göster" testi, kodla aynı adımda yazıldı (önce kırmızı gözlenmedi).
