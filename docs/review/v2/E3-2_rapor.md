# E3-2 raporu — career_player: çift yazma → backfill → okuma geçişi (2026-10-14)

## Bitiş ölçütleri
| Ölçüt | Durum |
|---|---|
| Cırcır listesi boş, strict varsayılan açık | **Evet.** `CareerReadsOnlyCareerPlayerArchTest` koşulsuz (bilinen ihlal listesi silindi); kuralın bir karışık sorguyu yakaladığını kanıtlayan ikinci test var. |
| Eski ↔ yeni eşitlik testi | `CareerPlayerEquivalenceIntegrationTest` (4 senaryo: CSV içe aktarma, LE log + üretilmiş oyuncu + PS/aşinalık, içe aktarılmamış kariyerin ilk okuma tohumu, elle OVR/POT güncellemesi): oyuncu sayısı, OVR, pozisyon, 34 attribute birebir. Önce kırmızıydı (3 hata + 1 hata). |
| Crewe dahil canlı veride eşitlik | `tools/fit-seeds/career-player-equivalence.mjs`: **Crewe (4): eski 22.324 ↔ yeni 22.324, OVR/pozisyon/attribute farkı 0, eksik 0, fazla 0**; Port Vale (50): 22.381 ↔ 22.381, fark 0. `live` oyuncu sayısı = `career_player_data` satır sayısı (21.620 / 21.668). |
| Yedek | `backups/fcareer_full_before_career_player_backfill_20261014-0320.dump` (tüm DB, git dışı). Veri silen işlem yok; eski overlay tabloları yerinde ve çift yazmayla güncel. |
| Backfill | Başlangıçta, kariyer başına kendi işleminde upsert: 2 kariyer, ~8 sn (`fcareer.career.player-backfill-on-start`, bir kez çalıştırıldı, varsayılan kapalı). |
| Tam `mvn test` | 357 test, 0 hata (3 atlanan = opt-in doğrulama testleri). |

## Ne değişti
- **Yazma (çift yazma):** İçe aktarıcı ve masa düzenlemeleri eski tabloları yazmaya devam eder; ardından `CareerPlayerWriter` (ingestion paketi, katalog okuması yalnız burada) `career_player`'ı tazeler, `data_version` artar. LE `role1..9` → `role_familiarity` (`{kod%100: 1|2}`), `trait2` gizli özellikler + bilinmeyen bitler → `hidden_traits`. İçe aktarılmamış kariyer ilk okumada katalogdan, kendi işleminde tohumlanır.
- **Okuma:** `PlayerSearchRepository` iki profille çalışır; kariyer profili `player_rating`'e hiç dokunmaz. `PlayerService.fitPlayers/detail`, `CareerService` (içe aktarılan OVR/POT), `TeamInsightService`, kadro eşitleme `career_player` okur. Anlık görüntü `career_player`'ın `live` satırlarından.
- **Aşinalık artık motorda:** `FitPlayer.roleFamiliarity` kariyerde LE rol kodlarından (`LeRoleCodes`, `seed/le-role-codes.json`) rol kimliğine çevrilerek doldurulur → v3'te FAM terimi aktif.
- **V32:** `career_player.club_id` (katalog kulübü, gösterim/lig) ve `live` (LE oyun verisi olan oyuncu).
- **Geri alma:** bayrak yok. Eski okuma SQL'i silindiği için geri alma = bu commit'i geri almak; eski tablolar çift yazmayla güncel kaldığı için veri kaybı olmaz.

## Dürüst notlar / sapmalar
1. **Kök hata yakaladım ve düzelttim:** İlk tohumlama `REQUIRES_NEW` ile her çağrıda çalışınca, içe aktarma sırasında dış işlem kilidi tutan `career` satırı ve yeni işlem birbirini bekledi (takılma). Çözüm: önce mevcut işlemde varlık kontrolü, yalnız satır yoksa ayrı işlemde tohumla; tohumlama `career` satırına yazmaz.
2. **Kayıp test verisi çakışması:** Yeni testim aynı üretilmiş oyuncu kimliğini kullanıp başka bir test sınıfının "silinince sıfır" sayımını bozdu; kimlik ayrıldı.
3. **Gözlem farkı (küçük):** Katalog yedeği olan "live" oyuncunun takımı `club` tablosunda çözülemezse eskiden katalog kulübü gösterilirdi, şimdi kulüp boş kalır (kariyer takımı adı yine görünür). Canlı veride bu durumun sayısını ölçmedim.
4. **Crewe için `role_familiarity` / `hidden_traits` şimdilik boş:** bu veriler eski tablolara hiç yazılmamıştı; Crewe'nin bir sonraki LE dışa aktarımı (Lua dışa aktarıcı tüm `players` alanlarını verir) içe aktarılınca dolar. Re-import yapana kadar Crewe'de FAM terimi 0.
5. **FAM davranış değişikliği:** Kariyerde aşinalığı olan içe aktarılmış oyuncuların v3 puanı değişecek (Role+ / ++ seed bonusları). Bağımsız doğrulama (PS/FAM kapalı) bundan etkilenmez.
6. PlayStyle: içe aktarıcı bit çözümünü zaten yapıyordu (gömülü dizilerle); bu adım onu seed'e taşıdı, gizli özellik ve unknown bitleri ekledi, doğruladı (`E3-2_playstyle.md`).
7. İlk tur `LePlaystyleBitsTest` kod ile aynı oturumda yazıldı (derleme kırmızısı dışında ayrı kırmızı gözlemedim); eşitlik testi önce kırmızıydı.

## PlayStyle sonrası oyuncu içi doğrulama (özet; ayrıntı `E3-2_ps_dogrulama.md`)
Çift-ağırlıklı oyuncu içi AUC: PS kapalı **0,623** → PS açık **0,626** (hedef 0,70 tutmadı). Varsayılan roller 0,593 → 0,592; diğerleri 0,632 → 0,636. ≥0,70 olan rol 7 → 9 / 49. Rol bazında önce/sonra tablosu ve < 0,65 listesi (E3-4b girdisi, 27 rol) o dosyada.
