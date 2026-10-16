# V3-06d — Kariyer Masası (v3) + tek kariyer menüsü

Durum: yapıldı, ekran onayı bekliyor. Çekimler `screens/V3-06d/`:

| Klasör | İçerik | Çekim |
|---|---|---:|
| `desk/` + `menu/` | Masa ve menü | 54 |
| `transfer/` | Transfer Merkezi (regresyon) | 42 |
| `career-list/` | kariyer listesi (regresyon) | 40 |
| `career-player/` | kariyer oyuncu sayfası (regresyon) | 114 |

## 0. Pazarlık tavanı boşken

`MoneyInput` değer yokken boş; placeholder artık "0" yerine "Örn. 2,5" (ENG-02). Boş bırakılınca tutar yok döner, 0 kaydedilmez. Kırmızı test önce: `MoneyInput.test.tsx`.

## 1. Tek kariyer menüsü

Üst çubuktaki Masa/Transfer/Gelişim/Yeni kariyer sekmeleri kalktı. Masaüstünde sol ray, mobilde alt çubuk; UT ve kariyer aynı `AppShell` bileşeni, farklı öğe listesi (`CAREER_NAV` / `UT_NAV`). v2 `Layout` eski `NAV` ile değişmedi. Aktif öğe rotadan (`activeNav`), `aria-current="page"`.

