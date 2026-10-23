# 15 · KARİYER-UX — Kariyer modu sayfalarının yeniden yapılandırılması ("Cyber-Pitch")

Durum: FAZ 0 **onaylandı** (Buğra, 2026-10-22; kararlar §13, düzeltmeler §14). **FAZ 1 tamam** (rapor §15). FAZ 2 (Masa) onay bekliyor.
Dal: web `kariyer-ux` (v3'ten), backend `kariyer-ux`. İki tarafta da PR onaysız birleştirilmez (main → prod).
Kapsam yalnız **v3** arayüzü (prod'da tek arayüz; `uiVersion.ts:34-57`, v2 yalnız geliştirmede `VITE_UI_V2` ile). v2 sayfalarına dokunulmaz.

---

## 0. Özet

| # | Karar / öneri | Durum |
|---|---|---|
| 1 | Kariyer kimliği amber → **Cyber-Pitch** (antrasit/lacivert zemin; mor, siber mavi ve neon yeşil aurora; ince neon kenar; neon yeşil vurgu) | **D-27** |
| 2 | Üç veri katmanı: **Kayıt verisi** (salt okunur), **Kariyer kararları** (sunucu), **Lab taslağı** (yerel, geçici) | **D-28** |
| 3 | Yeni rotalar: `/career/dashboard`, `/career/squad`, `/career/tactics-lab`, `/career/transfer`. Eskiler `<Navigate replace>` | **D-29** (FAZ 2-4) |
| 4 | Ana taktik sunucuda (`user_tactic.is_main`). Taslaktan kaydedilebilir (bugün yalnız replikadan). Kadro dizilişi ve davranış etiketleri de taşınır | **D-30**, API CONTRACT CHANGE, FAZ 1 |
| 5 | Ana taktik yokken **ücretsiz otomatik başlangıç önerisi** (`GET /careers/{id}/starter-tactic`); preset yok; "Otomatik öneri" etiketi | **D-31**, FAZ 1 |
| 6 | Pitch'e iki genişletme: `field="cyber"` ve `marker="pawn"` (piyon). Yeni saha bileşeni yok | FAZ 1 |
| 7 | Tek kopya `fc.tactic` + `fc.lineup` → kariyere göre anahtarlı taslak deposu `fc.lab.v1`. Bir kez göç | FAZ 1 |

**D-26** (görsel dil v3 = glassmorphism) 11 L4'te ayrılmıştı ama karar kaydına hiç yazılmamıştı; FAZ 1'de D-26..D-31 birlikte eklendi.

---

## 1. Bugünkü durum (bulgular)

Kaynak: kod okuması, 2026-10-22.

1. **Taslak tek kopya.**
   - `fc.tactic` (`state/tacticStore.ts:4`) kariyer ya da slot boyutu taşımıyor.
   - Diziliş ayrı tutuluyor: `fc.lineup[careerId]`.
   - Yazanlar:
     - TacticWizardPage:116
     - useCareerBinding:37
     - useCareerLineup:74
     - ProtectLeadCard:25,49
     - TeamSetup:28
     - EaTacticCode:27
     - AutoFitPanel:49
   - Masa, Kadro, Kurucu ve Transfer aynı taslağı okuyor. Kurucudaki her deneme diğer sayfalardaki uyumu anında değiştiriyor. **Sorunun kökü bu.**
2. **Kullanıcı taktiği yalnız replikadan kaydediliyor.**
   - `PUT /user-tactics/{slot}` yalnız `{careerId, replicaId}` alıyor (`UserTacticService:40-58`).
   - Kaydedilen slotu düzenlenebilir taktiğe geri okuyan web kodu yok. Tek tüketici `SaveToSlot`.
3. **"Ana taktik" tahmin.**
   - Öneri motoru `ORDER BY slot LIMIT 1` ile en küçük slotu alıyor (`TacticSlotLookup:14,27`).
   - Kullanıcı seçimi yok.
4. **Masa bağlantıları kırık.**
   - `deskRules` `?sell=` ve `?group=` üretiyor.
   - TransferCenterPage yalnız `kadro`, `uzak`, `pos`, `role`, `ihtiyac` okuyor (`TransferCenterPage.tsx:99-104`).
5. **Satış planı yalnız web kuralı.**
   - `sellAdvice` (`deskRules.ts:127-143`) sunucuda saklanmıyor.
   - Tek niyet işareti `FOR_SALE` / `LOAN_OK` etiketleri.
6. **Eksik veri**

   | İhtiyaç | Durum |
   |---|---|
   | Sakatlık | `career_player.injury_until` var ama yazan ve okuyan yok. LE log'unda `teamplayerlinks.injury` sütunu geliyor. |
   | Sezon sonu tarihi | Kolonu yok. Yalnız `windowEndsOn` var, kullanıcı giriyor. |
   | Maaş kullanımı | Yalnız `facets.squadWageEur`; her oyuncunun maaşı biliniyorsa dolu. |
   | Kiralık dönüşü | `loanUntil` yalnız `/moves` içinde. |
   | Zaman çizelgesi | İstemcide `/events` + `/snapshots` birleşimi. Gelecek tarihli olay yok. |

7. **Ayarlar iki yerde.**
   - Bütçe, ad, sezon → Kadro › kariyer.
   - Maaş bütçesi, dönem sonu, spoiler → Masa › ayarlar.
8. **Tasarım borcu** (doc 11 ↔ kod)
   - `[data-mode="ut"]` kuralı yok.
   - Açık tema + kariyer koyu aurora kullanıyor.
   - Panel'in varyantı yok.
   - SidePanel'de focus trap / scrim yok.
   - Saha çizgisinde glow yok.
   - Saha etiketleri eski Matchday renkleriyle (`ink-950`, `paper-50`, `flood-400`).

---

## 2. Üç veri katmanı

| Katman | Ne | Nerede | Kim değiştirir | Görsel işaret |
|---|---|---|---|---|
| **1 · Kayıt verisi** | LE içe aktarımı: kadro, reyting, sözleşme, kiralık, takımlar, (sakatlık) | Sunucu: `/careers/{id}/squad`, `/players/facets`, `/moves` (hesaplanan) | Yalnız içe aktarma | `SourceTag kind="record"`: "Kayıt verisi · 18 Eki" |
| **2 · Kariyer kararları** | Hamleler (`/events`, geri alınabilir), kısa liste, satış planı, **ana taktik**, ayarlar | Sunucu | Kullanıcı, mutation + invalidate | `SourceTag kind="decision"`: "Kararın" |
| **3 · Lab taslağı** | Taktik Laboratuvarı denemeleri | Tarayıcı: `fc.lab.v1`, kariyere göre | Yalnız Lab | Kesik çizgili kenar + "Taslak · kaydedilmedi" |

**"Kayıt verisi · tarih" kaynağı**
- Önce son `IMPORT` anlık görüntüsünün `gameDate`'i: `/snapshots`, `source=IMPORT`.
- Yoksa `career.gameDate`.
- Yoksa `takenAt` (gerçek tarih, "içe aktarıldı" ibaresiyle).

**Kural:** katman 3 hiçbir koşulda katman 1-2 sorgularını çağırıp değiştirmez. "Ana taktiğim yap" tek köprüdür (taslak → katman 2).

---

## 3. Rota haritası

| Eski | Yeni | Not |
|---|---|---|
| `/career/desk` | `/career/dashboard` | `?sekme=ayarlar` taşınır → `/career/dashboard?sekme=ayarlar` |
| `/squad` | `/career/squad` | `?sekme=` korunur (`saha` → `diziliş`) |
| `/squad/builder` | `/career/tactics-lab` | `?sekme=kurucu` |
| `/tactics/wizard` | `/career/tactics-lab?sekme=sihirbaz` | |
| `/tactics/builder` | `/career/tactics-lab` | Zincir (`/squad/builder`) kalkar |
| `/fit` | `/career/tactics-lab` | |
| `/career/transfer` | aynı | Yeni parametreler, §4.4 |
| `/replicas`, `/replicas/:id` | aynı | UT'de de var. Kariyerde Lab › Replikalar sekmesi aynı listeyi gömer. |

- Yönlendirme: `RedirectWithSearch`, yani `<Navigate replace>` ve sorgu dizgisi taşınır.
- Bileşen `App.tsx` içinde, v3 dalında kalır.
- `modeStore.CAREER_PREFIXES`: `/career` zaten var. `/squad` ve `/tactics` yönlendirme süresince kalır.

**Güncellenecek yerler** (agent taraması, satır numaraları 2026-10-22)

| Dosya | Satır |
|---|---|
| `src/App.tsx` | 124-138 |
| `lib/navConfig.ts` | CAREER_NAV 20-48 |
| `design/components/AppShell.tsx` | 23,24,28 (ikon haritası) |
| `features/home/HomePage.tsx` | 54,96 |
| `features/career/NewCareerPage.tsx` | 49,111 |
| `features/desk/DeskPage.tsx` | 107,159,181 |
| `lib/deskRules.ts` | 161-205 |
| `features/squad/kadro/KadroPage.tsx` | 38,44,63,106 |
| `kadro/useCareerLineup.ts` | 60,72 |
| `components/TacticLineup.tsx` | 30 |
| `features/replicas/ApplyTab.tsx` | 39 |
| `features/import/CareerImportPage.tsx` | 177 |
| `lib/wizardQuestions.ts` | 67 (`WIZARD_RESULT_PATH`) |

**Testler:** navConfig.test, appShellNav.test, legacyGates.test, modeStore.test, homePage.test, careerDeskPage.test:77, replicas.test:195, KadroPage.test:131-184.

**Yeni nav (`CAREER_NAV`)**
- Masa
- Kadro
- Taktik Lab
- Transfer
- Oyuncular (sekmeler: Oyuncu ara, Wonderkids, Karşılaştır)
- Mobil "Daha fazla": Gelişim, Takımlar, İçe aktar, Yeni kariyer.
- Mobil alt çubuk: Masa · Kadro · Lab · Transfer · Oyuncu (5; "Oyuncular" mobilde kısa etiketle, 375'te kelime bölünmesin diye — FAZ 4a).

---

## 4. Sayfalar

### 4.1 Kariyer Masası — `/career/dashboard` (saha yok)
**Amaç:** "Bu dönem ne yapmalıyım?" sorusunu tek ekranda cevaplamak.

| Bölüm | İçerik | Veri (katman) |
|---|---|---|
| Finansal sağlık | Transfer bütçesi; maaş bütçesi ve kullanımı (çubuk); dönem bitişine gün | `career.budgetEur`, `wageBudgetEur`, `facets.squadWageEur`, `windowEndsOn` − `gameDate` (1) |
| Acil uyarılar | Sakatlık, ≤ 6 ay kalan sözleşme, kiralık dönüşü (≤ 30 gün) | Sakatlık: **yeni** `player.injuredUntil` (§7.3). Sözleşme: `player.contractUntil`. Kiralık: `/moves.loanUntil` (1) |
| Zaman çizelgesi | Geçmiş: hamle ve içe aktarma. Gelecek: dönem sonu, kiralık dönüşleri, sözleşme bitişleri | `/events`, `/snapshots` (2, 1) + türetilmiş gelecek olaylar |
| Zayıf halkalar (3 kart) | Problem: slot, rol, neden (`reasons[0]`), uyum % | Ana taktik (2) + `/fit/lineup` |
| | Çözüm: "Transferde aday bul", "Lab'da dene" | |
| Takım uyumu | Ana taktiğe göre gösterge (FitGauge) | Ana taktik (2) |
| Ayarlar sekmesi | Ad, bütçe, sezon, maaş bütçesi, dönem sonu, spoiler, yedek | `PATCH /careers/{id}` (2). Kadro›kariyer sekmesi buraya taşınır. |

- **Ana taktik yoksa:** zayıf halka ve uyum yerine boş durum gösterilir: "Ana taktik seçilmedi" + "Lab'a git".
- **Göç kolaylığı:** eski `fc.tactic` göç ettiyse "Mevcut taslağı ana taktik yap" kısayolu (§6.4).

**Geçişler**

| Hedef | Rota ve parametreler |
|---|---|
| Transferde aday bul | `/career/transfer?ihtiyac=slot-{slotId}&pos={position}&rol={roleId}` |
| Lab'da dene | `/career/tactics-lab?sekme=kurucu&slot={slotId}` (Lab, ana taktikten yeni taslak açar ve slotu seçer) |
| Uyarı · sözleşme | `/players/{id}?sekme=sozlesme` |
| Uyarı · kiralık | `/career/squad?sekme=hareketler` |
| Satış eylemi | `/career/transfer?sekme=satis&oyuncu={id}` (bugünkü kırık `?sell=` düzelir) |
| Derinlik eylemi | `/career/squad?sekme=derinlik&grup={group}` (bugünkü kırık `?group=` düzelir) |

### 4.2 Kadro Analizi — `/career/squad` (katman 1 + 2)
**Amaç:** "Elimde ne var?" sorusunu cevaplamak. Düzenleme yok; kararlar yalnız hamleler ve geri alma.

| Sekme | İçerik | Veri |
|---|---|---|
| `dizilis` | Salt okunur Cyber-Pitch, piyon modu (ana taktik + ana diziliş); "Lab'da düzenle". Sağda StatTile'lar (reyting, oyuncu sayısı, ortalama yaş) | Ana taktik (2), `/fit/lineup` |
| `liste` | Kadro listesi / kartlar; satış ve kiralık diyalogları (mevcut) | `/squad` (1), `/events` POST (2) |
| `derinlik` | Mevki derinliği: her mevkide kim ve kaç; yaş profili histogramı; sözleşme bitiş zaman çizgisi | `/squad`, `/advisor/positions` (1) |
| `hareketler` | `SaveMoves` (kayda göre) + `MoveHistory` (geri al) + pazar arama | `/moves` (1), `/events` (2) |

- Saha `readOnly`: `onSwap` ve `onPickPlayer` verilmez, sürükleme yok.
- Piyona tıklamak oyuncu sayfasına gider (`/players/{id}`), kurucuya değil.
- Bugünkü "kartı değiştir → lineupStore yaz → kurucuya git" davranışı **kalkar** (useCareerLineup.ts:61-73).

### 4.3 Taktik Laboratuvarı — `/career/tactics-lab` (katman 3)
**Amaç:** güvenli deneme alanı.

| Sekme | İçerik |
|---|---|
| `kurucu` | Mevcut `SquadWorkspaceView` (sürükle-bırak, rol & odak, davranışlar, öneriler); saha `field="cyber"`, varsayılan **kart modu**, tek tıkla piyona geçilir (Q5) |
| `sihirbaz` | TacticWizardPage gövdesi; "Uygula" **yeni taslak** açar (bugün tek kopyayı eziyor) |
| `replikalar` | Replika listesi; "Klonla → taslak" (replika taktiği + `useReplicaApply` dizilişi) |
| `kod` | TacticCodeCard + EaTacticCode: içe aktar → yeni taslak; dışa aktar → aktif taslak |

**Taslak çubuğu** (sayfa başı)
- Taslak seçici: ad, kirli işareti `•`.
- Yeni taslak (ana taktikten) · Kopyala · Yeniden adlandır · Sil.
- **Karşılaştır**: iki taslak ya da taslak ↔ ana taktik; slot slot uyum farkı.
- Birincil eylem: **"Ana taktiğim yap"** → slot seçimi diyaloğu (1-5; dolu slot için ikinci onay, SaveToSlot deseni) → `PUT /user-tactics/{slot}` (taktik gövdesi) + `PUT /user-tactics/{slot}/main`. Ardından invalidate: `['main-tactic',careerId]`, `['user-tactics',careerId]`, `['lineup',careerId,…]`. Taslak "kaydedildi" olur (kirli değil).

**Görsel:** çalışma alanı paneli `edge="draft"` (kesik çizgi) + SourceTag "Taslak · kaydedilmedi" / "Taslak · Slot 2'ye kaydedildi".

**Kaydedilmemiş taslak göstergesi** (düzeltme 1): rota engeli ve `beforeunload` **yok**.
- Uygulama `BrowserRouter` kullanıyor (`main.tsx:26`); `useBlocker` yalnız data router'da çalışır ve router değiştirilmez.
- Taslak zaten yerelde saklı, veri kaybı yok. Bu yüzden iki gösterge yeter:
  - Nav'daki "Taktik Lab" öğesinde nokta: kirli ve ana taktik olmayan taslak var (`labStore.hasUnsaved(careerId)`).
  - Lab taslak çubuğunda `•`.

### 4.4 Transfer & Scouting — `/career/transfer`

| Bölüm | İçerik | Veri |
|---|---|---|
| İhtiyaçlar | Ana taktiğe göre zayıf slotlar + derinlik boşlukları | Ana taktik (2), `/squad` (1) |
| Adaylar | `RecommendationPanel`, CreditGuard arkasında (betada ücretsiz) | `POST /careers/{id}/recommendations` |
| Kısa liste | Satırlar + pazarlık tavanı | `/shortlist` (2) |
| **Bütçe planı** | Transfer bütçesi − kısa liste toplamı (`maxFeeEur ?? valueEur`) + satış planı geliri = **kalan bütçe**; maaş etkisi (kısa liste tahmini maaşı − satılanların maaşı) / maaş bütçesi | `budgetEur`, `/shortlist`, satış planı (2), maaş: §7.3 |
| Satış planı | Öneriler (`sellAdvice`) + **kalıcı plan**: "Satışa koy / Kiralığa aç / Tut" ve istenen bedel | Etiketler `FOR_SALE` / `LOAN_OK` + yeni `askingPriceEur` (§7.2) |

**Okunan parametreler:** `ihtiyac`, `pos`, `rol`, `sekme` (`adaylar|kisa-liste|satis`), `oyuncu`, `kadro`, `uzak`. Eski `role` takma ad olarak okunur.

**"Kısa listeye ekle" köprüsü**
- Oyuncular (CareerPlayersPage satır/kart menüsü), Wonderkids kartı ve oyuncu sayfasında `ShortlistButton`.
- Aynı mutation: `PUT /shortlist/{pid}` + invalidate `['shortlist',id]`.

---

## 5. Wireframe'ler (ASCII)

Gösterim: `[▣ glass]`, `[┄ taslak]`, `(●)` piyon, `‹Kayıt verisi · 18 Eki›` SourceTag.

### 5.1 Masa — masaüstü (1280)
```
┌ rail ┐┌─────────────────────────────────────────────────────────────────────┐
│ Masa ││ Port Vale · 2026/27                       ‹Kayıt verisi · 19 Eki›    │
│ Kadro│├──────────────────────────┬──────────────────────────┬──────────────┤
│ Lab  ││ [▣ Finansal sağlık]      │ [▣ Acil uyarılar]        │ [▣ Takım     │
│ Trans││  Transfer  €4,25 M       │  ⚠ Lynch · sözleşme 4 ay │    uyumu ]   │
│ Oyunc││  Maaş  ███████░░ 78%     │  ⚠ Nyoni · kiralık 12 gün│   ◔ 74%      │
│  …   ││  Dönem sonu  18 gün      │  ✚ (sakatlık yok)        │ ‹Ana taktik› │
│      │├──────────────────────────┴──────────────────────────┴──────────────┤
│      ││ Zayıf halkalar                                                       │
│      ││ ┌[▣ CM2 · B2B]──────┐ ┌[▣ RB · Wingback]──┐ ┌[▣ ST · AF]──────────┐  │
│      ││ │ Byers  uyum 58%   │ │ Gordon  uyum 61%  │ │ Faal  uyum 63%      │  │
│      ││ │ neden: dayanıklılık│ │ neden: hız       │ │ neden: bitiricilik  │  │
│      ││ │ [Aday bul][Lab'da]│ │ [Aday bul][Lab'da]│ │ [Aday bul][Lab'da]  │  │
│      ││ └───────────────────┘ └───────────────────┘ └─────────────────────┘  │
│      ││ [▣ Zaman çizelgesi]  ── 12 Eki içe aktarma ── 15 Eki Ouazane (K) ──▶ │
│      ││                      ▶ 30 Eki dönem sonu ▶ 2 Kas Nyoni dönüş         │
└──────┘└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Masa — mobil (375)
```
┌───────────────────────────┐
│ Masa      ‹Kayıt · 19 Eki›│
│ [▣ Finans] €4,25M · 78% · 18g │
│ [▣ Uyarılar 2]  ▸         │
│ [▣ Uyum 74%]              │
│ Zayıf halkalar (dikey)    │
│ [▣ CM2 · 58% · neden…]    │
│   [Aday bul] [Lab'da dene]│
│ [▣ RB  · 61% …]           │
│ [▣ ST  · 63% …]           │
│ [▣ Zaman çizelgesi ▸]     │
├───────────────────────────┤
│ Masa Kadro Lab Trans Oyun │ ← alt çubuk
└───────────────────────────┘
```

### 5.3 Kadro — masaüstü (diziliş sekmesi)
```
┌───────────────────────────────────────────────┬──────────────────────────┐
│ Kadro  [Diziliş|Liste|Derinlik|Hareketler]    │ ‹Kayıt verisi · 19 Eki›  │
│ [▣ Cyber-Pitch · salt okunur ]  ‹Ana taktik›   │ [▣ Özet]                 │
│        (●74) Faal                            │  Reyting 68 · 36 oyuncu  │
│   (●66)Hall        (●69)Keyrol               │  Yaş ort. 24,1           │
│        (●68)Ouazane  (●67)Bisiwu             │  Sözleşme ≤6 ay: 3       │
│   (●63)…  (●65)…  (●62)…  (●66)…             │ [Lab'da düzenle →]       │
│              (●64) GK                         │                          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

### 5.4 Kadro — mobil
```
┌───────────────────────────┐
│ Kadro ‹Kayıt · 19 Eki›    │
│ [Diziliş|Liste|Derin|Hare]│
│ [Cyber-Pitch, tam genişlik│
│   piyonlar ≥44px dokunma] │
│ [Lab'da düzenle]          │
│ [▣ Özet · 4 StatTile 2×2] │
└───────────────────────────┘
```

### 5.5 Taktik Lab — masaüstü
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Taktik Lab  [Kurucu|Sihirbaz|Replikalar|Kod]                                │
│ Taslak: [4-3-3 hücum ▾] •   [+Yeni] [Kopyala] [Karşılaştır]  [Ana taktiğim yap]│
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬───────────────────────────┤
┆ ‹Taslak · kaydedilmedi›                         ┆ [▣ SidePanel 380px]       │
┆  Cyber-Pitch, kart modu, sürükle-bırak          ┆  Oyuncu | Rol & odak |    │
┆  (UT ile ortak SquadWorkspaceView)              ┆  Davranışlar | Öneriler   │
└┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┴───────────────────────────┘
```

### 5.6 Taktik Lab — mobil
```
┌───────────────────────────┐
│ Lab [Kurucu|Sihir|Rep|Kod]│
│ [4-3-3 hücum ▾] •  [⋯]    │
│ ┆‹Taslak · kaydedilmedi›┆  │
│ ┆ Cyber-Pitch (kart)    ┆  │
│ ┆ slot → alt sheet 85%  ┆  │
│ [Ana taktiğim yap] (yapışık alt buton) │
└───────────────────────────┘
```

### 5.7 Transfer — masaüstü
```
┌──────────────────────────────────────────────┬─────────────────────────────┐
│ Transfer [Adaylar|Kısa liste|Satış]          │ [▣ Bütçe planı]             │
│ İhtiyaçlar: (CM2 58%) (RB 61%) (GK derinlik) │  Bütçe          €4,25 M     │
│ [▣ Adaylar · CreditGuard]                    │  − Kısa liste   €2,10 M     │
│   satır… [Kısa listeye ekle]                 │  + Satış planı  €0,80 M     │
│                                              │  = Kalan        €2,95 M     │
│                                              │  Maaş etkisi  +€14 B/hf (82%)│
└──────────────────────────────────────────────┴─────────────────────────────┘
```

### 5.8 Transfer — mobil
Bütçe planı üstte, katlanabilir özet şerit: "Kalan €2,95M ▸". Sekmeler altta liste.

---

## 6. State stratejisi

### 6.1 Katman 1-2: yalnız TanStack Query

| Sorgu anahtarı | Uç | Tip |
|---|---|---|
| `['careers']` | GET /careers | `ReadonlyArray<Readonly<Career>>` |
| `['squad',id]` | GET /careers/{id}/squad | `ReadonlyArray<Readonly<CareerPlayer>>` |
| `['career-moves',id]`, `['events',id]`, `['snapshots',id]` | mevcut | Readonly |
| `['shortlist',id]`, `['tags',id]`, `['player-facets',id]` | mevcut | Readonly |
| `['user-tactics',id]` | GET /user-tactics?careerId | Readonly |
| **`['main-tactic',id]`** | **GET /user-tactics/main?careerId** (yeni) | `Readonly<UserTactic> \| null` |
| `['lineup',id,hash(main)]` | POST /fit/lineup (ana taktik) | Readonly |

**Kurallar**
- `api/types.ts` katman 1-2 tipleri `Readonly`/`ReadonlyArray` olarak dışa verilir. Mutasyon derleme hatası verir.
- Değişiklik yalnız `useMutation` + `invalidateQueries` ile. `setQueryData` yalnız optimistik güncellemede ve yeni nesneyle yapılır.
- Ana taktiği **okuyan** binding: `useMainTacticBinding(careerId)`.
  - `SquadBinding` arayüzünü salt okunur uygular: `patch` no-op ve geliştirmede uyarı verir.
  - Masa, Kadro ve Transfer bunu kullanır.
  - Bugünkü `useCareerBinding` (tacticStore'a yazan) **kalkar**.

### 6.2 Katman 3: taslak deposu `labStore`

- **Anahtar:** `fc.lab.v1`.
- **Biçim:**

```ts
type LabState = Record<CareerIdString, {
  activeId: string | null
  drafts: Draft[]              // en çok 10; sınır dolunca yeni taslak açılmaz, hiçbiri sessizce silinmez (düzeltme 8)
}>
interface Draft {
  id: string                   // crypto.randomUUID()
  name: string
  origin: { kind: 'main' | 'replica' | 'wizard' | 'code' | 'blank' | 'auto'; ref?: string }  // auto: başlangıç önerisi (D-31); göç: blank + ref 'fc.tactic'
  tactic: TacticState          // bugünkü tacticStore şekli
  lineup: Record<string, number>
  savedTo?: { slot: number; at: string } // "ana taktiğim yap" sonrası
  dirty: boolean
  updatedAt: string
}
```

- **Türetme:**
  - `newDraftFromMain(main)` = `structuredClone(toTacticState(main))`.
  - Sorgu önbelleğindeki nesneyle referans paylaşılmaz. Test bunu `Object.is` ile ve önbelleği dondurarak (`Object.freeze`) doğrular.
- **Bağlama:** `useLabBinding(careerId)` aktif taslağı `SquadBinding` olarak verir. Her `patch` aktif taslağı günceller ve `dirty=true` yapar. `useSquadWorkspace` değişmez.
- **Sızıntı:**
  - Tüm okuma ve yazmalar `careerId` ile.
  - Kariyer değişince `activeId` o kariyerin kaydından okunur.
  - Kariyer silinince (`deleteCareer` onSuccess) o kariyerin kaydı silinir.
- **Boyut:** taslak başına ~2-4 KB → 10 taslak × birkaç kariyer ≪ 1 MB. 1 MB'ı geçerse IndexedDB'ye taşıma notu (CLAUDE.md: büyük veri IDB).
- **Sınır:** 10. Hepsi dolunca `create` reddeder: "Taslak sınırı (10). Birini sil ya da ana taktik yap." Kirli olsun olmasın hiçbir taslak sessizce silinmez.
- **Kirli göstergesi:** `labStore.hasUnsaved(careerId)` → nav "Taktik Lab" noktası + taslak çubuğu `•`. Rota engeli / `beforeunload` yok (düzeltme 1).

### 6.3 Mevcut `tacticStore` tüketicileri nereye gider

| Bugünkü yazan / okuyan | Yeni yeri |
|---|---|
| TacticWizardPage:116 | `labStore.create({origin:'wizard'})` → Lab › kurucu |
| useCareerBinding:37 | `useLabBinding` (Lab) / `useMainTacticBinding` (diğerleri, salt okunur) |
| useCareerLineup:33,74 (aynalama) | Kadro ana taktiği okur. "Aynalı kaydet" → Lab'da yeni taslak. |
| ProtectLeadCard, TeamSetup, EaTacticCode, AutoFitPanel | Lab içinde, aktif taslağa yazar (prop: `binding`) |
| useCareerSquad:39 (derinlik ihtiyacı) | Ana taktik |
| `lineupStore` | v3'te kullanılmaz. Diziliş taslakta (`Draft.lineup`) ve ana taktikte (`user_tactic.lineup`). |
| `components/TagChips.tsx`, `lib/depth.ts`, `lib/mirror.ts` | Saf yardımcılar: `TacticState` alır, depoya değil parametreye bağlanır |

`tacticStore` UT tarafında kullanılmıyor (tarama 2026-10-22). Ama v2 sayfaları (`pages/WizardPage.tsx`, `pages/SquadPage.tsx` → `components/TacticLineup.tsx`) kullanıyor ve v2 koduna dokunulmuyor. Bu yüzden **dosya kalır, v3 kodu onu artık okumaz/yazmaz** (`legacyGates`'e kural: v3 `features/**` içinde `tacticStore` / `lineupStore` importu yasak).
`DEFAULT_SETUP` / `toTacticRequest` gibi yardımcılar `lib/tactic.ts`'e taşınır, tacticStore oradan yeniden dışa verir.

### 6.4 Bir kerelik göç (`migrations.ts`)

- `fc.tactic` + `fc.lineup[careerId]` → her kariyer için bir taslak.
  - Taslağın adı "Önceki taslak".
  - `origin = { kind: 'blank', ref: 'fc.tactic' }` (ana taktik panelindeki "Önceki taslağı ana taktik yap" kısayolu bununla bulur).
  - `dirty = true`.
  - `fc.tactic` globaldi; bu yüzden **lineup'ı olan her kariyere** kopyalanır. Lineup yoksa yalnız aktif kariyere (`fc.career`).
- Eski anahtarlar **silinmez**: v2 (geliştirme) sayfaları hâlâ okur; v3 okumaz. Göç adımı `002-lab-drafts`, bayrak `fc.migrations`.
- `runStorageMigrations` adım listesine çevrildi (eskiden 001 yapılmışsa hemen dönüyordu).

### 6.5 Testler (önce kırmızı)

| Test | Doğrular |
|---|---|
| `state/labStore.test.ts` (FAZ 1) | Taslak kaynaktan kopyalanır: dondurulmuş kaynak (sorgu önbelleği) değişmez, referans paylaşılmaz; kariyerler arası sızıntı yok; 10 sınırı (sessiz silme yok); kirli işareti; silme |
| `state/migrations.test.ts` (FAZ 1) | `fc.tactic` / `fc.lineup` → `fc.lab.v1`, bir kez; dizilişi olan kariyerler ya da etkin kariyer |
| `features/career/starterTactic.test.tsx` (FAZ 1) | Ana taktik yok → öneri ekranı + "Otomatik öneri"; "Ana taktiğim yap" → "Kararın"; Lab'da düzenle → `auto` taslağı; göç kısayolu; "2 oyuncu kadroda yok" notu; salt okunur bağlamada `patch` hiçbir depoya yazmaz |
| `lib/tactic.test.ts` (FAZ 1) | `TacticState` → PUT → GET → `TacticState` birebir; varsayılan kurulum backend seed'iyle aynı |
| `design/contrast.test.ts`, `design/kariyerUxGates.test.ts`, `components/pitch/pitchPawn.test.tsx`, `layout.test.ts` (FAZ 1) | Kontrast, eski depo kapısı, piyon/cyber, piyon Q17 matrisi |
| `squadCore.test.tsx`, `q16.test.ts`, `useUtBinding.test.tsx`, `UtSquadPage*.test.tsx` (mevcut) | UT regresyonu: aynı kalır, yeşil |
| Masa/Kadro "yeni ana taktiği gösterir" (FAZ 2-3) | Sayfa entegrasyonuyla |
| `redirects.test.tsx` (FAZ 4) | 7 eski rota + sorgu dizgisi korunur |

---

## 7. Backend (aynı PR serisi, API CONTRACT CHANGE)

### 7.1 Ana taktik — migration `V43__user_tactic_main.sql` (FAZ 1'de uygulandı)
```sql
ALTER TABLE user_tactic
  ADD COLUMN is_main    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN lineup     JSONB,          -- {"slotId": base_player.id}  (/fit/lineup'ın playerId'si; boşsa /fit/lineup dizer)
  ADD COLUMN depth      SMALLINT CHECK (depth BETWEEN 0 AND 100),
  ADD COLUMN preset_id  TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX ux_user_tactic_main ON user_tactic (user_id, career_id) WHERE is_main;
ALTER TABLE user_tactic ADD CONSTRAINT ck_user_tactic_main_career CHECK (NOT is_main OR career_id IS NOT NULL);
```
- **`tags` kolonu yok** (düzeltme 2): etiketler `slots` JSONB satırının `tags: []` alanında. Replika kayıtlarında `tags` boş dizi.
- **Diziliş kimliği** (düzeltme 7): `base_player.id`, yani `career_player.player_id` (`/fit/lineup`'ın döndürdüğü `playerId`). Ayrı bir EA id kullanılmıyor.
- **Migration numarası** (düzeltme 9): V43. Kontrol 2026-10-22: `git branch -a` yalnız `main`, `gh pr list` boş, yerelde başka worktree yok; SIM-A / REP-e dalları görünmüyordu.

**Uçlar** (`UserTacticController`)

| Uç | Davranış |
|---|---|
| `PUT /user-tactics/{slot}` | Gövde ya `{careerId, replicaId}` (bugünkü) ya `{careerId, name, tactic: TacticRequest, lineup?}`. İkisi birden ya da hiçbiri → 400. Tek taktik gövdesi = mevcut `TacticRequest` (düzeltme 10). Taslakta `ea_code` codec'le üretilir (`TacticCodeService.export`, düzeltme 3); formasyonun EA karşılığı yoksa boş kalır. |
| `PUT /user-tactics/{slot}/main?careerId` | Önce eski işaret düşer, sonra bu slot ana olur (kısmi unique). Slot boşsa 404. `careerId` zorunlu → yoksa 400 (düzeltme 5). |
| `GET /user-tactics/main?careerId` | 200 `UserTactic` ya da 200 + `data: null` (düzeltme 6). `careerId` zorunlu. Diziliş okuma anında süzülür (Q2): kadroda olmayan ya da bizden kiralıkta olan oyuncu düşer, `lineupDropped` sayısı döner. |
| `DELETE /user-tactics/{slot}` | Ana taktikse işaret de gider. |

- **Upsert `is_main`'i korur** (düzeltme 4): ana slotun üzerine kayıt işareti düşürmez.
- **`UserTactic` yanıtı:** + `main`, `lineup`, `depth`, `presetId`, `updatedAt`, `lineupDropped`.
- **`TacticSlotLookup`:** önce `is_main`, yoksa en küçük slot (geri uyum).
- **Zarf:** `ApiResponse.data` artık her zaman yazılır (null dahil). Önceden `NON_NULL` yüzünden null `data` alanı hiç gelmiyordu.
- **Q2 notu:** "müsait" ölçütü olarak `career_player.available` **kullanılmadı**. O sütun `loan_from_team_id IS NULL`, yani bize kiralık gelen oyuncuları da düşürürdü. Ölçüt dizilişin kullandığı kadro: `squadPlayerIds` = kadrodaki ve bizden kiralıkta olmayan oyuncular.

### 7.4 Başlangıç önerisi — `GET /careers/{id}/starter-tactic` (D-31, FAZ 1'de uygulandı)
- Ücretsiz; kredi düşmez; preset taraması ve ücretli içgörü yok (D-01). `requireOwned` (404); kadro < 11 → 422 (`fc.exception.0030`).
- **Hesap:**
  - `FormationRanker.rank` birincisi. Bu, `TacticRecommenderService.searchFormations` içindeki formasyon-only sıralamadan refactor ile çıkarıldı; iki servis aynı metodu çağırır.
  - Varsayılan kurulum: `TacticDefaults` (`seed/tactic-defaults.json`, web `src/lib/tacticDefaults.json` ile birebir; iki tarafta parite testi).
  - Diziliş: kredisiz `FitService.lineup`.
- **Yanıt:** `{formationId, setup, slots[slotId, position, roleId, roleName], lineup, squadFit, alternatives[2]}`.
- **Önbellek:** bellek içi LRU (256).
  - Anahtar = kariyer + son IMPORT anlık görüntüsü + **son kadro hamlesi**. Brief'te yalnız ilk ikisi vardı; alım/satış kadroyu içe aktarma olmadan da değiştirdiği için son hamle eklendi.

**Testler (backend):**
- `UserTacticMainIntegrationTest` (6):
  - gidiş-dönüş + EA kodu,
  - replika/taslak dışlayıcılığı ve replikada boş `tags`,
  - tek ana taktik ve upsert'in işareti koruması,
  - `careerId` zorunlu (400) ve sahiplik (404),
  - dizilişin süzülmesi,
  - öneri motorunda ana taktik önceliği.
- `StarterTacticIntegrationTest` (3):
  - ücretsiz, ilk formasyon ve 11 kişilik diziliş,
  - 404 / 422,
  - içe aktarmaya kadar önbellek (sıralayıcı spy).
- `TacticDefaultsParityTest`.
- Refactor: mevcut advisor testleri (`ApiFlowIntegrationTest` `/advisor/tactic` dahil) yeşil. Refactor'dan önce davranışı sabitleyen ayrı bir karakterizasyon testi **yazılmadı**.

### 7.2 Satış planı kalıcılığı (FAZ 5)
- Etiket + `asking_price_eur` yeterli, ayrı tablo yok (Q3).
- `career_player_tag` (`FOR_SALE` / `LOAN_OK`) + `asking_price_eur BIGINT NULL`. Migration V44 ya da o an boş olan sıradaki numara.
- `PUT /careers/{id}/tags/{pid}` gövdesine `askingPriceEur`.
- Bütçe planı "satış planı geliri" = Σ(`FOR_SALE` için `askingPriceEur ?? valueEur`).

### 7.3 Eksik kayıt verisi
- **Sakatlık: BEKLEMEDE** (Q6). Şimdilik kariyer log'u yok; `injury_until` için kod yazılmaz. Masa'da sakatlık satırı "Veri yok" gösterir; uydurma yok.
- **Kiralık dönüşü:** `CareerPlayerResponse.loanUntil`, `career_player.loan_until`'dan doğrudan. `/moves`'a bağımlılık kalkar.
- **Maaş:** `CareerPlayerResponse.wageEur`. Maaş etkisi ve kullanımı için kadro satırında gerekir.
- **Sezon sonu:** kolon eklenmez. "Dönem bitişi" = `windowEndsOn` (kullanıcı). Boşsa StatTile "–" + Ayarlar bağlantısı.

---

## 8. Görsel sistem: token değişiklikleri

Yeni hex **yalnız `tokens.css`**'e girer; bileşenlerde hex ya da Tailwind renk sınıfı yok.
Değerler **öneri**dir; FAZ 1'de kontrast testi (`contrast.test.ts`: ink/ink-2/muted × en kötü aurora + cam bileşimi ≥ 4,5:1) ile kesinleşir.

### 8.1 Kariyer, koyu (`[data-ui="v3"][data-mode="career"]`)

| Token | Eski (amber) | Yeni (Cyber-Pitch) |
|---|---|---|
| `--bg-base` | `#070a12` (ortak) | `#090d1a` (antrasit-lacivert) |
| `--aurora-1` | `#ff9f1c` | `#7c3aed` (mor) |
| `--aurora-2` | `#3a7d44` | `#0ea5e9` (siber mavi) |
| `--aurora-3` | `#c2410c` | `#10b981` (neon yeşil; doygun leke) |
| `--aurora-opacity` | `.45` | `.40` |
| `--accent` | `#ffb547` | `#3ee8a8` |
| `--accent-ink` | `#0b0f1d` | `#06120d` |
| `--accent-soft` | `rgba(255,181,71,.16)` | `rgba(62,232,168,.16)` |
| **`--edge-glow`** (yeni) | — | `rgba(62,232,168,.35)` |
| **`--edge-draft`** (yeni) | — | `rgba(56,189,248,.55)` (kesik çizgi) |

### 8.2 Kariyer, açık (`[data-theme="light"][data-mode="career"]`)
Bugün aurora ezilmiyor; düzeltilir.

| Token | Eski | Yeni |
|---|---|---|
| `--bg-base` | `#eef1f7` | `#eaeef7` |
| `--aurora-1/2/3` | koyu amber seti (hata) | `#c4b5fd` / `#7dd3fc` / `#6ee7b7` |
| `--aurora-opacity` | `.28` | `.30` |
| `--accent` | `#c2410c` | `#0f7a55` (beyazda ≈ 5,3:1, ölçülecek) |
| `--accent-ink` | `#fff` | `#ffffff` |
| `--accent-soft` | `rgba(194,65,12,.12)` | `rgba(15,122,85,.12)` |
| `--edge-glow` | — | `rgba(15,122,85,.30)` |
| `--edge-draft` | — | `#0369a1` (yarı saydam öneri açık camda ~2,5:1 kalıyordu; kontrast testi) |

### 8.3 Cyber-Pitch saha
Tema bağımsız; 11 §3.2 ilkesi saha her temada koyu.

| Token (yeni) | Değer | Not |
|---|---|---|
| `--cyber-pitch-1` | `#0b1324` | şerit A |
| `--cyber-pitch-2` | `#0e182c` | şerit B |
| `--cyber-line` | `rgba(62,232,168,.80)` | ana çizgiler (neon yeşil) |
| `--cyber-line-2` | `rgba(56,189,248,.65)` | ceza sahası ve orta yuvarlak (siber mavi) |
| `--pawn-bg` | `#f2f5fb` | düz daire, gölgesiz |
| `--pawn-ink` | `#090d1a` | OVR rakamı (≈ 17:1) |
| `--pawn-ring` | `var(--accent)` | seçili / odak halkası 2 px |
| `--pawn-label-bg` | `#090d1a` (opak) | isim etiketi; **Q5: metin sahada değil, opak hapın üstünde** |
| `--pawn-label-ink` | `#f2f5fb` | |

- Uyum durumu piyonun kenar halkasında 2 px: `--good` / `--warn` / `--bad`. Renk tek başına bilgi taşımaz; `title` ve aria'da yüzde yazar.
- **Mevcut `--pitch-*`** (çim) UT ve geriye uyum için kalır. Pitch `field="cyber"` seçince `--cyber-*` okunur.

### 8.4 Fallback'ler (zorunlu)
- **`prefers-reduced-transparency` / `prefers-contrast: more` / `[data-transparency="reduced"]`:**
  - `--edge-glow: transparent`.
  - Kenar `--glass-border` 1 px opak.
  - `--edge-draft` → `--ink-2`.
  - Aurora gizlenir; `--bg-base` düz.
- **`@supports not (backdrop-filter)`:** 11 §3.4 değerleri. Kenar parıltısı `box-shadow` 0 0 0 1px (blur yok).
- **Animasyon:** parıltı animasyonu **yok**. Aurora renk geçişi yalnız mod değişiminde (11 §2), reduced-motion'da yok.
- **Blur sınırları:** 11 §7 aynen; mobil 12px / 120%. Piyon ve saha blur almaz.

### 8.5 Doküman güncellemeleri (FAZ 1)
- **11 §1 P5:** "Kariyer = Cyber-Pitch (mor / siber mavi / neon yeşil), UT = iris".
- **11 §3.1/3.2:** 8.1-8.3 tabloları.
- **11 §6:** Pitch `field` / `marker`, Panel `edge` / `source`.
- **08_DECISIONS_LOG:** D-26 (yazılmamış v3 kararı) + D-27..D-30.

---

## 9. API taslakları

### 9.1 Pitch (genişletme; yeni bileşen yok)
```ts
interface PitchProps {
  // mevcut: slots, onPickPlayer, onPickRole?, onRemove?, onSwap?, readOnly?, eaCards?
  field?: 'grass' | 'cyber'          // varsayılan 'grass' (UT değişmez); kariyer sayfaları 'cyber'
  marker?: 'card' | 'pawn'           // varsayılan 'card'; Kadro 'pawn', Lab 'card' (+ kullanıcı geçişi)
  pawnLabel?: 'surname' | 'none'     // varsayılan 'surname'
  showRole?: boolean                 // piyonda rol hapı; varsayılan false (Kadro), true (Lab piyon)
  onPickPawn?: (slotId: string) => void // readOnly'de tıklama (Kadro: oyuncu sayfası)
}
```

**Piyon çizimi**
- Daire çapı `layoutPitch`'ten gelir: `marker` parametresi, `PAWN_MIN 32px` (≥1024: 40), dokunma alanı ≥ 44px (mobil, şeffaf kutu).
- İçinde OVR (`--font-num`, ≥ 14px).
- Altında opak isim hapı (Barlow ≥ 11px, ellipsis, `title` = tam ad), sonra mevki hapı. Q11/Q18 korunur.

**Diğer kurallar**
- Sürükleme ve klavye taşıma piyonda da çalışır (Lab piyon modunda). `readOnly`'de kapalı.
- `layout.ts`'e `markerBox(marker, width)` eklenir. q17 betiğine `marker ∈ {card,pawn}` boyutu eklenir. `layout.test.ts` genişler.
- Boş slot (piyon): kesik çizgili daire + "+" (readOnly'de mevki kısaltması).
- Satır etiketleri v3 token'larına taşınır (`ink-950` / `paper-50` / `flood-400` → `--pawn-label-*`, `--accent`). Kart modunda da geçerli.
- PlayerCard'a dokunulmaz. Piyon bir kart değil, saha işaretidir (CLAUDE.md "kart yalnız PlayerCard" kuralı korunur).

### 9.2 Panel (genişletme)
```ts
type DataSource =
  | { kind: 'record'; at: string }        // "Kayıt verisi · 18 Eki"
  | { kind: 'decision'; label?: string }  // "Kararın" / "Ana taktik"
  | { kind: 'draft'; savedSlot?: number } // "Taslak · kaydedilmedi" | "Taslak · Slot 2"
  | { kind: 'auto' }                      // "Otomatik öneri · ana taktik değil" (D-31)
interface PanelProps {
  // mevcut: title?, actions?, children, className?, as?
  edge?: 'default' | 'glow' | 'draft'     // glow: 1px --edge-glow halka; draft: 1px kesik --edge-draft
  source?: DataSource                     // başlık satırında <SourceTag/>
}
```

- **`SourceTag`** ayrı primitive: Chip benzeri, ≥ 12px, ikon + metin. Renk tek başına anlam taşımaz.
- **`StatTile`:** 11 §6'daki Δ çipi eklenir (`delta?: number`, Masa'da önceki içe aktarmaya göre).

---

## 10. Kaldırılacak / taşınacak bileşenler

| Bileşen / dosya | İşlem |
|---|---|
| `state/tacticStore.ts`, `state/lineupStore.ts` | Yalnız v2 (geliştirme) için kalır; v3 `features/**` bunları import etmez (legacyGates kuralı). Yardımcılar `lib/tactic.ts`'e. |
| `features/squad/useCareerBinding.ts` | → `useMainTacticBinding` + `useLabBinding` |
| `features/squad/CareerSquadBuilderPage.tsx` | → `features/lab/TacticsLabPage.tsx` (kurucu sekmesi); `useCareerSquadBuilder` binding parametresi alır |
| `features/wizard/TacticWizardPage.tsx` | Gövdesi `features/lab/WizardTab.tsx`; sayfa kabuğu kalkar |
| `features/desk/DeskPage.tsx` | → `features/dashboard/DashboardPage.tsx`; DeskSettings + CareerSettingsPanel birleşir |
| `features/squad/kadro/KadroPage.tsx` | → `features/careerSquad/CareerSquadPage.tsx`; `LineupHero` salt okunur; `kariyer` sekmesi Masa'ya |
| `kadro/useCareerLineup.ts` | Ana taktik okur; swap / navigate / mirror-set kalkar |
| `components/TacticLineup.tsx` | Yalnız v2 `pages/SquadPage.tsx` kullanıyor; dokunulmaz |
| `features/replicas/SaveToSlot.tsx` | Lab'ın "Ana taktiğim yap" diyaloğunun slot seçicisi olarak genelleşir |
| `lib/deskRules.ts` | Bağlantılar yeni rotalara (sell/group kırıkları düzelir) |
| UT: `useUtBinding`, `UtSquadBuilderPage`, `useSquadWorkspace`, `SquadWorkspaceView` | **Değişmez** (yalnız Pitch'in yeni opsiyonel prop'ları; varsayılanlar UT'yi korur) |

---

## 11. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Ana taktik yok (tüm mevcut kullanıcılar) | Masa / Kadro / Transfer boş | Göç: önceki taslak + "ana taktik yap" kısayolu; boş durum CTA |
| `TacticState` ↔ `user_tactic` eşlemesi (rol id'si odak içeriyor mu; etiketler bugün kaydedilmiyor) | Kayıpla kaydetme | V43 `tags`, `depth`, `preset_id`; eşleme tek yerde (`lib/tactic.ts`) ve gidiş-dönüş testi |
| useSquadWorkspace kariyer davranışı değişir | UT regresyonu | Binding yalnız kariyer tarafında değişir; squadCore `describe.each`, q16, UT testleri ve ekran görüntüsü kıyası |
| Kontrast: neon yeşil aurora + cam | AA ihlali | `contrast.test.ts` (en kötü aurora × cam bileşimi); opaklık ≥ .62 korunur |
| Piyon ölçüleri (Q17/Q18) | Etiket kesilmesi / çakışma | q17 matrisi + piyon; ≥ 44px dokunma |
| Sakatlık alanı LE'de belirsiz | Yanlış uyarı | Doğrulanana kadar "Veri yok"; uydurma yok |
| Prod'a erken çıkış | Kullanıcı bozulması | Ayrı dallar; PR onaysız birleşmez; backend V43 geriye uyumlu (yalnız ekleme) |
| Kaydedilmemiş taslak fark edilmez (rota engeli yok) | UX | Nav noktası + taslak çubuğu `•`; taslak yerelde zaten saklı, veri kaybı yok (düzeltme 1) |
| Öneri önbelleği bayatlar (Lab'da düzenleme, ayar değişikliği) | Masa eski öneri gösterir | Anahtar içe aktarma + kadro hamlesi; öneri kadroya bağlı, Lab taslağından etkilenmez (katman 3 ayrı) |
| Eski yer imleri / paylaşılan linkler | 404 | Yönlendirmeler sorgu dizgisini taşır; `*` → `/` zaten var |

---

## 12. Fazlar ve kabul

| Faz | İçerik | Kabul |
|---|---|---|
| **0** | Bu doküman | Buğra onayı |
| **1** | Token'lar (8.1-8.4) + Panel `edge` / `source` + `SourceTag` + Pitch `field` / `marker` + `labStore` ve göç + backend V43 ve uçlar + karar kaydı D-26..30 + 11 güncellemesi | Web: test, lint, build. Backend: mvn test. Ladle / ekran: Pitch cyber + piyon, 375/768/1280 × koyu/açık × UT/kariyer; axe; kontrast testi |
| **2** | Masa | 11 §8 Q1-Q18; `screens/KARIYER-UX-2/` |
| **3** | Kadro | aynı; `screens/KARIYER-UX-3/` |
| **4** | Taktik Lab (+ yönlendirmeler, nav) | aynı + UT regresyon ekranları |
| **5** | Transfer (+ satış planı kalıcılığı, kısa liste köprüleri) | aynı |

Her faz sonunda rapor: değişen dosyalar, D numaraları, test özeti, ekran klasörü, açık sorular, PR bağlantısı.

---

## 13. Kararlar (Buğra, 2026-10-22)

- **Q1 · Ana taktik yokken → otomatik başlangıç önerisi (D-31).**
  - Masa, Kadro ve Transfer boş kalmaz: kadroya en uygun formasyon ve en iyi 11 gösterilir (§7.4).
  - Görünüm: Cyber-Pitch piyon, `SourceTag kind="auto"`, `edge="default"`.
  - Eylemler: "Ana taktiğim yap", "Lab'da düzenle" (`origin.kind='auto'`), "Detaylı öneri (8 kredi)" (mevcut `/advisor/tactic`).
  - Göç varsa ek kısayol: "Önceki taslağı ana taktik yap".
  - Ana taktik seçilince etiket "Kararın" olur.
- **Q2 · Diziliş:** (a) ve (b) birlikte. `lineup` opsiyonel; boşsa `/fit/lineup` dizer. Okuma anında kadroda olmayan oyuncu düşer, boşluğu `/fit/lineup` doldurur. UI notu: "2 oyuncu kadroda yok, otomatik dolduruldu".
- **Q3 · Satış planı:** etiket + `asking_price_eur` yeterli; FAZ 5.
- **Q4 · Vurgu:** neon yeşil (`#3ee8a8` koyu, `#0f7a55` açık); kontrast testiyle doğrulandı (§15).
- **Q5 · Lab varsayılanı:** kart modu; piyona tek tıkla geçilir.
- **Q6 · Sakatlık:** beklemede; "Veri yok".

## 14. FAZ 0 düzeltmeleri (Buğra, 2026-10-22)

1. `useBlocker` kalktı (`BrowserRouter`); yerine nav noktası + `•` (§4.3, §6.2, §11).
2. V43'te `tags` kolonu yok; etiketler `slots[].tags` (§7.1).
3. Taslaktan kayıtta `ea_code` codec'le (§7.1).
4. Upsert `is_main`'i korur (§7.1).
5. `/main` yalnız kariyer; `careerId` yoksa 400 (§7.1).
6. Ana taktik yoksa 200 + `data: null` (§7.1).
7. `lineup` anahtarı `base_player.id` (§7.1).
8. 10 taslak sınırı: sessiz silme yok, mesaj (§6.2).
9. Migration numarası kontrolü (§7.1).
10. Tek taktik modeli: `lib/tactic.ts` ↔ backend `TacticRequest` (§6.3, §7.1).

## 15. FAZ 1 raporu (2026-10-22)

**Backend** (`kariyer-ux`, migration **V43**)
- V43 + kullanıcı taktiği uçları (§7.1).
- `FormationRanker` + `StarterTacticService` / `Controller` + `TacticDefaults` (§7.4).
- `SquadTooSmallException` (422).
- `ApiResponse.data` her zaman yazılır.
- Testler: `mvn test` 645/645 yeşil.

**Web** (`kariyer-ux`)
- **Tek taktik modeli:** `lib/tactic.ts` + `tacticDefaults.json`. `tacticStore` tip ve yardımcıları buradan yeniden dışa verir (v2 davranışı aynı).
- **API:** `api/types.ts` (`UserTactic` genişledi, `StarterTactic`, `SaveUserTacticBody`); `api/endpoints.ts` (`mainTactic`, `setMainTactic`, `starterTactic`).
- **Depo ve göç:** `state/labStore.ts`; `state/migrations.ts` (002, adım listesi).
- **Kariyer kancaları:** `features/career/activeTactic.ts` (`useActiveTactic`, `useMainTacticBinding` salt okunur, `useMakeMainTactic`).
- **Öneri ekranı:** `features/career/StarterTacticPanel.tsx`, `MakeMainDialog.tsx`.
- **Kadro çekirdeği:** `features/squad/tacticState.ts` (ortak `squadStateOf`).
- **Primitives:** `design/components/primitives.tsx`; `SourceTag` (`record | decision | draft | auto`), Panel `edge` / `source`.
- **Pitch:** `components/pitch/Pitch.tsx` (`field`, `marker`, `showRole`, `onPickPawn`) ve `layout.ts` (`markerBox`, piyon yerleşimi).
- **Stil:** `design/tokens.css` (8.1-8.4), `design/glass.css` (`panel-edge-*`, kariyer aurora fallback'i).
- **Önizleme:** `features/preview/KariyerUxPreview.tsx`, yalnız geliştirmede (`/onizleme/kariyer-ux?bolum=oneri|saha|panel`); prod derlemesine girmediği doğrulandı.
- **Tip importları:** `lib/depth`, `lib/mirror`, `lib/wizardQuestions`, `components/TagChips` artık `lib/tactic`'ten alıyor.
- **Kapı:** `design/kariyerUxGates.test.ts`. v3 kodu `tacticStore` / `lineupStore` import etmez. Geçiş için 10 dosyalık izinli liste var; liste yalnız küçülür ve FAZ 2-4'te boşalır.
- **Testler:** `npm test` 1376/1376 (UT regresyonu dahil: `squadCore`, `q16`, `useUtBinding`, `UtSquadPage*`). `npm run lint` hatasız (yalnız önceden var olan uyarılar). `npm run build` yeşil; giriş JS gzip 169 KB (Q10 ≤ 250).
- **Kontrast** (`design/contrast.test.ts`, koyu + açık kariyer): `--ink`, `--ink-2`, `--muted`, `--accent` en kötü aurora + cam üstünde ≥ 4,5:1; `--accent-ink`/`--accent`, piyon rakamı ve isim hapı ≥ 4,5:1; saha çizgileri, piyon/saha ve taslak kenarı ≥ 3:1.
  - Açık temada taslak kenarı önerilen yarı saydam değerle ~2,5:1 kalıyordu; düz `#0369a1` yapıldı.
  - Eski açık tema amber vurgusu (`#c2410c`) aynı testte cam üstünde 4,5:1'i geçemiyordu (yeni renkle kapandı).
- **Ekran görüntüleri:** `screens/KARIYER-UX-1/`, 48 görüntü.
  - Matris: öneri / saha / panel × kariyer / UT × 375/768/1280 × koyu / açık, + reduced-motion + reduced-transparency.
  - Hepsinde yatay taşma 0, axe serious/critical 0, konsol/ağ hatası 0 (`gates-report-*.json`).

**Bilinen eksikler ve sonraki fazlar**
- **Q17 sayfa ölçümü:** `q17.mjs` sayfa üzerinde ölçüyor; piyonu kullanan sayfa FAZ 3'te (Kadro) gelecek. FAZ 1'de piyon Q17'si birim matrisinde: 29 formasyon × 4 boyut × rol var/yok (`layout.test.ts`).
- **Redis'e bağlı betikler:** 16. bölümde kapandı.
- **Saha etiketleri:** v3 token'larına yalnız cyber sahada taşındı. Çim saha (UT) eski Matchday renklerini piksel piksel korur. UT değişmez kuralı nedeniyle bilinçli.
- **Ana taktikte boş slot:** `lineupDropped` sonrası boşlukları `/fit/lineup` ile doldurma sayfa entegrasyonunda (FAZ 2-3). Öneri ekranı şimdilik boş slotu gösterir.

## 16. FAZ 1 düzeltmeleri (Buğra incelemesi, 2026-10-22)

Dört sapma (kadro listesi, önbellek anahtarı, `data: null`, koşulsuz ret) onaylandı. Düzeltmeler:

1. **Boş slot metni.** "N oyuncu artık kadroda yok, slotları boş". Doldurma FAZ 2-3'te gelince "otomatik dolduruldu"ya dönülecek. Test: `starterTactic.test.tsx`.
2. **Piyon etiket boyutu (Q18).** `scripts/pawn-font-gate.mjs` 375/768/1280'de hesaplanan yazı boyutunu ölçer (rapor `screens/KARIYER-UX-1/pawn-font-report.json`).
   - Soyad hapı ve mevki hapı her genişlikte 12px; ihlal yok.
   - Görüntüdeki küçüklük, 1280 görüntüsünün küçültülerek gösterilmesi ve Barlow Condensed'in dar harfinden; kod değişmedi.
3. **Uyum rengi ile yüzde.** Gerçek veride iki ayrı kural var:
   - Yüzde `levelFit`, yani seviyeye göre uyum.
   - Renk sunucunun rol etiketi (`GOOD` / `AT_LEVEL` / `WEAK` / `WRONG_ROLE`). Kartlardaki FitBadge ile aynı kural (`fitDisplay`).
   - **Karar:** renk kuralı korunur. Piyonun `title` ve erişilebilir adında yazılır: "uyum %82 · Rol için eksik (renk rol etiketinden, yüzde seviye uyumu)".
   - Önizleme verisi tutarlı yapıldı: ≥75 uygun, 65-74 seviyesinde, 55-64 sınırda, <55 eksik. Test: `pitchPawn.test.tsx`.
4. **`labStore.dropCareer`** `DeleteCareerButton` onSuccess'ine bağlandı. Başarısız silmede taslaklar kalır. Test: `DeleteCareerButton.test.tsx` (2).
5. **Çok sekme.** `window` `storage` olayında `fc.lab.v1` değişince `labStore.reload()`. Başka anahtar yeniden yükleme yapmaz. Test: `labStore.test.ts` (2).
6. **Web CI.** Sorun yok.
   - Actions açık (`enabled: true`, `allowed_actions: all`).
   - PR #2 için "Web CI / check" koşmuş ve geçmiş (1 dk 49 sn).
   - Durumu PR açıldıktan hemen sonra okumuştum; koşu 3 sn sonra başlamıştı. "Çalışmıyor olabilir" notu yanlıştı.
7. **Redis kalıntısı.** 18 betikten `resetRateLimits` tanımı ve 26 çağrısı kaldırıldı.
   - Her dosyaya not: "koşu 429 alırsa backend'i yeniden başlat (docker compose restart backend)".
   - `node --check` ve oxlint temiz.
8. **Formasyon sıralaması davranış sabitleme** (`FormationRankerCharacterizationTest`). Sentetik, tohumlu iki kadro; veritabanı kataloğu kullanılmaz, testler arası değişmez.
   - Dengeli: 4-3-3 (2 CDM) 61,66 · 4-2-1-3 61,39 · 4-3-3 61,27.
   - Stopersiz: 4-3-3 (CAM) 22,78 · 4-2-4 22,76 · 4-3-3 (3 CM) 22,72.
   - Mevcut davranışı sabitleyen test; önce kırmızı görülmedi.
9. **`career_player.available`.** `CareerSearchProfile.availableFilter` Javadoc'u: pazar/scouting filtresi ("kiralıkta olan satın alınamaz"); ilk 11 ve diziliş için kullanılmaz. Migration'a dokunulmadı.
   - Test `LoanedInPlayersStartIntegrationTest`: tüm kadro `available=false` iken `/fit/lineup` 11 başlangıç verir ve ana taktik dizilişi oyuncu düşürmez.
   - Koruma testi; önce kırmızı görülmedi.

**Test sayıları:** web 1381/1381 (+5), backend 648/648 (+3); lint ve build yeşil.

## 17. FAZ 2 raporu: Kariyer Masası (2026-10-23)

Dallar yığın (Buğra kararı): web ve backend `kariyer-ux-2`, `kariyer-ux` üstünde; FAZ 1 birleşince taban `v3`/`main`'e çevrilir.

**Rota ve nav.** `/career/dashboard` → `features/dashboard/DashboardPage.tsx`. `/career/desk` v3'te `RedirectWithSearch` ile sorgu dizgisini taşır (v2'de eski sayfa). Nav, AppShell ikonu, Ana sayfa, Yeni kariyer ve İçe aktar bağlantıları yeni rotada. Eski `features/desk/DeskPage.tsx` silindi; `DeskSettings`/`Timeline` yalnız v2 `CareerDeskPage` için kalır.

**Ayarlar.** `features/dashboard/CareerSettings.tsx`: ad, transfer bütçesi, sezon, maaş bütçesi, dönem sonu, spoiler, challenge tek kayıtta; yedek indir/yükle ve sil ayrı panelde. `CareerSettingsPanel` silindi; Kadro › kariyer yalnız "Ayarlar Masa'ya taşındı" bağlantısı (FAZ 3'te sekme kalkar).

**Ana taktik ve doldurma (Q2).** `useActiveTactic` ana taktikte `lineupDropped > 0` ise `/fit/lineup`'a `locked` (kalan dizilen oyuncular) gönderir; sonuç yalnız okunur, ana taktiğe yazılmaz. Metin `droppedText`: doldurma gelince "N oyuncu kadroda yok, otomatik dolduruldu", gelmezse "… slotları boş". Ana taktik yoksa Masa `StarterTacticPanel`'i gösterir; Takım uyumu ve Zayıf halkalar "Ana taktik seçilmedi" + "Lab'a git".

**Paneller** (her başlıkta `SourceTag`):
- Finansal sağlık (kayıt): transfer bütçesi, maaş bütçesi kullanımı (çubuk), dönem sonuna gün; `StatTile` Δ çipi önceki IMPORT snapshot'ına göre. Δ tanımı: en yeni IMPORT bugünü temsil eder, fark ondan önceki IMPORT'a göre (MANUAL/OCR atlanır). Maaşı bilinmeyen oyuncu varsa "N oyuncunun maaşı bilinmiyor" ve yüzde "–". Dönem sonu yoksa "–" + "Dönem sonunu gir" (Ayarlar).
- Acil uyarılar (kayıt): sözleşme ≤ 6 ay (kiralık gönderilen hariç), kiralık dönüşü ≤ 30 gün (`loanUntil`, her iki yön), sakatlık "Veri yok".
- Takım uyumu (karar): FitGauge, ana taktik adı/formasyonu, doldurma notu.
- Zayıf halkalar (karar): sunucu etiketiyle seçim (WEAK/WRONG_ROLE aynı grup, sonra AT_LEVEL; grupta düşük levelFit önce; GOOD girmez), kartta etiket metni, levelFit %, `reasons[0]` Türkçe (`reasonText`: "GKPositioning -25.3" → "Kaleci pozisyon −25,3"). Durum `data-fit-state` ile; renk tek başına kullanılmaz.
- Zaman çizelgesi (kayıt): Yaklaşan (istemcide türetilir: dönem sonu, kiralık bitişleri, ≤ 6 ay sözleşme bitişleri) ve Geçmiş (hamleler, içe aktarmalar).
- "Bu dönemin 3 işi" Masa'dan çıktı (§4.1'de yok); `rankActions` Ana sayfada kullanılmaya devam eder.

**Bağlantılar.** `lib/deskLinks.ts`: `deskLink` §4.1 rotaları; `deskRules` satış/derinlik/kiralık/sözleşme bağlantıları buradan (`?sell=`, `?group=` kırıkları düzeldi). **GEÇİCİ** `currentRoute` (FAZ 3/5'te kalkar, test: `deskLinks.test.ts`):
- `/career/transfer?…rol=` → `role=` takma adı eklenir (Transfer bugün `pos`+`role` okur).
- `/career/squad?…` → `/squad?…`; `sekme=derinlik` → `sekme=oyuncular` (mevki yoğunluğu orada).
- `/career/tactics-lab?…` → `/squad/builder?…` (`sekme` düşer).

**Karşılanmayan parametreler** (bağlantı verilir, hedef sayfa henüz okumaz): Transfer `sekme=satis`, `oyuncu`; Kadro `grup`; Lab `slot` (kurucu slot seçmez); Transfer `ihtiyac=slot-…` yalnız Transfer'in kendi dizilişinde aynı slot zayıfsa eşleşir, değilse `pos`+`role`'e düşer.

**Katman 3 kapısı.** `kariyerUxGates.test`: Masa içe aktarma zincirinde `tacticStore`/`lineupStore` yok; `labStore` yalnız `StarterTacticPanel` (göç kısayolu; panel yalnız ana taktik yokken çizilir) ve `DeleteCareerButton` (yalnız `dropCareer`). Birim testi: Lab taslağı varken `labStore.get` çağrılmaz, uyum ana taktiğin oyuncularıyla hesaplanır. `legacyGates.test`'e `/career/dashboard` eklendi.

**İzinli liste.** Küçülmedi. Listedeki 10 dosyanın hiçbiri Masa'ya ait değildi: eski Masa `useCareerBinding` üzerinden dolaylı okuyordu, `useCareerBinding` hâlâ Ana sayfa, Transfer ve kurucu tarafından kullanılıyor. Masa için bunun yerine geçişli kapı eklendi (yukarıda).

**Ek düzeltme.** `Pitch` ölçülmeden (genişlik 0) negatif `<rect>` ölçüsü yazıyordu (Masa'da konsol hatası); W/H alt sınırı 16. Test: `pitchPawn.test.tsx`.

**Backend** (API CONTRACT CHANGE): `/fit/lineup` `locked`; `/squad` `loanUntil`, `wageEur`; `/snapshots` `budgetEur`, `squadWageEur` (V44).

**Ekranlar** `screens/KARIYER-UX-2/` (`scripts/dashboard-shots.mjs`, üretim derlemesi, yerel test kariyeri, koşu sonunda silinir): 3 durum × 375/768/1280 × koyu/açık + Ayarlar = 24 çekim; taşma 0, axe serious/critical 0, konsol/ağ hatası 0, en küçük yazı 12px; `/career/desk?sekme=ayarlar` → `/career/dashboard?sekme=ayarlar`. Kayıt verisi (maaş, kiralık bitişi, sözleşme, iki IMPORT snapshot'ı) LE içe aktarması gerektirdiği için yalnız tarayıcıda fikstür; ana taktik, satış ve doldurma gerçek API ile.

**Test sayıları:** web 1409/1409, backend 652 (0 hata, 5 atlanan); lint hatasız, build yeşil; pawn-font-gate ≥ 12px.

## 18. FAZ 2 düzeltmeleri (Buğra incelemesi, 2026-10-23)

1. **Zayıf halka eylemi.** Sıralama aynı (WEAK + WRONG_ROLE tek grup, düşük `levelFit` önce). Kart `primary`: WRONG_ROLE → "Rolü değiştir" (Lab, FAZ 4) + ikincil "Transferde aday bul"; WEAK/AT_LEVEL → birincil "Transferde aday bul". `LAB_AVAILABLE=false` iken WRONG_ROLE kartında yalnız etiket metni ve ikincil aday bağlantısı.
2. **Δ.** Son içe aktarma bir öncekiyle; tek içe aktarmada çip yok (koruma testi; davranış zaten böyleydi, önce kırmızı görülmedi).
3. **"Bu dönemin 3 işi" Masa'nın en üstünde.** Tek kaynak: kurallar `lib/deskRules.ts` → `seasonJobs` (+ `jobLayer`), bileşen `features/career/SeasonJobs.tsx`, uyum verisi `features/career/useMainTacticFits.ts`. Ana sayfa ve Masa üçünü de kullanır; Ana sayfa artık eski `useCareerBinding`/`useAutoLineup` yerine ana taktikten okur. Başlık etiketi taktik kaynağı ("Kararın" ya da ana taktik yokken "Otomatik öneri"); iş satırı etiketi kural kaynağı (FILL/SELL/LOAN taktik, DEPTH/CONTRACT kayıt). Masa, Zayıf halkalar'da gösterilen slotların FILL işini tekrar etmez (V3-06e, `exclude`); Ana sayfa dışlamaz.
4. **Lab girişleri gizli.** `lib/features.ts` → `LAB_AVAILABLE = false` (FAZ 4'te kaldırılır): `StarterTacticPanel` "Lab'da düzenle" (taslak da oluşmaz), zayıf kart "Lab'da dene"/"Rolü değiştir", "Ana taktik seçilmedi" boş durumundaki "Lab'a git". "Önceki taslağı ana taktik yap" kalır.
5. **Neden satırı.** `worstReason`: katkılar içinde en büyük negatif; negatif yoksa satır yok. Biçimlendirici (`reasonText`) aynı.
6. **v2 Masa bağlantıları.** Dokunulmadı: v2 (yalnız geliştirme) `CareerDeskPage` `deskRules`'un yeni §4.1 bağlantılarını geçici eşleme olmadan verir; satış ve derinlik bağlantıları henüz olmayan sayfalara gider.
7. **Migration numaraları.** V43 (FAZ 1) ve V44 (FAZ 2) KARIYER-UX'e ayrıldı. **SIM-A, REP-e ve diğer işler V45'ten başlar.** Risk: yerel veritabanı V44'te; başka bir dal farklı içerikle V43/V44 kullanırsa Flyway checksum doğrulaması başlangıçta hata verir (yerel DB'de ya da birleştirmede). Yeni dal açarken `ls src/main/resources/db/migration | sort -V | tail -1` ve açık PR'lar kontrol edilir.
8. **Yerel yığın.** Backend ve web konteynerleri `kariyer-ux-2` çalışma ağacından derlendi (kart vekili kapalı, `FCAREER_FREE_BETA` varsayılan false).

**Ek bulgu (düzeltildi).** Ekran koşusunda başlangıç önerisi 429 dönünce Masa isteği döngüye soktu: öneri paneli `isLoading`'e (öneri sorgusu dahil) bağlıydı, her hata paneli söküp bağlıyor, her bağlanış isteği yineliyordu. Panel artık yalnız ana taktik sorgusunun yüklenmesine (`mainLoading`) bağlı. Test: `dashboardPage.test` "döngüye girmez" (önce kırmızı).

**Ekranlar** yeniden çekildi (`screens/KARIYER-UX-2/`, 24): "3 iş" her durumda ilk bölüm, Lab girişi 0, taşma/axe/konsol/ağ 0, en küçük yazı 12px.

**Test sayıları:** web 1417/1417; backend değişmedi (652, 0 hata, 5 atlanan); lint hatasız, build yeşil, pawn-font-gate ≥ 12px.

## 19. FAZ 3 raporu: Kadro Analizi (2026-10-23)

**Taban.** FAZ 1/2 birleşmediği için web `kariyer-ux-3`, `kariyer-ux-2` üstüne yığıldı. Backend değişmedi (dal yok).

**Rota.** `/career/squad` → `features/careerSquad/CareerSquadPage.tsx`. v3'te `/squad` → `LegacySquadRedirect` (`careerSquadRules.legacySquadTarget`): `saha` → `dizilis` (varsayılan), `oyuncular` → `liste`, `kariyer` → `/career/dashboard?sekme=ayarlar`; diğer parametreler kalır. v2'de `/squad` eski sayfa.
- Nav: "Taktik & Kadro" grubu (mobilde "Kadro") `/career/squad`'a gider; sayfa içi ilk sekme "Kadro". Kurucu/sihirbaz/replikalar FAZ 4'e kadar aynı grupta. Ray bağlantısı `NavLink` yerine `Link` (etkinlik grubun `match` listesinden; `NavLink` yalnız kendi `to`'su eşleşince `aria-current` yazıyordu).
- İç bağlantılar: v3'te `/squad`'a giden tek yer `deskLinks` geçici eşlemesiydi; kaldırıldı. Masa'nın derinlik ve kiralık bağlantıları doğrudan `/career/squad?sekme=derinlik&grup=…` ve `?sekme=hareketler`'e düşer. Ana sayfa, içe aktarma (v3) ve replikalarda `/squad` bağlantısı yoktu.

**Sekmeler** `dizilis · liste · derinlik · hareketler` (kariyer sekmesi kalktı).
- Diziliş: `StarterTacticPanel` (ana taktik ya da başlangıç önerisi, FAZ 2 doldurması dahil), salt okunur Cyber-Pitch piyon, `onSwap`/sürükleme yok, piyon → `/players/{id}` (`onPickPawn`), piyonda slot uyumu (`useMainTacticFits`). Yanında Kadro özeti: ortalama reyting, oyuncu sayısı, ortalama yaş (kiralık gönderilen hariç). "Lab'da düzenle" `LAB_AVAILABLE` ile gizli. Eski "kartı değiştir → lineupStore → kurucu" akışı ve aynalama kaydı yok.
- Liste: mevcut liste/kartlar/etiket görünümü, satış ve kiralık diyalogları; listede `wageEur` sütunu ve kiralık rozetinde `loanUntil` (`SquadList recordColumns`; v2 tablosu değişmez).
- Derinlik (yeni): mevki grupları (kim/kaç, `deskRules.depthRows` eşiğiyle), mevki yoğunluk haritası (ana taktiğe göre), yaş profili histogramı (tek seri, `--accent`, her çubukta sayı, `title`, `role="img"` metin özeti + ekran okuyucu tablosu), sözleşme bitiş zaman çizgisi (yıl şeritleri, ≤ 6 ay simge + metin). `?grup=` o grubu açık ve odaklı getirir, diğerleri kapalı.
- Hareketler: `SaveMoves` + `MoveHistory` + `TransferMarket`, olduğu gibi.
- `StarterTacticPanel` taslak deposunu artık yalnız ana taktik yokken (göç kısayolu için) okur; Kadro'da ana taktik varken `labStore.get` hiç çağrılmaz (birim testi).

**Ek düzeltme: mevki yoğunluk haritası.** Ekranlarda iki kusur görüldü (bileşen V3-07b'den): (1) açık temada "Çok/Az" hücreleri yarı saydam `-soft` zeminle saha üstünde okunmuyordu → yüzey opak, durum kalın kenar + metin; (2) mutlak konumda CM/CDM hücreleri çakışıyordu (4-1-3-2) → hat satırları (`squadDensity.formationRows`); 375'te 4-5'li hatlarda hücre metni kesilmez, alt satıra geçer. v2 `SquadDensity` dokunulmadı (`slotTop` kalır). Testler önce kırmızı.

**Legacy temizliği.** İzinli liste 10 → **8**: `useCareerLineup.ts` ve `useCareerSquad.ts` listeden çıktı. İkisi de artık yalnız v2 tarafından kullanılıyordu; mantıkları değişmeden `src/pages/squad/`'a taşındı (v2'nin içe aktarma yolu iki satır: `pages/SquadPage.tsx`, `components/TacticLineup.tsx`; davranış aynı). v3 Kadro yeni `useCareerSquadData` ile ana taktikten okur. `KadroPage` (+ testi) silindi. Kadro zinciri için geçişli kapı eklendi (`kariyerUxGates`: tacticStore/lineupStore yok, labStore yalnız `StarterTacticPanel`, eski Kadro parçaları yok); `legacyGates`'te `/squad` yerine `/career/squad`.

**Q17 (piyon, gerçek Kadro sayfası).** `scripts/q17-kadro.mjs` + `pitchGate.measurePawnPitch`: 29 formasyon × 375/768/1280; her formasyon için yerel test kariyerinde ana taktik (`/fit/lineup` dizilişi) kurulup sayfa ölçüldü. Sonuç (`screens/KARIYER-UX-3/q17-kadro-report.json`): **87/87 temiz** — kesişme 0, saha dışı 0, etiket kesilmesi/taşması 0, en küçük dokunma alanı 44px.

**Hız sınırı (429) bulgusu.** `RateLimitFilter`'da auth/solver/analysis/img dışındaki tüm uçlar tek **"api:" kovası**: kullanıcı başına (oturumsuzsa IP) **dakikada 300 istek**, sabit dakika penceresi, bellek içi (`WindowCounter`). FAZ 2'de `starter-tactic` 429'u bu kovadan; çekim betiği art arda tam sayfa yüklüyordu ve o koşudaki döngü hatası (düzeltildi) isteği katlıyordu. Ölçüm (`squad-shots.mjs`, görseller hariç): tam yükleme Masa 25, Kadro 25, Transfer 25 istek; uygulama içi geçiş ilk turda 7/2/0, sonra 0 (TanStack önbelleği). Normal kullanımda 300'e ulaşmak için dakikada ~12 tam yenileme gerekir; uygulama içi gezintide risk düşük. Sınır değiştirilmedi; açık soru aşağıda.

**Ekranlar** `screens/KARIYER-UX-3/` (`scripts/squad-shots.mjs`, üretim derlemesi): 4 sekme × ana taktik yok/var × 375/768/1280 × koyu/açık = 48 çekim + 6 yönlendirme kontrolü; sonuçlar `gates-report.json`. Betik 429'a takılmamak için kendi hızını ayarlar (≤ 240/dk). Taşma 0, axe serious/critical 0, konsol/ağ hatası 0, en küçük yazı 12px, Lab girişi 0; `/squad?sekme=oyuncular` → `/career/squad?sekme=liste`.

**Yerel yığın.** Backend `kariyer-ux-2` (backend'de FAZ 3 değişikliği yok), web `kariyer-ux-3` çalışma ağacından; kart vekili kapalı. Test hesapları koşu sonunda silindi.

**Açık sorular (FAZ 3).**
1. Hız sınırı: tek "api:" kovası 300/dk. Hızlı F5 yapan ya da birkaç sekmede aynı anda gezinen kullanıcı (sekmeler aynı kovayı paylaşır) dakikada ~12 tam yüklemeyi geçebilir. Ağır sayfa uçları (`/fit/role` slot başına 11 istek) için ayrı kova ya da toplu `fit/role` ucu düşünülsün mü? Sınır değiştirilmedi.
2. Nav: "Taktik & Kadro" grubu artık Kadro'ya açılıyor; kurucu/sihirbaz aynı grupta. §3'teki ayrı "Kadro" ve "Taktik Lab" öğeleri FAZ 4'te mi ayrılsın?

**Test sayıları:** web 1436/1436; backend değişmedi; lint hatasız, build yeşil, pawn-font-gate ≥ 12px, Q17 87/87.

## 20. FAZ 4a raporu: Taktik Laboratuvarı (kabuk, kurucu, ana taktik) (2026-10-23)

**Merge (Buğra onayı).** Merge commit ile, sırayla: backend #1 → `main` (`1500ad8`), #2 → `main` (`6c283f7`); web #2 → `v3` (`12c9881`), #3 → `v3` (`ebb33f5`), #4 → `v3` (`9bf53c5`). Her alt PR'ın tabanı elle değiştirildi, çakışma yok, dal silinmedi; her PR'da CI yeşil, backend `main` push CI'ı iki merge'den sonra da yeşil. **Prod doğrulanamadı:** bilinen Railway alanları merge'den önce ve sonra `404 "Application not found"` (`x-railway-fallback`) döndü (proje durdurulmuş); deploy, Flyway V43/V44 ve health kontrolü yapılamadı, Railway'e erişilmedi (kural). Railway web servisinin hangi dalı izlediği bilinmiyor; GitHub Pages iş akışı `main`'den, `v3` henüz `main`'e birleşmedi.

**Rota.** `/career/tactics-lab` → `features/lab/TacticsLabPage.tsx`. v3'te `/squad/builder`, `/tactics/builder`, `/fit` → `/career/tactics-lab?sekme=kurucu` (`RedirectWithSearch` artık hedefin sorgusunu korur, gelen parametreleri ekler). `/tactics/wizard` bugünkü sayfada (4b). v2 rotaları değişmedi.

**Kurucu.** `LabBuilder` = ortak çekirdek (`SquadWorkspaceView` + `useCareerSquadBuilder(useLabBinding)`); `useCareerSquadBuilder` artık bağlamayı parametre alır (v2 `useCareerBinding` verir). Saha `field="cyber"`, varsayılan kart, "Kart / Piyon" geçişi (`SquadWorkspaceView` `field`/`marker`; UT vermez). `useLabBinding` aktif taslağa yazar (`tacticOf` = `squadStateOf` tersi, gidiş-dönüş testli). `?slot=` temiz bir ana taktik taslağı yoksa ana taktikten yeni taslak açar, slot paneli açık gelir, parametre adresten düşer. `deskLinks` Lab eşlemesi kalktı (kalan geçici eşleme yalnız Transfer `rol` → `role`).

**Taslak çubuğu** (`DraftBar`, panel `edge="draft"` + SourceTag "Taslak · kaydedilmedi" / "Taslak · Slot N"): seçici (ad + kirli "•"), Yeni (ana taktikten, yoksa başlangıç önerisinden) · Kopyala · Yeniden adlandır · Sil (onaylı; kirli taslakta "Yine de sil" ikinci onayı). Sınır mesajı labStore'dan (FAZ 1). Taslak yokken boş durum + "Yeni taslak".

**"Ana taktiğim yap".** `MakeMainDialog` (FAZ 1) → `PUT /user-tactics/{slot}` (taslak taktiği + dizilişi) → `PUT /{slot}/main` → `labStore.markSaved` (kirli kalkar, `savedTo`). Yenilenenler: `main-tactic`, `user-tactics`, `lineup`, **`starter-tactic`**, **`slot-fit`** (Masa/Kadro rol uyumu). Test: kayıttan sonra aynı istemcide Kadro yeni ana taktiği gösterir.

**`LAB_AVAILABLE` kaldırıldı.** "Lab'da düzenle" (öneri paneli; Masa ve Kadro'da Lab'a gider), "Lab'a git" (Masa boş durum), zayıf kart: WRONG_ROLE birincil "Rolü değiştir" (`/career/tactics-lab?sekme=kurucu&slot=…`) + ikincil aday; WEAK birincil aday + ikincil "Lab'da dene".

**Nav.** Masa · Kadro · Taktik Lab · Transfer · Oyuncular (+ Gelişim, Takımlar, İçe aktar). Mobil alt çubuk 5 öğe (Masa, Kadro, Lab, Transfer, Oyuncu) + "Daha fazla"; 375'te "Oyuncular" kelime ortasından bölündüğü için mobil etiketi "Oyuncu". Taktik Lab sekmeleri: Kurucu · Sihirbaz · Replikalar. Aktif kariyerde kirli taslak varsa "Taktik Lab"/"Lab" öğesinde nokta ve `aria-label` "… · kaydedilmemiş taslak var"; nokta yokken işaretleme öncekiyle birebir (UT piksel kontrolü).

**Transfer.** İhtiyaçlar artık ana taktikten (`useMainTacticFits`, 15 §4.4); eski tek kopya diziliş okunmaz (test, eski depoya çelişen değer yazarak doğrular).

**Legacy temizliği.** İzinli liste **8 → 2**: kalanlar `components/EaTacticCode.tsx` (şu an kullanılmıyor, Kod sekmesi) ve `features/wizard/TacticWizardPage.tsx` (Sihirbaz) — ikisi de 4b. `useCareerBinding`, `AutoFitPanel`, `ProtectLeadCard`, `TeamSetup` yalnız v2 kullandığı için mantık değişmeden `src/pages/squad/`'a taşındı; v2'de içe aktarma yolları ve `SquadBuilderPage`'de `useCareerSquadBuilder(useCareerBinding)` argümanı değişti (davranış aynı). `CareerSquadBuilderPage` silindi (yerine `LabBuilder`). Kapı: Lab zinciri tacticStore/lineupStore içermez; labStore yalnız `features/lab/` içinden; eski kurucu parçaları zincirde yok. `legacyGates`'te `/squad/builder` yerine `/career/tactics-lab`.

**UT regresyonu.** `squadCore` (`describe.each`), q16, `useUtBinding`, `UtSquadPage*` yeşil. UT kurucusu önce/sonra (`screens/KARIYER-UX-4a/ut-once`, `ut-sonra`, 8'er çekim) `scripts/png-diff.mjs` ile piksel karşılaştırması: 6/8 birebir; `dark-1280-reduced-transparency` 8 piksel (kadro adı alanının yuvarlak kenarında kenar yumuşatma, görsel fark yok), `light-768` 1 piksel. Aynı kodla iki koşu arasında da 1 piksellik fark çıktı (gürültü tabanı). İlk "sonra" koşusunda ray/alt çubuk ikonunu saran öğe 375'te ~1.475 piksel kaydırıyordu; nokta yokken işaretleme eskiye döndürüldü.

**İstek ölçümü (madde 9).** Taslağı (boş diziliş) olan Lab kurucusu tam yükleme: **26 API isteği**; bunların **11'i `/fit/role`** (slot başına), 1 `/fit/lineup` (ilk dizme), gerisi tek seferlik (careers, squad, formations, roles, ea-roles, presets, behavior-tags, resolve, export-code, main-tactic, ut/rules, config, me, players/assets). Uygulama içi tekrar açılışta `slot-fit` önbellekten gelir.
- `POST /fit/squad` bunun yerine geçemez: ücretli (`CreditGuard`, SQUAD_FIT), kendi atamasını çözer (kullanıcının dizilişini kilitlemez) ve kurallar/NLG üretir.
- `POST /fit/lineup` + `locked` = mevcut 11'in tamamı: tek istekte aynı motorla (kariyer v3) slot başına `levelFit`, `fitLabel`, rozet döner; **eksik: `reasons`** (`withoutPaidInsights` atıyor) — kurucunun "en zayıf" nedeni ve Masa `worstReason` bunu kullanıyor. `/fit/role` nedenleri zaten ücretsiz verdiği için 4b'de `lineup` yanıtına `reasons` eklenip 11 istek 1'e indirilebilir (API CONTRACT CHANGE, ayrı hız sınırı sayacı yok).

**Sihirbaz boşluğu (4a kapanışında kapandı).** v3 Sihirbaz "Uygula" artık yeni Lab taslağı açar (`origin: {kind: 'wizard', ref: presetId}`, aktif) ve `/career/tactics-lab?sekme=kurucu`'ya gider; sınır doluysa mesaj, yönlendirme yok. Eski depoya yazılmaz; izinli liste 2 → 1 (`EaTacticCode`, 4b).

**Ekranlar** `screens/KARIYER-UX-4a/` (`scripts/lab-shots.mjs`, üretim derlemesi, durumlar arayüzden): taslak yok / kirli taslak / ana taktik yapıldı × 375/768/1280 × koyu/açık = 18 çekim, sorun 0 (taşma, axe serious/critical, konsol/ağ), en küçük yazı 11px. Q17/Q18 Lab (`scripts/q17-lab.mjs`, 29 formasyon × 375/768/1280 × kart + piyon = 174 ölçüm): sorun 0; en küçük kart 48px, kart içi yazı 11px, piyon dokunma alanı 44px. pawn-font-gate ≥ 11px.

**Yerel yığın.** Backend `main` (`6c283f7`, V44), web `kariyer-ux-4` çalışma ağacından; kart vekili kapalı. Test hesapları koşu sonunda silindi.

**Test sayıları:** web 1460/1460; backend değişmedi (merge sonrası `main` CI yeşil); lint hatasız, build yeşil.

**Açık sorular (FAZ 4a).**
1. Railway: servis durdurulmuş görünüyor; yeniden kurulunca web servisinin `v3`'ü mü `main`'i mi izleyeceği ve `v3` → `main` birleşmesi ne zaman?
2. Toplu uyum (4b): `/fit/lineup` yanıtına `reasons` eklenip kurucu/Masa/Kadro/Transfer'in 11 `/fit/role` isteği tek isteğe indirilsin mi?
3. Mobil "Oyuncular" etiketi "Oyuncu" oldu (375'te kelime bölünmesi); doküman §3 metni güncellensin mi? (Kapandı: §3 güncellendi.)

## 21. FAZ 4b raporu: Lab sekmeleri ve toplu uyum (2026-10-23)

**4a kapanışı.** Sihirbaz "Uygula" → `labStore.create({origin: wizard})`, taslak aktif, `/career/tactics-lab?sekme=kurucu`; sınırda mesaj, yönlendirme yok (testler önce kırmızı). §3 mobil etiketi "Oyuncu". PR #5 CI yeşil, merge commit ile `v3`'e: `b1f6e54`. Dal silinmedi.

**Sekmeler** (`?sekme=`): Kurucu · Sihirbaz · Replikalar · Kod · Karşılaştır. Taslak çubuğu taslak varken her sekmenin üstünde; Lab grubunun kabuktaki ikinci sekme satırı kaldırıldı.
- **Sihirbaz:** `features/wizard/TacticWizardPage` → `features/lab/WizardTab.tsx` (sayfa kabuğu silindi). "Bu taktiği kur" yeni taslak (origin wizard) + Kurucu sekmesi. `/tactics/wizard` v3'te → `/career/tactics-lab?sekme=sihirbaz` (sorgu taşınır); v2 eski sayfada. `WIZARD_RESULT_PATH` = `/career/tactics-lab?sekme=kurucu` (yalnız v2 kullanır; v2'de bu rota girişsiz eski kurucuya yönlenir).
- **Replikalar:** mevcut liste (`ReplicasPage`, `embedded`: başlık yok, süzgeç dışı adres parametreleri korunur) gömülü; kartta "Klonla → taslak" — replika taktiği (`tacticFromReplica`) + `/replicas/{id}/apply` kadromla dizilişi (useReplicaApply ile aynı sorgu anahtarı) → taslak (origin replica) → Kurucu. `/replicas/:id` › Kadromla uygula kariyer modunda aynı eylemi sunar ve Lab kurucusuna gider; UT'de yok (davranış aynı). REP-d tasarımına dokunulmadı.
- **Kod:** dışa aktar — "Aktif taslak" (TacticCodeService.export) ya da "Ana taktik" (saklı `eaCode`); içe aktar — EA kodu yeni taslak (origin code) → Kurucu. Kullanılmayan `components/EaTacticCode.tsx` (eski depo bağı) silindi.
- **Karşılaştır:** A/B seçimi (ana taktik + taslaklar; varsayılan A ana taktik, B aktif taslak). Her taraf tek `/fit/lineup` (kilitli). Slot slot: oyuncu, %, fark B − A işaretli ve metinli ("▼ −64 · düştü", "= aynı"), etiket değişimi ("Rol için uygun → Rol için eksik"); takım uyumu farkı StatTile'larla. Mobilde tek sütun, renk kullanılmaz.

**Toplu uyum (API CONTRACT CHANGE, backend `a31e4e5`).** `/fit/lineup` `slots[].roleFit.reasons` döner (`/fit/role` ile aynı biçim/sıra, en çok 3; `LineupReasonsIntegrationTest` iki slotu `/fit/role` ile birebir karşılaştırır ve ücretli alanların yokluğunu teyit eder — D-01). `ApiFlowIntegrationTest`'teki "reasons yok" beklentisi bu karara göre güncellendi. Web: `useLineupFits` (tek istek, dizilenler kilitli, `slot-fit` anahtarı) — Lab kurucusu ve `useMainTacticFits` (Masa, Kadro, Transfer, Ana sayfa) kullanır; `useSlotFits` yalnız v2 sayfalarında. Not: rol uyumu artık kariyer kaydındaki oyuncu verisiyle hesaplanır (`/fit/role` katalog verisini kullanıyordu); tazelenmiş kariyerde sayılar kayda göre farklılaşabilir.

**İstek ölçümü** (`scripts/fit-requests.mjs`, tam yükleme, `screens/KARIYER-UX-4b/istek-once.json`, `istek-sonra.json`):

| Sayfa | Önce | Sonra | /fit/role | /fit/lineup |
|---|---|---|---|---|
| Lab kurucusu | 25 | 15 | 11 → 0 | 0 → 1 |
| Masa | 25 | 15 | 11 → 0 | 0 → 1 |
| Kadro | 25 | 16 | 11 → 0 | 0 → 1 |

(4a'daki 26, boş dizilişli taslakta ilk dizme isteğini de sayıyordu.)

**Legacy listesi → 0.** İzin listesi kaldırıldı; kural katı: `features/`, `components/`, `design/`, `lib/` içinde `tacticStore`/`lineupStore` içe aktaran dosya yok (istisna yok). Eski depolar yalnız v2 (`src/pages/**`).

**Ekranlar** `screens/KARIYER-UX-4b/` (`scripts/lab-tabs-shots.mjs`): 5 sekme × 375/768/1280 × koyu/açık = 30 çekim, sorun 0, en küçük yazı 11px. UT kurucusu önce/sonra (`ut-once`, `ut-sonra`): **8/8 piksel birebir**. pawn-font-gate yeşil. Q17/Q18 Lab (kart + piyon, 29 formasyon × 3 genişlik): 174/174 temiz (3 satır ilk koşuda sayfa yükleme zaman aşımıydı, yeniden ölçüldü; `q17-lab-report.json`).

**Test sayıları:** web 1471/1471, backend 653 (0 hata, 5 atlanan); lint hatasız, build yeşil.

**Açık sorular (FAZ 4b).**
1. Rol uyumu kariyer kaydındaki oyuncu verisine geçti (`/fit/lineup`); eski `/fit/role` katalog verisini kullanıyordu. Bu doğru kabul ediliyor mu (Masa/Kadro yüzdeleri kayda göre değişebilir)?
2. Karşılaştır'da farklı formasyonlu iki taraf slot kimliğiyle eşleşir; eşleşmeyen slot "karşılaştırılamaz" yazar. Mevkiye göre eşleme istenir mi?

**Yerel yığın.** Backend `kariyer-ux-4b` (`a31e4e5`), web `kariyer-ux-4b`; kart vekili kapalı; test hesapları silindi.

## 22. FAZ 3.1 raporu: Kadro listesi (2026-10-23)

**Gruplama** (`lib/squadGroups.ts`, `?grup=mevki|hat`, varsayılan mevki; Liste ve Kartlar aynı gruplamayı kullanır, "Gruplama" segmenti). Mevki: ana mevki (ilk listelenen) sırası GK · RB · CB · LB · CDM · CM · CAM · RM · LM · RW · LW · ST, başlık "LW · Sol kanat · 3", boş grup yok; grup içinde OVR azalan, eşitlikte POT. Hat: eski dört grup (Kaleciler · Defans · Orta saha · Hücum), boş olan gösterilmez. Kartlarda hat gruplamasında derinlik etiketi yok (derinlik mevki başınadır). Derinlik sekmesinin `?grup=` değerleri Liste'de geçersizdir ve mevkiye düşer. v2 (`SquadPage`) değişmedi: `grouping` verilmezse eski grup başına tablo.

**Tek tablo** (`SquadList` `grouping` opt-in): bir `thead`, `colgroup` sabit genişlikler (`table-fixed`), grup başına `tbody` + `<th scope="rowgroup">` başlık satırı; sayılar sağa hizalı, `tabular-nums`. Kırılımlar: sm altı isim · en iyi mevki · OVR · POT (mevkiler, yaş ve durum isim altında); sm+ yaş ve durum; lg+ mevkiler ve maaş. Gizlenen sütunun `col`'u da gizlenir; grup başlığı 4 sütuna yayılır (daha geniş `colSpan` dar ekranda boş sütun açıp isim sütununu eziyordu). Kiralık tarihi çipin altında ayrı satırda ("bitiş 31 May 2027"); kiralıktaki oyuncunun en iyi mevkisi "Kiralıkta" (öneri bu oyuncuları içermez).

**Sol/sağ en iyi mevki (BEHAVIOR CHANGE, backend).** `BestPositionRule`: (1) listelenen bir mevki en iyi overall'a `fcareer.position.listed-preference` (varsayılan 1) puan yakınsa o gösterilir; (2) simetrik eşitlikte (LB/RB, LWB/RWB, LM/RM, LW/RW) taraf listelenen mevkilerin tek tarafından, yoksa tercih ayağından, yoksa ilk listelenen mevkiden. Eskiden aday listesi soldan başladığı için eşitlikte sol seçiliyordu. Taranan yollar: `PositionAdviceService.bestOverall` (düzeltildi) ve öneri sırası `options` (eşit puanlı simetrik çiftler aynı kuralla sıralanır); `bestScores` ve `FeasibilityService` yalnız mevki başına en yüksek puanı kullanır (taraf seçmez, etkilenmez); `PlayerMapper.positionOveralls` yalnız gösterim haritası; web en iyi mevkiyi kendisi hesaplamaz. Testler: `BestPositionRuleTest` (McGowan/Gutiérrez/Hall sentetik oyuncuları, eşik), `PositionAdviceSideTest`.

**Maaş sütunu.** Başlık "Maaş (hafta)", boş hücre "—"; hiçbir oyuncuda maaş yoksa tablo altında "Maaş verisi içe aktarmada gelmiyor." Bulgu: `CareerPlayerWriter.applyContracts` maaşı `players.wage` alanından okur; LE betiği `players` tablosunu ve `career_playercontract`'ı dışa aktarır. Depodaki fikstürde (`le-export/fc27-2026-10/players.csv`) 243 satırın hepsinde `wage` dolu (biriminin haftalık euro olduğu doğrulanmadı; ana menüden mi kariyerden mi alındığı bilinmiyor). Yerel içe aktarılmış kariyerde 21 668 satırın hiçbirinde maaş, sözleşme ya da kiralık verisi yok. Kariyer içinden alınmış bir dışa aktarım diskte yok; değer uydurulmadı.

**Ekranlar** `screens/KARIYER-UX-3-1/` (`scripts/kadro-list-shots.mjs`): liste mevki/hat + kartlar mevki/hat × 375/768/1280 × koyu/açık = 24 çekim, sorun 0, en küçük yazı 12px. Sütun kapısı: her sütunun görünür hücreleri tüm gruplarda ve başlıkta aynı x'te (yayılım 0 px), isim sütunu ≥ 120 px, hiçbir hücrede içerik taşması yok; ilk koşu 375'te ve 768'de isim sütununun ezildiğini yakaladı (yukarıdaki kırılım düzeltmesi).

**11 §8.** Q2 (12px, yalnız token), Q3 (taşma yok), Q4/Q15 (axe serious/critical 0), Q6 (yeni uç yok), Q13 (çip yazısı 12px; çipler etkileşimsiz) bu çekimlerle ölçüldü; Q1 sayfanın mevcut yükleme/boş durumları değişmedi; Q11/Q17/Q18 saha kapıları Liste sekmesinde saha olmadığı için yeniden koşulmadı; Q8, Q9, Q10, Q14, Q16 bu değişiklikle ilgisiz.

**Test sayıları:** web 1481/1481, backend 660 (0 hata, 5 atlanan; backend `3800e29`); lint hatasız, build yeşil.

**Açık sorular (FAZ 3.1).**
1. Kariyer içi maaş `career_playercontract`'ta mı, `players.wage`'te mi ve hangi birimde (haftalık euro mu)? Kariyer içinden bir LE dışa aktarımı gelirse doğrulanır.
2. `listed-preference` = 1 doğru eşik mi (listelenen mevki en iyiye 1 puan yakınsa o gösterilir)?

**Yerel yığın.** Backend ve web `kariyer-ux-3-1`; kart vekili kapalı; test hesapları silindi.
