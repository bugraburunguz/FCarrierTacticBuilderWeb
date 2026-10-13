# V3-04 ilerleme (onay bekliyor — V3-05'e geçilmez)

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
