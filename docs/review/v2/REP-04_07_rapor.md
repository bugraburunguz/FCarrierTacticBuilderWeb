# REP-04 / REP-07 — replika ekranları ve eski preset geçişi

Durum: **ekran onayı bekliyor.** Ekran görüntüleri `screens/REP/` (28 çekim + `gates-report.json`), betik `scripts/rep-shots.mjs`.

## 1. Kural kararı (no_anchor) — özet
Hat bacağı "hat ≥ HIGH VE geri savunma < 5", çapa = d ≥ 0,8 roller + tüm Deep-Lying Playmaker focus'ları. 13 "yalnız hat bacağı" vakasının hepsinde geri savunma 5–6 (≥5): hat bacağı değişikliği hepsini uyarıdan çıkardı; DLP'li 11'inde "çapa yok" bilgisi de kalktı (Guardiola City 23 / Bayern 14, Sarri Napoli 18, Sacchi, Cruyff, Rodgers, Alonso, De Zerbi, Míchel, Motta, Postecoglou). DLP'siz Van Gaal Ajax 95 ve Nagelsmann Leipzig 20 yalnız bilgi seviyesine indi. no_anchor 24 → 1 (Lobanovskyi Dinamo Kyiv 86: 4-4-2, hat 80, çapasız ve ince savunma). Ayrıntı: `E3-9_replika_analizleri.md`.

## 2. Eski preset geçişi (REP-04)
**Eşleme (`seed/replica-legacy-ids.json`, `GET /replicas/legacy-ids`):** 34 eski REPLICA → 29 eşleşti, 5 eşleşmedi.

| Eski id | Yeni id |
|---|---|
| 25 kayıt | aynı id (örn. `sacchi_milan_1989`, `sarri_napoli_2018`, `zidane_real_2017`, `mourinho_inter_2010`) |
| `pep_barcelona_2011` | `guardiola_barcelona_2011` |
| `cruyff_ajax_1972` | `kovacs_ajax_1972` |
| `herrera_inter_1964` | `herrera_inter_1965` |
| `mourinho_real_2012` | `mourinho_realmadrid_2012` |

**Eşleşmeyen 5 (yeni sette karşılığı yok):** `galacticos_real_2003`, `pulis_stoke_2011`, `daum_fenerbahce_2005`, `denizli_besiktas_2009`, `mancini_city_2012`. Karar sende: seed'e eklenebilir ya da bu 5 gider.

