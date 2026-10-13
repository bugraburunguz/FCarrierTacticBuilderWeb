# V3-04 ilerleme — **V3-04 onaylandı (2026-10-13)**; V3-04.1 düzeltmeleri aşağıda. Sonraki: Faz E3 motor (13_KARIYER_MOTORU_YENIDEN.md), V3-05 bekliyor

Durum: yapıldı / kısmen / bekliyor. Hash'ler web `v3` dalı; "BE" = backend `main`.

| Madde | Durum | Not |
|---|---|---|
| Paketler (Radix dialog/popover/tooltip, Inter variable, Ladle dev) | yapıldı | f5d8b84. Radix: dialog + popover kullanılıyor (tooltip henüz yok); Inter `--font-body`'ye bağlı; Ladle story'leri V3-08'e |
| F1 saha düzeni + Q17 | yapıldı | `layout.ts`, `scripts/q17.mjs` |
| Q18 okunabilirlik + isim eki | yapıldı | kart ≥56/48px, kart içi yazı ≥11px, OVR ≥14px, her dolu kartta soyad şeridi; 6 boyutta ölçüm |
| F2 mobil sheet (Radix Dialog) | yapıldı | opak, scrim, odak hapsi, Esc; canlı çekimde görüldü |
| F3 PickList ortak çekirdek | yapıldı | UT + kariyer aynı bileşen, uyum % sırası; canlı ekranda doğrulandı; axe `aria-required-children` düzeltildi |
| F4 açık tema saha | yapıldı | 11 §3.2 |
| F5 tek satırlık not | yapıldı | |
| F6 08 §16.1 | yapıldı | kadro adı, rating yıldızı, tüm kadro ortalamaları, "Rol uyumu %", kimya/fiyat boş durumları; Inter bağlandı (latin-ext + Barlow latin-ext 600/800 yüklü) |
| F7 tema ikonu + mobil menü | yapıldı | Radix Popover |
| F8 dokunmatik ipucu | yapıldı | |
| F9 "Kariyeri sil" taşıma + ad yazma | yapıldı | yalnız kariyer ayarlarında |
| F10 yüz ağırlıkları | yapıldı | holdout: DRI 45/30/10/5/5/5 (reactions, composure), kaleci SPD 60/40; 6+6 stat %100 tam isabet; `verified:false`, `_basis:empirical-holdout`; OFFICIAL 19.789 / COMPUTED 2.616 |
| F12 kayıtlı kadro tazeleme | yapıldı | katalog kartı kimlik olarak saklanır; tam kart için istek gitmez |
| Kulüp ikizleri (onaylı) | yapıldı | 35 yetim satır silindi, 34 alias, `club_alias` V29 + `seed/club-aliases.json` (hash'li); kimya adı yedek anahtarı cinsiyetli |
| Bozuk diakritik kök neden | **açık** | 4+1 satır (328/330/379/477, 167 "BK Hcken") ilk ingest döneminden, EA id yok; yeniden üretilemedi, importer UTF-8 doğru; test yazılamadı |
| Silmeler | yapıldı | 6 sızıntı satırı; 18 test hesabı + 7 kariyer (yedekli); manual-test-1 SQL ile yükseltilmişti, bootstrap testi eklendi |
| Gate/Q17 hesap teardown | yapıldı | `--auto-account`, `gate-session.mjs`; gerçek koşuyla doğrulandı |
| Foundations SBC seed | bekliyor | V3-04 onayından sonra |
| Yeniden çekim | yapıldı | UT + kariyer × boş/dolu/seçili × 375/768/1280 × koyu/açık + reduced-motion/transparency; dolu 3-5-2 (UT + kariyer, core matris). Q17+Q18 son matris: 696 kombinasyon, 695 temiz, 1 geçici yükleme hatası (kariyer dolu 5-3-2 @375) |

## Q sonuçları
- Q16 (çekirdek eşitliği): `q16.test.ts` + 18 `describe.each(['ut','career'])` testi yeşil.
- Q17/Q18: `screens/V3-04/q17-q18-final.json`. Scroll'suz sığma (hedef): 1280×800 24/116, 1366×768 32/116, 1536×864 64/116, 1440×900 116/116.

## Ertelenenler
- Ladle story'leri: V3-08.
- Kalan yetim kulüpler (22): raporlandı, silinmedi.

## V3-04.1 (onay koşulu düzeltmeleri)
| Madde | Durum | Not |
|---|---|---|
| 1 Türkçe büyük harf (PEDRİ) | yapıldı | isim öğesinin lang'ı uyruktan (TR/AZ → tr, diğerleri en); `lib/nameCase.ts`; kart isim şeridi + scaled isim, avatar/kulüp kısaltması `toLocaleUpperCase('en')`; evolution/objective adları lang="en"; kaynak kapısı: yalın `toUpperCase()` yok |
| 2 375px "Kayıt ol" | yapıldı | nowrap; <480px "Giriş" üst çubuktan menüye iner |
| 3 "Meta rating*" HelpPopover | yapıldı | |
| 4 sbcTraditional perf testi | yapıldı | `npm run test:perf` ayrı komut (5 koşu tek başına hep geçti, ~0,6 sn); ana `npm test` flaky değil |
| 5 22 yetim kulüp | yapıldı | 0 bağ doğrulandı (FK'siz tablolar dahil); 12 alias + 22 silme, yedek `backups/club_before_orphans_*.sql`; yer tutucu ad ingestion'da reddedilir (test) |
| 6 diakritik veri kalitesi testi | yapıldı | `ClubDataQuality` (aksan düşmüş/sıyrılmış ikiz, U+FFFD, yer tutucu) + açılışta uyarı logu + test |

## Faz E3 (motor) — başladı
- Denetim + teşhis: `eng_audit_E3.md`; golden set taslağı: `golden_set_draft.md` (Buğra onayı bekliyor). Motor kodu yazılmadı. V3-05 bekliyor.
- Sıra (Buğra kararı): E3-3 → E3-4 → E3-5 → E3-1 → E3-2 → E3-6 …
- **E3-3 yapıldı** (attr-norms, pos-dist seed'leri, CI değişmezleri) · **E3-4 yapıldı** (124 rol vektörü, temel attr, PS, aşinalık/ayak/fiziksel seed'leri) · **E3-5 yapıldı**: FitEngineV3, altın set 51/51 + τ 1,00, jqwik özellik testleri, `fit_level_norms` (V30), `engine_version` yapılandırması; rapor `E3-5_rapor.md` (sapmalar dahil). Buğra kararı bekleyen: UT motor sürümü (karşılaştırma tablosuna göre), rozet eşikleri, Holding ayarı notu.
- Sıradaki: E3-1 (career_player tasarım+şema+kırmızı arch testi; veri silen göç yok).
- **E3-5b-1 yapıldı** (tepe doygunluğu): `currentFit` = 85'e kadar aynen, üstü 85+15·tanh((x−85)/15) (kırpma yok, kesin sıra; jqwik özelliği); levelFit 100 yalnız bandın tek en iyisine (eşit değerlerde orta rank); rozet eşikleri levelFit ≥65 iyi / 40–65 seviyesinde (renksiz) / 20–40 zayıf / <20 yanlış rol, `fitLabel` + tooltip metni; Holding "kalibrasyon çifti" olarak etiketli ve τ dışı raporlanıyor (golden strict 50/50, τ=1,00); 13 §3.2 madde 8 güncellendi.
- **E3-5b-2 yapıldı** (bağımsız doğrulama, ayar YOK): LE role1..9 (21.619 oyuncu; ++ 279 oyuncu) ile levelFit. Ağırlıklı AUC +/++ = 0,613 (hedef 0,75 tutmadı), yalnız ++ = 0,828; 13 rol AUC<0,6. Rapor `E3-5b_role_dogrulama.md`; Buğra kararı bekliyor.
- **E3-5b-3 yapıldı**: UT karşılaştırma örneği `E3-5b_ut_karsilastirma.md` (ST Spearman 0,47; CB 0,93, CAM 0,91, CDM 0,89). Buğra onayı bekliyor (UT v1'de).
- **E3-5b-4 yapıldı**: AdvisorService, PositionAdviceService, TacticRecommenderService `RoleFitRouter` üzerinden `career-engine-version` bayrağına bağlandı (ucuz çıktı: 4 dosya). v3'te `reasons` = ilk 3 katkı (sayısal; düzyazı E3-8). DevelopmentService (büyüme projeksiyonu `projectedRating` kullanır) bilerek v1'de bırakıldı → E3-6.
