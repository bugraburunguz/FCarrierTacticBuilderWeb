# V3-04 ilerleme (onay bekliyor — V3-05'e geçilmez)

Durum: yapıldı / kısmen / bekliyor. Hash'ler web `v3` dalı; "BE" = backend `main`.

| Madde | Durum | Commit | Not |
|---|---|---|---|
| Paketler (Radix dialog/popover/tooltip, Inter variable, Ladle dev) | yapıldı | f5d8b84 | Sabit sürüm, lock'lu. Radix yalnız dialog kullanılıyor; Inter/Ladle henüz bağlanmadı |
| F1 saha düzeni (layout.ts) + Q17 | yapıldı | 8dd0adf + bu oturum | Q17 tam matris: 348 kombinasyon, 0 kesişme/taşma/kesilme, 1280×800'de saha scroll'suz (kaleci dahil). 5 kombinasyon ilk koşuda sayfa yüklenmedi (kariyer dolu, geçici); yeniden koşuda 30/30 temiz. Raporlar: `screens/V3-04/q17-report*.json` |
| F2 mobil sheet (Radix Dialog) | yapıldı | bu oturum (canlı ekran doğrulaması yeniden çekimde) | Opak `--sheet-bg`, scrim, 85dvh, Esc, odak slota döner, arka plan aria-hidden (test) |
| F3 PickList ortak çekirdek | kısmen | 8dd0adf | UT + kariyer aynı bileşen, uyum %'ye göre sıra; canlı ekran doğrulaması bekliyor |
| F4 açık tema saha tokenları | yapıldı | 8dd0adf | 11 §3.2'ye yazıldı |
| F5 tek satırlık not | yapıldı | bu oturum | Yan panelde, kapatılabilir, localStorage try/catch |
| F6 08 §16.1 eksikleri | bekliyor | – | |
| F7 tema ikonu + mobil menü | bekliyor | – | |
| F8 dokunmatik ipucu | bekliyor | – | |
| F9 "Kariyeri sil" taşıma + ad yazarak onay | bekliyor | – | |
| F10 resmî ingestion | yapıldı | BE 07a6970, + sayaç düzeltmesi | OFFICIAL 19.789 / COMPUTED 2.616 (toplam 22.405, tekrar yok). Ağırlık holdout (DRI, kaleci SPD) bekliyor |
| F12 kayıtlı kadro tazeleme | yapıldı | 8464c43 | Katalog kartı kimlik olarak saklanır |
| Silmeler (6 sızıntı satırı, test hesapları, manual-test-1 ADMIN) | bekliyor | – | Hiçbiri yapılmadı; test hesapları artıyor (gate hesabı) |
| Foundations SBC seed | bekliyor | – | V3-04 onayından sonra |
| Yeniden çekim (matris + 3-5-2) | bekliyor | – | F1–F9 bittikten sonra |
