# V3-04 ilerleme (onay bekliyor — V3-05'e geçilmez)

Durum: yapıldı / kısmen / bekliyor. Hash'ler web `v3` dalı; "BE" = backend `main`.

| Madde | Durum | Commit | Not |
|---|---|---|---|
| Paketler (Radix dialog/popover/tooltip, Inter variable, Ladle dev) | yapıldı | f5d8b84 | Sabit sürüm, lock'lu. Radix yalnız dialog kullanılıyor; Inter/Ladle henüz bağlanmadı |
| F1 saha düzeni (layout.ts) + Q17 | yapıldı | 8dd0adf, f62f446 | Q17+Q18 tam matris (29 formasyon × 4 boyut × boş/dolu × UT/kariyer = 464): 0 kesişme, 0 taşma, 0 okunabilirlik ihlali; 5 sayfa-yüklenmedi (kariyer dolu, geçici) yeniden koşuda 40/40 temiz |
| **Q18 okunabilirlik kapısı** | yapıldı | bu oturum | ≥1024px kart ≥56, 375px ≥48, kart içi yazı ≥11px, OVR ≥14px; masaüstünde rol etiketi kısaltmasız; kompakt üst bar (48px) + sekmeler üst barda; sağ panel sticky. Raporda 1280×800 ve 1440×900 scroll'suz sığma ayrı (hedef). Rapor: `screens/V3-04/q17-q18-report.json` |
| B. Kulüp ikizleri dry-run | yapıldı (birleştirme YOK) | bu oturum | `docs/review/v2/club_twins_dryrun.md`; `club_alias` şeması önerildi, onay bekliyor |
| C. Gate/Q17 hesap teardown | yapıldı | bu oturum | `--auto-account` + `scripts/teardown-gate-accounts.sql` (yalnız `gate-`/`q17-` önekleri, localhost). Eski f11-gate-* ve diğer test hesapları silme maddesinde bekliyor |
| F2 mobil sheet (Radix Dialog) | yapıldı | bu oturum (canlı ekran doğrulaması yeniden çekimde) | Opak `--sheet-bg`, scrim, 85dvh, Esc, odak slota döner, arka plan aria-hidden (test) |
| F3 PickList ortak çekirdek | kısmen | 8dd0adf | UT + kariyer aynı bileşen, uyum %'ye göre sıra; canlı ekran doğrulaması bekliyor |
| F4 açık tema saha tokenları | yapıldı | 8dd0adf | 11 §3.2'ye yazıldı |
| F5 tek satırlık not | yapıldı | bu oturum | Yan panelde, kapatılabilir, localStorage try/catch |
| F6 08 §16.1 eksikleri | bekliyor | – | Inter'i `--font-body`'ye bağla ve latin-ext'i Türkçe metinle görsel doğrula (D) |
| F7 tema ikonu + mobil menü | bekliyor | – | |
| F8 dokunmatik ipucu | bekliyor | – | |
| F9 "Kariyeri sil" taşıma + ad yazarak onay | bekliyor | – | |
| F10 resmî ingestion | yapıldı | BE 07a6970, + sayaç düzeltmesi | OFFICIAL 19.789 / COMPUTED 2.616 (toplam 22.405, tekrar yok). Ağırlık holdout (DRI, kaleci SPD) bekliyor |
| F12 kayıtlı kadro tazeleme | yapıldı | 8464c43 | Katalog kartı kimlik olarak saklanır |
| Silmeler (6 sızıntı satırı, test hesapları, manual-test-1 ADMIN) | bekliyor | – | Hiçbiri yapılmadı; test hesapları artıyor (gate hesabı) |
| Foundations SBC seed | bekliyor | – | V3-04 onayından sonra |
| Yeniden çekim (matris + 3-5-2) | bekliyor | – | F1–F9 bittikten sonra |

## Ertelenenler
- Ladle story'leri: V3-08'e bırakıldı (paket devDependency olarak kurulu).
- Inter: kurulu, bağlı değil (F6 ile).
