# 15 · KARİYER-UX — Kariyer modu sayfalarının yeniden yapılandırılması ("Cyber-Pitch")

Durum: **FAZ 0 (yalnız doküman)**. Kod yok. Buğra onayından sonra FAZ 1'e geçilir.
Dal: web `kariyer-ux` (v3'ten), backend `kariyer-ux` (FAZ 1'de açılır). İki tarafta da PR onaysız birleştirilmez (main → prod).
Kapsam yalnız **v3** arayüzü (prod'da tek arayüz; `uiVersion.ts:34-57`, v2 yalnız geliştirmede `VITE_UI_V2` ile). v2 sayfalarına dokunulmaz.

---

## 0. Özet

| # | Karar / öneri | Durum |
|---|---|---|
| 1 | Kariyer kimliği amber → **Cyber-Pitch** (antrasit/lacivert zemin; mor, siber mavi ve neon yeşil aurora; ince neon kenar) | Öneri **D-27**. 11 güncellenir. |
| 2 | Üç veri katmanı: **Kayıt verisi** (salt okunur), **Kariyer kararları** (sunucu), **Lab taslağı** (yerel, geçici) | Öneri **D-28** |
| 3 | Yeni rotalar: `/career/dashboard`, `/career/squad`, `/career/tactics-lab`, `/career/transfer`. Eskiler `<Navigate replace>` | Öneri **D-29** |
| 4 | Ana taktik sunucuda (`user_tactic.is_main`). Taslaktan kaydedilebilir (bugün yalnız replikadan). Kadro dizilişi ve davranış etiketleri de taşınır | **API CONTRACT CHANGE**, öneri **D-30** |
| 5 | Pitch'e iki genişletme: `field="cyber"` ve `marker="pawn"` (piyon). Yeni saha bileşeni yok | FAZ 1 |
| 6 | Tek kopya `fc.tactic` + `fc.lineup` → kariyere göre anahtarlı taslak deposu `fc.lab.v1`. Bir kez göç | FAZ 1 |

Not: **D-26** (görsel dil v3 = glassmorphism) 11 L4'te ayrılmış, ama karar kaydına hiç yazılmamış. FAZ 1'de D-26 ile birlikte D-27..30 eklenir.

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
- Mobil alt çubuk: Masa · Kadro · Lab · Transfer · Oyuncular (5).

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
| `kurucu` | Mevcut `SquadWorkspaceView` (sürükle-bırak, rol & odak, davranışlar, öneriler), kart modu; saha `field="cyber"` |
| `sihirbaz` | TacticWizardPage gövdesi; "Uygula" **yeni taslak** açar (bugün tek kopyayı eziyor) |
| `replikalar` | Replika listesi; "Klonla → taslak" (replika taktiği + `useReplicaApply` dizilişi) |
| `kod` | TacticCodeCard + EaTacticCode: içe aktar → yeni taslak; dışa aktar → aktif taslak |

**Taslak çubuğu** (sayfa başı)
- Taslak seçici: ad, kirli işareti `•`.
- Yeni taslak (ana taktikten) · Kopyala · Yeniden adlandır · Sil.
- **Karşılaştır**: iki taslak ya da taslak ↔ ana taktik; slot slot uyum farkı.
- Birincil eylem: **"Ana taktiğim yap"** → slot seçimi diyaloğu (1-5; dolu slot için ikinci onay, SaveToSlot deseni) → `PUT /user-tactics/{slot}` (taktik gövdesi) + `PUT /user-tactics/{slot}/main`. Ardından invalidate: `['main-tactic',careerId]`, `['user-tactics',careerId]`, `['lineup',careerId,…]`. Taslak "kaydedildi" olur (kirli değil).

**Görsel:** çalışma alanı paneli `edge="draft"` (kesik çizgi) + SourceTag "Taslak · kaydedilmedi" / "Taslak · Slot 2'ye kaydedildi".

**Çıkış koruması:** kirli taslak varken
- rota değişiminde `useBlocker` onay diyaloğu,
- sekme kapanırken `beforeunload`.

Kirli taslak yerelde zaten saklı; uyarı yalnız "ana taktik değil" hatırlatmasıdır.

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
  drafts: Draft[]              // en çok 10; en eski kirli olmayan atılır
}>
interface Draft {
  id: string                   // crypto.randomUUID()
  name: string
  origin: { kind: 'main' | 'replica' | 'wizard' | 'code' | 'blank'; ref?: string }
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
- **Kirli göstergesi:** `useLabDirty(careerId)` → taslak çubuğu `•`, `useBlocker`, `beforeunload`.

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
  - `origin.kind = 'blank'`.
  - `dirty = true`.
  - `fc.tactic` globaldi; bu yüzden **lineup'ı olan her kariyere** kopyalanır. Lineup yoksa yalnız aktif kariyere (`fc.career`).
- Eski anahtarlar silinir. Göç bayrağı `fc.migrations` içine yazılır.
- Kullanıcı ilk açılışta Masa'da şunu görür: "Önceki taslağın Lab'da. Ana taktik yapmak ister misin?"

### 6.5 Testler (önce kırmızı)

| Test | Doğrular |
|---|---|
| `labStore.test.ts` | Taslak düzenlemesi `['main-tactic']` ve `['squad']` önbelleğini değiştirmez (dondurulmuş önbellek + derin eşitlik); kariyerler arası sızıntı yok; 10 sınırı; silme |
| `migrations.test.ts` | `fc.tactic` / `fc.lineup` → `fc.lab.v1`, bir kez |
| `makeMain.test.tsx` | "Ana taktiğim yap" sonrası Masa ve Kadro yeni ana taktiği gösterir (MSW / mock endpoints + invalidate) |
| `squadCore.test.tsx` (mevcut, `describe.each(['ut','career'])`) | Kariyer binding'i `useLabBinding`, UT değişmez |
| `q16.test.ts`, `useUtBinding.test.tsx`, `UtSquadPage*.test.tsx` | UT regresyonu: aynı kalır, yeşil |
| `redirects.test.tsx` | 7 eski rota + sorgu dizgisi korunur |
| `readonlyBinding.test.ts` | Ana taktik binding'inde `patch` hiçbir depoya yazmaz |

---

## 7. Backend (aynı PR serisi, API CONTRACT CHANGE)

### 7.1 Ana taktik — migration `V43__user_tactic_main.sql`
```sql
ALTER TABLE user_tactic
  ADD COLUMN is_main    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN lineup     JSONB,          -- {"slotId": playerEaId}  (opsiyonel; yoksa /fit/lineup otomatik dizer)
  ADD COLUMN tags       JSONB,          -- {"slotId": ["tag", ...]} davranış etiketleri
  ADD COLUMN depth      SMALLINT,
  ADD COLUMN preset_id  TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX ux_user_tactic_main ON user_tactic (user_id, COALESCE(career_id, 0)) WHERE is_main;
```

**Uçlar** (`UserTacticController`, hepsi `careerId` doluysa `requireOwned`)

| Uç | Davranış |
|---|---|
| `PUT /user-tactics/{slot}` | Gövde ya `{careerId, replicaId}` (bugünkü) ya `{careerId, name, tactic:{formation, buildUp, depth, presetId, slots:[{slotId, position, roleId, focus, tags[]}]}, lineup?}`. İkisi birden → 400. |
| `PUT /user-tactics/{slot}/main?careerId` | Tek transaction: aynı kullanıcı+kariyerde diğerlerini `false`, bunu `true`. Slot boşsa 404. |
| `GET /user-tactics/main?careerId` | 200 `UserTactic` ya da 204 (ana taktik yok) |
| `DELETE /user-tactics/{slot}` | Ana taktikse işaret de gider. Sonrasında ana taktik yok. |

- **`UserTactic` yanıtı:** + `main`, `lineup`, `tags`, `depth`, `presetId`, `updatedAt`.
- **`TacticSlotLookup`:** önce `is_main`, yoksa bugünkü en küçük slot (geri uyum).

**Testler (backend)**

| Test | Doğrular |
|---|---|
| `UserTacticMainIntegrationTest` | Tek ana taktik (kısmi unique); `/main` değiştirince diğeri düşer; başka kullanıcının kariyeri 404; replika ve taslak gövdesi; ikisi birden 400; silince ana yok |
| `TacticSlotLookupTest` | `is_main` önceliği |

### 7.2 Satış planı kalıcılığı
- `career_player_tag` (`FOR_SALE` / `LOAN_OK`) + yeni kolon `asking_price_eur BIGINT NULL` (V44).
- `PUT /careers/{id}/tags/{pid}` gövdesine `askingPriceEur`.
- Bütçe planı "satış planı geliri" = Σ(`FOR_SALE` için `askingPriceEur ?? valueEur`).
- Açık soru Q3.

### 7.3 Eksik kayıt verisi (FAZ 2'nin bağımlılığı)
- **Sakatlık:** LE `teamplayerlinks.injury` → içe aktarmada `career_player.injury_until` (ya da `injured` boolean; alanın anlamı LE'de doğrulanacak).
  - `PlayerSummary.injured` / `injuredUntil` olarak döner.
  - Doğrulanana kadar Masa uyarısında sakatlık satırı "Veri yok" gösterir. Uydurma yok.
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
| `--edge-draft` | — | `rgba(3,105,161,.60)` |

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
| Kirli taslak uyarısı can sıkıcı | UX | Yalnız "ana taktik değil" ve gerçekten kirli olunca; taslak yerelde zaten saklı |
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

## 13. Açık sorular (Buğra)

- **Q1 · Ana taktik yokken.**
  - (a) Boş durum + CTA (önerim).
  - (b) Otomatik en küçük slot.
  - (c) Otomatik en iyi 11 + varsayılan formasyon.
- **Q2 · Ana taktik dizilişi sabitlesin mi?**
  - (a) Evet, kullanıcının dizdiği 11 saklanır (`lineup`).
  - (b) Hayır, her zaman `/fit/lineup` en iyi 11'i dizer.

  Önerim: (a) opsiyonel. Boşsa (b).
- **Q3 · Satış planı kalıcılığı.** Etiket + `asking_price_eur` yeterli mi, yoksa ayrı `career_sale_plan` tablosu mu?
- **Q4 · Kariyer accent rengi.** Neon yeşil mi (önerim; saha çizgisiyle aynı aile), siber mavi mi?
- **Q5 · Lab varsayılan işareti.** Kurucu kart modunda mı açılsın (önerim; rol uyumu ve kart bilgisi), piyon mu?
- **Q6 · Sakatlık için LE betiği.** `teamplayerlinks.injury`'nin anlamı (gün mü, tür mü) bir kariyer log'uyla doğrulanacak. 2.0.4 gerekebilir.
