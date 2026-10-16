# V3-07 sayfa envanteri

Üretim: `node scripts/page-inventory.mjs` (kod taraması, 2026-10-16). Ekran görüntüleri: `screens/V3-07a/envanter/` (1280 koyu).

Özet: 39 rota · 33 sayfa (6 yönlendirme) · v3 sayfası 31 · kısmen 0 · eski 2 · eski parçası hiç olmayan 31.

Sütunlar: **v3** = rotada v3 için ayrı/yeni sayfa ve sayfa dosyasında eski işaret yok (evet), ayrı ama dosyada eski işaret var (kısmen), v2 bileşeni (hayır). **Eski bileşen** = doğrudan sayfa dosyasında ve içe aktarma zincirinde (kabuk hariç) bulunan işaretler: ui.tsx Card/Pill/Modal/Stat, Modal.tsx, PitchView, matchday.css, Tailwind emerald/teal/slate/sky, hex (kart tasarım config'i hariç). İçe aktarmalar çözülmüş yola göre tanınır (V3-07b).

| Rota | v3'te açılan bileşen | v3 | Eski bileşen | Kim görür | Önerilen task |
|---|---|---|---|---|---|
| `/` | HomeV3 (features/home/HomePage) | evet | yok | anonim | tamam |
| `/about` | AboutPage (pages/AboutPage) | hayır | yok | anonim | V3-08 |
| `/login` | LoginV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/register` | RegisterV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/verify-email` | VerifyEmailV3 (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/privacy` | PrivacyPage (features/account/AuthPages) | evet | yok | anonim | tamam |
| `/players` | PlayersRoute (features/careerPlayers/CareerPlayersPage) | evet | yok | anonim | tamam |
| `/players/:id` | PlayerDetailRoute (features/player/CareerPlayerPage) | evet | yok | anonim | tamam |
| `/compare` | CompareV3Page (features/compare/CompareV3Page) | evet | yok | anonim | tamam |
| `/wonderkids` | WonderkidsV3Page (features/wonderkids/WonderkidsV3Page) | evet | yok | anonim | tamam |
| `/tactics/builder` | → /squad/builder | — | — | — | kapsam dışı (yönlendirme) |
| `/tactics/wizard` | TacticWizardPage (features/wizard/TacticWizardPage) | evet | yok | anonim | tamam |
| `/squad` | KadroPage (features/squad/kadro/KadroPage) | evet | yok | giriş | tamam |
| `/squad/builder` | CareerSquadBuilderPage (features/squad/CareerSquadBuilderPage) | evet | yok | anonim | tamam |
| `/replicas` | ReplicasPage (features/replicas/ReplicasPage) | evet | yok | anonim | tamam |
| `/replicas/:id` | ReplicaDetailPage (features/replicas/ReplicaDetailPage) | evet | yok | anonim | tamam |
| `/scouting` | → /career/transfer | — | — | — | kapsam dışı (yönlendirme) |
| `/fit` | → /tactics/builder | — | — | — | kapsam dışı (yönlendirme) |
| `/recommend` | → /career/transfer | — | — | — | kapsam dışı (yönlendirme) |
| `/career/import` | CareerImportPage (features/import/CareerImportPage) | evet | yok | giriş | tamam |
| `/career/desk` | DeskPage (features/desk/DeskPage) | evet | zincir: features/desk/DeskSettings.tsx (ui.tsx Card) | giriş | V3-08 (zincirde eski parça) |
| `/career/new` | NewCareerPage (features/career/NewCareerPage) | evet | yok | giriş | tamam |
| `/career/transfer` | TransferCenterPage (features/transfer/TransferCenterPage) | evet | yok | giriş | tamam |
| `/career/growth` | GrowthPage (features/growth/GrowthPage) | evet | yok | giriş | tamam |
| `/teams` | TeamsV3Page (features/teams/TeamsV3Page) | evet | yok | giriş | tamam |
| `/ut/players/:assetId` | UtPlayerPage (features/cards/UtPlayerPage) | evet | yok | anonim | tamam |
| `/ut/squad` | UtSquadBuilderPage (features/squad/UtSquadBuilderPage) | evet | yok | anonim | tamam |
| `/ut/meta` | UtMetaV3Page (features/ut/meta/UtMetaV3Page) | evet | yok | anonim | tamam |
| `/ut/sbc` | SbcListPage (features/sbc/SbcListPage) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/ut/sbc/:setId/:challengeId` | SbcSolvePage (features/sbc/SbcSolvePage) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/ut/sbc/:setId` | SbcSolvePage (features/sbc/SbcSolvePage) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/ut/objectives` | UtObjectivesV3Page (features/ut/objectives/UtObjectivesV3Page) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/ut/club` | UtClubV3Page (features/ut/club/UtClubV3Page) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/ut/import` | UtImportV3Page (features/ut/import/UtImportV3Page) | evet | yok | anonim | tamam |
| `/ut/evo` | UtEvolutionsV3Page (features/ut/evo/UtEvolutionsV3Page) | evet | yok | anonim (yakalama bayrağına bağlı) | tamam |
| `/admin/ut` | AdminUtPage (pages/AdminUtPage) | hayır | doğrudan: ui.tsx Card/Pill | admin | V3-08 |
| `/profile` | ProfileV3 (features/account/ProfilePage) | evet | yok | giriş | tamam |
| `/subscription` | → /profile | — | — | — | kapsam dışı (yönlendirme) |
| `/*` | → / | — | — | — | kapsam dışı (yönlendirme) |