**Kullanıcı verisinde başvuru:** yerel DB'de tüm veri dökümünde (preset tablosu hariç, `user_tactic` dahil) eski id'lerden **0 başvuru**; `user_tactic` zaten 0 satır. Backend'de preset id'si tutan kullanıcı tablosu yok. Web tarafında tek iz `tacticStore.presetId` (tarayıcı `localStorage`); preset bulunamazsa `useSquadWorkspace` onu kendiliğinden temizliyor, bu yüzden ayrıca taşıma yazılmadı. (Üretim DB'si bu oturumda yok: orada da dry-run aynı sorguyla yapılmalı.)

**Silme (dry-run → yedek → tek transaction → sayım):** dry-run 34 REPLICA satırı. Yedek `backups/preset_replica_before_delete_20261014.csv` (34 satır + başlık) ve `backups/presets_json_before_replica_removal_20261014.json`. Flyway V34 `DELETE FROM preset WHERE kind='REPLICA'` (tek transaction). Sonuç: STYLE 9 + PERSONAL 1 = 10 satır kaldı (`CatalogIngestionIntegrationTest`, `ReplicaMigrationIntegrationTest`). `presets.json` 44 → 10 kayıt.

**Eski uç:** `GET /presets?kind=REPLICA` bir sürüm daha yaşıyor: boş liste + `Deprecation: true` + `Link: </api/v1/replicas>; rel="successor-version"` (`LegacyReplicaPresetDeprecationFilter`). Web artık yalnız `/replicas` kullanıyor (Kadro kurucudan, sihirbazdan ve Auto-Fit'ten eski replika kolları çıkarıldı; Kadro kurucuda "106 gerçek takım replikası →" bağlantısı var). Eski bir preset id'sine giden `/replicas/{eskiId}` bağlantısı eşleme tablosuyla yeni replikaya yönlenir.

**Dürüst yan etki (BEHAVIOR CHANGE):** eski etiket tabanlı "Taktik tavsiyesi" (`AdvisorService`) replikaları da aday olarak puanlıyordu; replika kayıtları gidince artık yalnız STYLE/PERSONAL + uyarlanabilir adaylar üretiyor. Replikalar etiketle değil rolle tanımlı olduğundan eski puanlamaya taşınamaz; replika önerisi ayrı bir iş.

## 3. Ekranlar
- **Liste (Katalog şablonu):** yapışkan cam filtre çubuğu (≥820px'te yapışkan; dar ekranda akışta: ~400px'lik çubuk görünür alanı yerdi) — arama, formasyon, build-up, dönem (yıl aralığı), kategori çipleri (6). Süzgeçler adres çubuğunda (`?kategori=…&build=…`) paylaşılabilir. Kart: takım + sezon, hoca, kategori, mini saha (formasyon noktaları), formasyon/build-up/hat rozetleri, taktik kodu kopyala, "N dikkat noktası" (yalnız >0; uyarı+risk sayısı, bilgi değil). Yükleniyor (iskelet) / boş ("Süzgeçleri temizle") / hata ("Tekrar dene") durumları.
- **Detay (Detay şablonu):** solda V3 `Pitch` salt okunur (yeni `readOnly` kipi: slotlar etkileşimsiz, boş slot mevki yazar, rol etiketi düğme değil), sağda sekmeler: **Taktik** (kod + kopyala, formasyon/build-up/hat, "Oyuna aktar" 2 satır, Plan B), **Hikâye** (seed açıklaması, gerçek şekil, benzerlik ve oyunda birebir olmayanlar, kaynak notları + doğrulanması gerekenler), **Dikkat noktaları**, **Kadromla uygula**.
- **Dikkat noktaları dili:** "hata/uyarı/risk" yok; başlık "Bu taktiğin dikkat noktaları", renkli şiddet yok (nötr info ikonu), "Replikalar bilinçli tercihtir" `HelpPopover`'da; kanıt "Neden?" altında, iç metrik kodu yerine okunur ad (test: metinde `[A-Z]{3,}_[A-Z]` ve hata/uyarı/risk geçmez).
- **Kadromla uygula (REP-07):** `POST /replicas/{id}/apply`. Kariyer: kariyer kadrosu; UT: katalogla eşleşen kulüp kartları (OVR'a göre en çok 200; eşleşmeyen kart sayısı gösterilir); ikisi de yoksa katalogdan mevki başına en iyi 6 aday "Örnek kadro" (kaynak ekranda yazılı). Atama Hungarian + v3 (`SquadFitService.solve`, ayna denenmez: replika tarafları bilinçli). Çıktı 11 slot: oyuncu + `FitBadge` (aynı `fitLabels` sözlüğü) + "Seviyesine göre %N" (UT'de seviye verisi yoksa "Rol puanı N"). Boş/zayıf slot: kariyerde `Öner` → Transfer Merkezi `?pos=`, UT'de `Öner` → mevcut `PickBody` (kulüp/market/katalog) ile kart seçimi → havuza eklenip atama yeniden koşar. Sonuçla analiz oyunculu yeniden koşar (oyunculu bulgular aynı nötr bölümde).
- **Taktik slotuma kaydet:** 5 slot; dolu slotun üzerine yazmak ikinci onay ister. `PUT /user-tactics/{slot}` yalnız `replicaId` alır; kod, formasyon, build-up, hat, 11 rol sunucuda replikadan kopyalanır, `source_replica_id` dolar. Kariyer taktiği `career_id` ile, UT `career_id = NULL` ile ayrı tutulur. Öneri hattı (`TacticSlotLookup`) kayıtlı taktikten slot rolünü okur (test).

## 4. Testler
- Backend tam `mvn test`: **516 test, 0 hata, 4 atlanan.** Yeni: `ReplicaMigrationIntegrationTest` (4), `ReplicaApplyIntegrationTest` (7; **golden:** katalogun ilk 16 "Mock Player"ı + `guardiola_barcelona_2011` → slot→oyuncu tablosu `replica-apply-golden.json`), `UserTacticIntegrationTest` (4), `ReplicaSeedIntegrationTest` +1 (`attentionCount`), `VersioningSummariesIntegrationTest` (1), `TacticRulesTest` +2 (no_anchor).
- Web: lint hatasız, **516 test** (80 dosya) yeşil, build yeşil. Yeni: `replicaFilter` (7), `labels` (5), `useReplicaApply` (6), `replicas.test.tsx` (12: liste, süzgeç, kopyala, nötr dil, kanıt, öner bağlantıları, üzerine yazma onayı).
- Tam pakette bulunan **önceden var olan hata** (bu işte düzeltildi): `VersioningService.styleCount`, `ps_diff` NULL olan bir sürüm farkı satırı varken oyuncu aramasını (`/players`) 500 ile düşürüyordu; kırmızı test `VersioningSummariesIntegrationTest`.

## 5. Kapılar
| Kapı | Sonuç |
|---|---|
| Q1 yükleme/boş/hata | liste: iskelet, boş, hata (test); detay: iskelet + "Bu replika bulunamadı" + yeniden dene; uygula: iskelet, giriş yok, hata |
| Q3 yatay taşma 375/1280 | 28 çekimde **0** taşma |
| Q4 klavye + axe | axe serious/critical **0** (28 çekim); sekmeler ok tuşlarıyla (ArrowRight → Hikâye, 4 kombinasyonda doğrulandı); ilk koşuda tek moderate bulgu `heading-order` (kart başlıkları h3) → h2 yapıldı; son koşuda tüm ihlal sayısı 0 |
| Q5 kontrast | axe `color-contrast` ihlali yok (koyu + açık, 375/1280); metin saha/kart üstünde değil, rol etiketleri koyu opak hap |
| Q16 çekirdek paylaşımı | `features/squad/q16.test.ts` ve parite testleri yeşil; kadromla uygula yeni bir kadro çekirdeği açmaz: aynı `fitLabels`/`FitBadge`/`PickBody`/`Pitch`; yalnız-UT/yalnız-kariyer farkı yalnız kaynak seçimi (`planApply`) |
| Q17/Q18 (Pitch `readOnly` eklendi) | `q17.mjs` alt küme (4-3-3, 3-5-2, 4-2-3-1 × UT/kariyer × 6 boyut): taşma/çakışma yok; bir sayfa-yüklenmedi (hız sınırı) yeniden koşuda 0 sorun. Tam 29 formasyon matrisi koşulmadı |
| 375 / 1280, koyu / açık | liste, filtreli liste, detay 4 sekme, uygula (kariyer + UT kartlı): 28 çekim |

## 6. Dürüst notlar
- UT uygula çekimleri için kulüp kartları test hesabına katalogdan tohumlandı (gerçek bir EA yakalama dosyası değil); UT'de katalogla eşleşmeyen kulüp kartları (`playerId` yok) atamaya girmez, sayısı ekranda yazar.
- `Pitch` salt okunur kipinde boş slotlar kesikli siluet + mevki; oyuncu yokken de saha rolleri okunur.
- Dar ekranda filtre çubuğu yapışkan değil (bilinçli).
- Üretim DB'sinde dry-run bu oturumda yapılamadı (yalnız yerel).
- Tam 29 formasyonluk `q17.mjs` ve Lighthouse bu turda koşulmadı.

## 7. REP-b (onay sonrası düzeltmeler)
1. **Nötr rozet:** koyu cam çip + açık yazı; tüm rozet durumları opak yüzey. `FitBadge.contrast.test`: 4 durum × bronz/gümüş/altın × 3 çerçeve rengi × koyu/açık tema, metin ≥ 4,5:1 (kırmızı rozet beyaz yazıyla 3,9'du: `#c62d33` yapıldı).
2. **Mevki dışı:** `SquadFitService.solve(..., naturalFirst)`: her doğal atamaya çözücü matrisinde büyük sabit eklenir (raporlanan uyum değişmez), yani önce doğal mevkiler dolar. Test: 8 replika × 60 oyunculu havuzda doğal atama sayısı = slot-oyuncu doğal mevki eşleşmesinin en büyük eşleşmesi. Slotlarda `outOfPosition` + `playerPosition`; listede "ST→LW", sahada kartın üstünde "Mevki dışı". Golden güncellendi (LW artık doğal oyuncu).
3. **İç notlar:** `GET /replicas/{id}` `verify` ve `sources` alanlarını yalnız ADMIN'e verir; herkese `verified` bayrağı; Hikâye'de yalnız "Kaynak: doğrulanmadı", ayrıntı yönetici görünümünde açılır bölüm.
4. **striker_line_no_runner:** forvet hattı ST, CF, LW, RW, LF, RF. Barcelona 2010-11'de artık tetiklenmiyor. Replika raporu (112): striker_line_no_runner **23 → 13** (yeni 6 kayıttan 1'i dahil; eski 106'da 12); uyarı/risk üreten replika sayısı değişmedi (17), diğer kural sayıları aynı. Negatif set (8 meta formasyon) yeşil.
5. **Üst bar:** baş harf avatarı + ad (e-postanın yerel kısmı); e-posta ve Çıkış menüde (Radix Popover); ekran görüntülerinde `data-private` maskesi geri.
6. **Mobil liste:** "Filtreler (n)" düğmesi → `MobileSheet` (Radix Dialog); kategori çipleri yatay kaydırılan tek satır; liste ilk ekranda başlıyor.
7. "Kadro uyumu" etiketi `fitLabels.SQUAD_FIT_TEXT`.
8. **Replikalar (karar: 4 ekle, Pulis çıkar):** `docs/replicas_v2_ek_2026-10-14.fc27.json`'daki 6 kayıt içerik değiştirilmeden seed'e eklendi (113 kayıt, 112 replika). Şema farkı yalnız Plan B değişiklik satırı biçimiydi (`SLOT (POZ): …` → `SLOT: …`), `normalize-planb.mjs` ile tek biçime çekildi (29 satır). tacticCode round-trip **112/112** birebir. Eşleme: `galacticos_real_2003→delbosque_real_2003`, `mancini_city_2012`, `daum_fenerbahce_2005`, `denizli_besiktas_2009` aynı id; `pulis_stoke_2011` kaldırıldı (33 eşleşti). Yeni 6'nın analizi: Daum 2005 yalnız bilgi `striker_line_no_runner`; Denizli 2009, Gerets 2006, Çimşir 2020, del Bosque 2003, Mancini 2012 bulgusuz. `verify` alanları kullanıcıya gösterilmez (madde 3).
9. **Menü yolu** "Takım Yönetimi → Taktikler → Kod Kullan": doğru, değişmedi.
10. Yeniden çekim: 28 çekim, 375/1280, koyu/açık; 0 taşma, 0 axe ihlali.

Testler: backend 520 (0 hata, 4 atlanan), web 595, lint + build yeşil. Not: tam pakette bir kez `FitEngineV3PropertyTest` (rastgele özellik testi, `GK_POSITIONING`, 1,618 > 1,61 sınır) düştü; bu işte motora dokunulmadı, tekrar koşuda 3/3 geçti; ayrı inceleme gerekir.
