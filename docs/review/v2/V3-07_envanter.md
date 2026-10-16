# V3-07 sayfa envanteri

Üretim: `node scripts/page-inventory.mjs` (kod taraması, 2026-10-16). Ekran görüntüleri: `screens/V3-07a/envanter/` (1280 koyu).

Özet: 39 rota · 33 sayfa (6 yönlendirme) · v3 sayfası 19 · kısmen 0 · eski 14 · eski parçası hiç olmayan 7.

Sütunlar: **v3** = rotada v3 için ayrı/yeni sayfa ve sayfa dosyasında eski işaret yok (evet), ayrı ama dosyada eski işaret var (kısmen), v2 bileşeni (hayır). **Eski bileşen** = doğrudan sayfa dosyasında ve içe aktarma zincirinde (kabuk hariç) bulunan işaretler: ui.tsx Card/Pill/Modal/Stat, Modal.tsx, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex (kart tasarım config'i hariç).

| Rota | v3'te açılan bileşen | v3 | Eski bileşen | Kim görür | Önerilen task |
|---|---|---|---|---|---|
| `/` | HomeV3 (features/home/HomePage) | evet | zincir: lib/squadBuilder.ts (hex) | anonim | V3-07a (zincirde eski parça) |
| `/about` | AboutPage (pages/AboutPage) | hayır | yok | anonim | V3-08 |
| `/login` | LoginV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/register` | RegisterV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/verify-email` | VerifyEmailV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/privacy` | PrivacyPage (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/players` | PlayersRoute (features/careerPlayers/CareerPlayersPage) | evet | zincir: components/ui.tsx (hex) | anonim | V3-08 (zincirde eski parça) |
| `/players/:id` | PlayerDetailRoute (features/player/CareerPlayerPage) | evet | zincir: components/ui.tsx (hex) | anonim | V3-08 (zincirde eski parça) |
| `/compare` | ComparePage (pages/ComparePage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/AttributeRadar.tsx (hex); components/ui.tsx (hex) | anonim | V3-07b |
| `/wonderkids` | WonderkidsPage (pages/WonderkidsPage) | hayır | doğrudan: ui.tsx Card · zincir: components/ui.tsx (hex) | anonim | V3-07b |
| `/tactics/builder` | → /squad/builder | — | — | — | kapsam dışı (yönlendirme) |
| `/tactics/wizard` | WizardPage (pages/WizardPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | anonim | V3-07b |
| `/squad` | SquadPage (pages/SquadPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/SquadDensity.tsx (tailwind emerald, hex); components/ui.tsx (hex); lib/dragCard.ts (hex); components/squadBuilder/PositionCard.tsx (tailwind slate/teal); lib/squadBuilder.ts (hex) | giriş | V3-07b |
| `/squad/builder` | SquadBuilderPage (pages/SquadBuilderPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/squadBuilder/PositionCard.tsx (tailwind slate/teal); components/ui.tsx (hex); features/squad/TacticCodeCard.tsx (Modal.tsx); lib/squadBuilder.ts (hex) | anonim | V3-07b |
| `/replicas` | ReplicasPage (features/replicas/ReplicasPage) | evet | zincir: components/ui.tsx (hex) | anonim | V3-08 (zincirde eski parça) |
| `/replicas/:id` | ReplicaDetailPage (features/replicas/ReplicaDetailPage) | evet | zincir: features/replicas/ApplyTab.tsx (Modal.tsx); components/ui.tsx (hex); features/squad/ut/PickBody.tsx (ui.tsx Pill, Modal.tsx) | anonim | V3-08 (zincirde eski parça) |
| `/scouting` | → /career/transfer | — | — | — | kapsam dışı (yönlendirme) |
| `/fit` | → /tactics/builder | — | — | — | kapsam dışı (yönlendirme) |
| `/recommend` | → /career/transfer | — | — | — | kapsam dışı (yönlendirme) |
| `/career/import` | CareerImportPage (features/import/CareerImportPage) | evet | zincir: components/ui.tsx (hex) | giriş | V3-07a (zincirde eski parça) |
| `/career/desk` | DeskPage (features/desk/DeskPage) | evet | zincir: components/ui.tsx (hex); features/desk/DeskSettings.tsx (ui.tsx Card); lib/squadBuilder.ts (hex) | giriş | V3-08 (zincirde eski parça) |
| `/career/new` | NewCareerPage (features/career/NewCareerPage) | evet | zincir: components/ui.tsx (hex) | giriş | V3-07a (zincirde eski parça) |
| `/career/transfer` | TransferCenterPage (features/transfer/TransferCenterPage) | evet | zincir: components/ui.tsx (hex); lib/squadBuilder.ts (hex) | giriş | V3-08 (zincirde eski parça) |
| `/career/growth` | GrowthPage (features/growth/GrowthPage) | evet | yok | giriş | tamam |
| `/teams` | TeamsPage (pages/TeamsPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | giriş | V3-07b |
| `/ut/players/:assetId` | UtPlayerPage (features/cards/UtPlayerPage) | evet | zincir: components/ui.tsx (hex) | anonim | V3-08 (zincirde eski parça) |
| `/ut/squad` | UtSquadPage (pages/UtSquadPage) | hayır | doğrudan: ui.tsx Pill · zincir: components/ui.tsx (hex); features/squad/ut/PickBody.tsx (ui.tsx Pill, Modal.tsx); features/squad/TacticCodeCard.tsx (Modal.tsx); lib/squadBuilder.ts (hex) | anonim | V3-07b |
| `/ut/meta` | UtMetaPage (pages/UtMetaPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | anonim | V3-07b |
| `/ut/sbc` | SbcListPage (features/sbc/SbcListPage) | evet | zincir: components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-08 (zincirde eski parça) |
| `/ut/sbc/:setId/:challengeId` | SbcSolvePage (features/sbc/SbcSolvePage) | evet | zincir: components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-08 (zincirde eski parça) |
| `/ut/sbc/:setId` | SbcSolvePage (features/sbc/SbcSolvePage) | evet | zincir: components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-08 (zincirde eski parça) |
| `/ut/objectives` | UtObjectivesPage (pages/UtObjectivesPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-07b |
| `/ut/club` | UtClubPage (pages/UtClubPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/PlayerAvatar.tsx (tailwind teal/slate); components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-07b |
| `/ut/import` | UtImportPage (pages/UtImportPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | anonim | V3-07b |
| `/ut/evo` | UtEvolutionsPage (pages/UtEvolutionsPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | anonim (yakalama bayrağına bağlı) | V3-07b |
| `/admin/ut` | AdminUtPage (pages/AdminUtPage) | hayır | doğrudan: ui.tsx Card/Pill · zincir: components/ui.tsx (hex) | admin | V3-08 |
| `/profile` | ProfileV3 (features/account/ProfilePage) | evet | yok | giriş | tamam |
| `/subscription` | → /profile | — | — | — | kapsam dışı (yönlendirme) |
| `/*` | → / | — | — | — | kapsam dışı (yönlendirme) |
