# V3-05b-c — kart ızgarası yoğunluğu, yapışkan üst başlık, küçük yazılar

1. **Ölçekleme, gizleme değil.** Stat ve çip yazısı küçük kartta ölçekle küçülmüyor; ≥ 11px tabana oturuyor. Sığdıkları en küçük genişlik gerçek tarayıcıda ölçüldü (`scripts/card-width-probe.mjs` + `scripts/card-probe/`, en geniş metinler: "≈99", saha/kaleci etiketleri): **6 stat ≥ 118px, çipler ≥ 140px** (`STATS_MIN_WIDTH`, `META_MIN_WIDTH`). Izgarada kart hücreyi doldurur (genişlik = hücre − 2×8px); sütun sayısı kart 140px altına düşmeyecek en çok sütun (`cardGridLayout`). Gizleme yalnız bu eşiklerin altında (ör. 44px küçük resim). Saha kartları değişmedi (q17 aşağıda).

| Genişlik | Sütun | Kart | 6 stat | Çipler |
|---|---|---|---|---|
| 375 | 2 | 149px | var | var |
| 768 | 4 | 159px | var | var |
| 1280 | 6 | 167px | var | var |
| UT oyuncu mobil | – | 180px | var | var |

2. **Yapışkan üst başlık.** `glass.css` cam sınıfları `@layer components` içine alındı. `:where(.glass)` seçilmedi: yalnız özgüllüğü sıfırlar ama kural katmansız kalır ve katmansız CSS her katmanlı utility'yi (Tailwind v4 `@layer utilities`) özgüllükten bağımsız yener; katman ise `sticky`, `rounded-none`, `hover:bg-…` utility'lerinin kazanmasını sağlar. Genel kurallar (v3 `body`, aurora, hareket, saha) katmansız kaldı: index.css'teki katmansız v2 `body` kuralını yenmeleri gerekiyor. Başlık `glass-sticky` (opak) ve `h-[var(--header-h)]`; tüm v3 yapışkanları `--header-h` ile hizalı. `.glass-sticky` artık `--sheet-bg`'yi opak `--bg-base` üstüne boyar (alfa 1): 0,97'de koyu zeminde kalın beyaz tablo yazısı başlığın arkasından seçilebiliyordu. 320px başlık taşması giderildi (<360px dolgu/aralık).

| Yapışkan | Önce | Şimdi | Doğrulama |
|---|---|---|---|
| AppShell üst başlık | `glass sticky` → computed `relative` (yapışmıyordu) | sticky top-0, `--header-h`, opak | bant ölçümü, alfa 1 |
| AppShell sol menü | `glass sticky top-12` → relative | sticky `top-[--header-h]` | masaüstü çekimler |
| Mobil alt menü | `glass fixed` → relative (sayfa sonunda akıyordu) | fixed, opak (`main` zaten `pb-24`) | alfa 1, altındaki kart görünmez |
| Kart veritabanı filtre çubuğu | `top-16` (16px boşluk) | `top-[--header-h]`, boşluksuz | bant 0 sızıntı |
| Kart tablosu başlığı | kaydırma kabı içinde, sayfaya yapışmıyordu | ≥820: `--header-h` + ölçülen `--filters-h`; <820: kap içinde (yatay kaydırma) | bant 0 sızıntı (1280: başlık+çubuk+thead) |
| UT versiyon şeridi | `top-14` | `top-[--header-h]` | bant 0 sızıntı (375/768) |
| UT kart sütunu (≥820) | `top-16` | `top-[--header-h]` | çekim |
| Yan panel (SidePanel) | `top-14`, `100dvh-4.5rem` | `top-[--header-h]`, `100dvh-[--header-h]` | q17 (kadro sayfası) |
| Replikalar filtre çubuğu | `top-16`, saydam cam | `top-[--header-h]`, opak | kaynak kapısı |
| Replika detay yan paneli | `top-14` | `top-[--header-h]` | kaynak kapısı |
| v2 `Layout` başlığı, `lg:top-24` (Wizard/Teams/Squad) | – | değişmedi (v2, `.glass` yok) | kapsam dışı |

3. **Küçük yazılar.** Sayfa geneli ölçüm (`pageMinFont`) her çekimde: görünür en küçük yazı **11px** (FitBadge 11px, kart çipleri 11px, "Ana mevki" 12px); 11px altı 0. Hariç tutulanlar: aria-hidden logo yazısı ("FC Assist" — bağlantının erişilebilir adı ayrı), sıralama oku "↓", mobil filtre sheet'i açıkken Radix'in aria-hidden yaptığı arka plan metni. q17 saha kartları: min 11px, OVR ≥ 14px.
4. **PlayStyle adları:** tek sözlük `lib/playstyles.ts` + `playStyleName(id, level)`; UT Statlar, Karşılaştır ve fark paneli buradan okur. EA resmî İngilizce adları (backend `messages.properties` `ps.*` ile aynı); "Game Changer" → "Gamechanger". Türkçe resmî adlar bilinmediği için çevrilmedi. Test: katalogdaki 36 anahtarın tamamı.
5. **Mobil sekme payı:** en uzun gerçek meta (KS Wieczysta Kraków · SSE Airtricity Men's Premier Division · Central African Republic, 3 mevki) çekim betiğinde API yanıtı yalnız test tarayıcısında değiştirilerek ölçüldü: önce 656px; Karşılaştır geri bağlantısı satırına, meta mobilde 12px → **630px** (Mbappé: 594px).

**Kapılar:** 05a 54 çekim, 05b 32 çekim (kaydırılmış + uzun meta dahil) sorunlu 0: taşma 0, axe serious/critical 0, konsol/ağ 0, sayfa minFont ≥ 11, yapışkan bant sızıntısı 0. q17: 522 kombinasyon sorunlu 0; V3-04 referansıyla 522/522 aynı (kart genişliği, minFont, OVR, saha genişliği); dolu kariyer atlandı (test hesabı açıp silmek gerekir). Görüntüler `screens/V3-05a/`, `screens/V3-05b/`; q17 `screens/V3-05b-c/q17.json`.

**Dürüst notlar:** (1) Mobil alt menü artık tasarlandığı gibi sabit; bu bir davranış değişikliği. (2) <820px'te tablo başlığı sayfaya yapışmaz (yatay kaydırma kabı). (3) Ladle 5.1.1 Vite 8 ile çalışmadığı için ölçüm sayfası `scripts/card-probe/` (yalnız dev sunucu). (4) UT kulüp sayfası (`UtClubPage`) hâlâ sabit `md` (124px) kart kullanıyor: 6 stat görünür, çipler gizli.