| Öğe | Rota | Aktif olduğu rotalar | Mobil |
|---|---|---|---|
| Masa | `/career/desk` | `/career/desk`, `/career/new` | alt çubuk |
| Oyuncular | `/players` | `/players`, `/players/:id`, `/wonderkids`, `/compare` | alt çubuk |
| Taktik & Kadro | `/squad/builder` | `/squad*`, `/tactics*`, `/replicas*`, `/recommend`, `/scouting` | alt çubuk ("Kadro") |
| Transfer | `/career/transfer` | `/career/transfer` | alt çubuk |
| Gelişim | `/career/growth` | `/career/growth` | Daha fazla |
| Takımlar | `/teams` | `/teams` | Daha fazla |
| İçe aktar | `/career/import` | `/career/import` | Daha fazla |
| Yeni kariyer | `/career/new` | — | Daha fazla (masaüstünde Masa'da seçicinin yanında) |

- **Mobil alt çubuk:** 5 öğe: Masa, Oyuncular, Kadro, Transfer ve "Daha fazla". "Daha fazla" bir sheet açar: Gelişim, Takımlar, İçe aktar, Yeni kariyer. Aktif sayfa sheet'teyse "Daha fazla" aktif görünür.
- **Sayfa içi sekmeler:** Oyuncular (Oyuncu ara / Wonderkids / Karşılaştır) ve Taktik & Kadro alt sekmeleri her genişlikte sayfanın içinde.
- **UT menüsü:** değişmedi; mobilde ilk 5 öğe.
- **Testler:**
  - `navConfig.test.ts`: sıra, 14 rota → aktif öğe, mobil çubuk, UT/v2 değişmedi.
  - `appShellNav.test.tsx`: her kariyer rotasında yalnız doğru öğe `aria-current`, üst sekme yok, Daha fazla sheet'i, sayfa içi sekmeler, UT değişmedi.

## 2. Kariyer Masası (v3, `/career/desk`)

v3'te `DeskPage`; v2 `CareerDeskPage` v2 için kalıyor. `DeskSettings` ve `Timeline` `features/desk/`'e taşındı; v2 de bunları kullanıyor.

- **Başlık:** kariyer seçici + "Yeni kariyer" (seçicinin kendi düğmesi; tek düğme) + son içe aktarma tarihi.
- **Sekmeler:** Masa | Ayarlar (`?sekme=ayarlar`). Ayarlar `DeskSettings key={career.id}` (WEB-BUG-01 korunuyor).
- **Dönem bandı:**
  - Transfer dönemi bitimine kalan gün: dönem sonu − oyun tarihi (ENG-04; bugünün tarihi kullanılmıyor).
  - Transfer bütçesi.
  - Maaş bütçesi kullanımı: kadro haftalık maaş toplamı ÷ maaş bütçesi.
  - Bilinmeyen değer kutusu hiç gösterilmiyor; 0 yok. Eksikler tek satırda yazılıyor, örneğin "Bütçe, oyun tarihi ve maaş verisi girilmemiş…".
  - Kadro maaş toplamı için facets ucuna `squadWageEur` eklendi (API CONTRACT CHANGE). Yalnız kadrodaki herkesin maaşı kayıtta varsa geliyor, biri bile eksikse alan yok. Kırmızı IT önce yazıldı.
- **Kahraman:**
  - Takım uyumu yarım daire göstergesi (%).
  - Altında en zayıf 3 halka: oyuncu kartı + rozet + seviyesine göre %.
  - Her kartta "Aday bul" → `/career/transfer?ihtiyac=slot-<slot>`; Transfer o ihtiyacı seçili açıyor (V3-06c testi).
- **Sağ sütun:** Uyarılar, "Bu dönemin 3 işi" (`deskRules.suggestActions`; Transfer satış planıyla tek kaynak `sellAdvice`), Zaman çizelgesi (Türkçe etiketler, WEB-BUG-17).

### Takım uyumu kaynağı ve kadroyla eşitlik

- **Kaynak:** `useSlotFits` (her dolu slot için `/fit/role` + `engineVersion: 'v3'`) → `fitDisplay(...).pct` → yeni tek fonksiyon `teamFitPct` (dizilimdeki seviyesine göre % ortalaması).
- **Kullanım yerleri:** Masa göstergesi, kadro kurucudaki "Kadro uyumu" ve "Rol uyumu" ortalaması (önceden elle hesaplanan iki ortalama vardı), v2 Masa.
- **Testler:** Masa göstergesinin `teamFitPct(fitDisplay(...))` ile aynı sayıyı verdiğini doğruluyor (%43). Ayrıca bir kaynak kapısı, kadro kurucunun aynı fonksiyonu kullandığını ve elle ortalama kalmadığını denetliyor. Kadro kurucu sayfası testte render edilemeyecek kadar ağır olduğu için eşitlik bu iki yoldan doğrulandı.
- **Yalnız v3:**
  - `/fit/lineup` yalnız otomatik dizilim (oyuncu ataması) için çağrılıyor ve sunucuda kariyer motoru v3 ile çözülüyor (`careerEngineVersion = v3`). Ekranda gösterilen puan buradan değil, `/fit/role` v3'ten geliyor.
  - Test, eski uçların (`/fit/squad`, `/advisor/tactic`, `/advisor/positions`, gelişim ucu) çağrılmadığını ve tüm `/fit/role` çağrılarının v3 olduğunu doğruluyor.

### Uyarı kuralları (`deskRules.alerts`, tip alanı eklendi)

| Tip | Kural | Veri yoksa |
|---|---|---|
| CONTRACT (yeni) | Kadrodaki (kiralık gitmemiş) oyuncunun sözleşmesi oyun tarihine göre ≤ 6 ay içinde bitiyor | Oyun tarihi ya da sözleşme yoksa hiç üretilmez |
| PLATEAU | ≤ 24 yaş ve OVR ≥ POT ("potansiyeline ulaştı") | POT yoksa yok |
| AGE | 30+ yaş ve son içe aktarmada OVR düştü | Fark verisi yoksa yok |
| DEPTH | Mevki grubunda asgari derinliğin altında | — |
| WINDOW | Dönem sonuna ≤ 14 gün (oyun tarihine göre; v2'de oyun tarihi verilmezse bugüne göre) | Dönem sonu yoksa yok |

Eşik tek yerde: `lib/contract.ts` `CONTRACT_MONTHS = 6`. Kariyer listesinin "Sözleşme ≤ 6 ay" süzgeciyle aynı; `contractMonthsLeft` Transfer satış planıyla ortak.

## 3. Testler

- **Backend:** `CareerPlayerPageIntegrationTest` 9 (+ kadro maaş toplamı). Tam `mvn test` **572 test, 0 hata, 5 atlanan**, normal ve ters sırada.
- **Web:** **921 test**, lint 0 hata (34 uyarı, değişmedi), build yeşil. Yeni ya da güncellenen:

  | Test | Kapsam |
  |---|---|
  | `MoneyInput.test.tsx` | boşken boş alan, placeholder "0" değil |
  | `navConfig.test.ts` | menü sırası, aktif öğe, mobil çubuk |
  | `appShellNav.test.tsx` | `aria-current`, Daha fazla, sayfa içi sekmeler, UT değişmedi |
  | `deskRules.test.ts` | uyarı tipleri, oyun tarihine göre dönem, Türkçe etiketler |
  | `needsFromFits.test.ts` | `teamFitPct` + kadro kurucu kaynak kapısı |
  | `features/desk/careerDeskPage.test.tsx` (9) | takım uyumu = ortak fonksiyon; zayıf halka → Transfer bağlantısı; dönem bandı; bilinmeyen değer yok; uyarılar (oyun tarihi yoksa sözleşme yok); 3 iş; zaman çizelgesi + son içe aktarma + tek Yeni kariyer; Ayarlar sekmesi; yalnız v3 uçları |

## 4. Kapılar (`scripts/desk-shots.mjs`, yeni): 54 çekim, 0 sorun

- **Masa durumları:** dolu kariyer, kaydırılmış, Ayarlar sekmesi, verisi eksik kariyer; 375/768/1280 × koyu/açık.
- **Dolu kariyerin verisi:**
  - Bütçe, maaş bütçesi, dönem sonu ve oyun tarihi API ile gerçekten yazıldı.
  - Kadro maaş toplamı ve iki sözleşme bitişi kayıt verisi gerektirdiği için yalnız test tarayıcısında yanıta eklendi (fikstür).
  - Zayıf halka kartları gerçek motorla üretildi: dizilimde kaleci ile bir saha oyuncusunun yeri değiştirildi, iki "yanlış rol" çıktı.
  - Sonuç: takım uyumu %57, 2 zayıf halka, 2 sözleşme uyarısı, dönem 11 gün, maaş %79.
- **Eksik kariyer:** kutu yok, "girilmemiş" notu var, sözleşme uyarısı yok.
- **Menü:** her kariyer rotasında aktif öğe (1280 sol ray, 375 alt çubuk; Gelişim/Takımlar/İçe aktar → "Daha fazla") + Daha fazla sheet'i; hepsi doğru.
- **Ölçümler:** taşma 0, axe serious/critical 0, konsol/ağ hatası 0, minFont 11px, bant sızıntısı 0.
- **Kapıda bulunup düzeltilen:** "Yeni kariyer" iki kez görünüyordu (kariyer seçicinin kendi düğmesi + Masa bağlantısı); tek düğmeye indirildi.

**Regresyon (menü değiştiği için):**

| Kapı | Çekim | Sorun |
|---|---:|---:|
| Transfer | 42 | 0 |
| Kariyer listesi | 40 | 0 |
| Kariyer oyuncu sayfası | 114 | 0 |
