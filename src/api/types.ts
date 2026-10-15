export interface ApiErrorItem {
  code: string
  message: string
}

export interface Envelope<T> {
  success: boolean
  data?: T
  message?: string
  error?: ApiErrorItem[]
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
}

export type WeaponState = 'GREEN' | 'YELLOW' | 'RED'

export interface PlayerSummary {
  id: number
  clubId?: number
  gender?: number
  preferredFoot?: string
  weakFoot?: number
  skillMoves?: number
  name: string
  age?: number
  overall: number
  positions: string[]
  club?: string
  league?: string
  nationality?: string
  accelerate?: string
  runStyle?: number
  potential?: number
  potentialRange?: string
  valueEur?: number
  valuationEstimated: boolean
  faceUrl?: string
  faceAssetId?: number
  /** Yüz istatistikleri (F10): saha PAC/SHO/PAS/DRI/DEF/PHY, kaleci DIV/HAN/KIC/REF/SPD/POS. Kaynak OFFICIAL ya da COMPUTED. */
  faceStats?: number[]
  faceLabels?: string[]
  faceStatsSource?: 'OFFICIAL' | 'COMPUTED'
  /** true: hesaplanan değer, ağırlıkları doğrulanmamış formülden (arayüzde "≈"). */
  faceStatsApproximate?: boolean
  changed?: boolean
  changeSummary?: ChangeSummary
  /** V3-06a, yalnız kariyer havuzu: sözleşme bitişi (kayıtta varsa), kiralık, ulaşılabilirlik kovası, seçili rol uyumu (FitEngineV3). */
  contractUntil?: string
  onLoan?: boolean
  feasibility?: FeasibilityBucket
  roleFit?: number
}

export type FeasibilityBucket = 'ALINABILIR' | 'ZOR' | 'HAYAL'

/** V3-06a: kariyer listesinde hangi süzgeçlerin verisi var. Bütçe/oyun tarihi yoksa alan gelmez (0 değil, ENG-02). */
export interface CareerPlayerFacets {
  gameDate?: string
  budgetEur?: number
  contractData: boolean
  loanData: boolean
  /** V3-06c: kullanıcının ligi ve lig gücü (OVR) — yalnız "Lig seviyesi" göstergesi; bilinmiyorsa yok. */
  leagueName?: string
  leagueOvr?: number
}

export type ChangeType = 'UPGRADE' | 'DOWNGRADE' | 'MIXED' | 'NEW' | 'REMOVED' | 'TRANSFER'

export interface ChangeSummary {
  type: ChangeType
  ovrDelta?: number
  count: number
  versionNo?: number
}

export interface PlayerDiff {
  versionNo?: number
  previousVersionNo?: number
  importedAt?: string
  changeType: ChangeType
  overall?: { old: number; new: number; delta: number }
  potential?: { old: number; new: number; delta: number }
  positions?: { old?: string; new?: string }
  acceleRate?: { old?: string; new?: string }
  club?: { old?: string; new?: string }
  attributes: { key: string; old: number; new: number; delta: number }[]
  playStyles?: { added: string[]; removed: string[]; upgraded: { from: string; to: string }[]; downgraded: { from: string; to: string }[] }
}

export interface PlayerDetail {
  summary: PlayerSummary
  preferredFoot?: string
  heightCm?: number
  weightKg?: number
  weakFoot?: number
  skillMoves?: number
  attrs: Record<string, number>
  playstyles: Record<string, number>
  positionOveralls?: Record<string, number>
  diff?: PlayerDiff
}

export interface Club {
  id: number
  name: string
  leagueId?: number
  league?: string
  gender?: number
}

export interface LookupItem {
  id: number
  name: string
  gender?: number
  count: number
}

export interface RoleWeapon {
  attr: string
  hardMin: number
  target: number
}

export interface Role {
  id: string
  baseRole: string
  name: string
  positions: string[]
  focus: string
  weapons: RoleWeapon[]
  accelerate: string[]
  movementTags: string[]
}

export interface BehaviorTag {
  id: string
  position: string
  label: string
  weaponAttrs: string[]
  expectedMin: number
  roleVote?: string
  modifier: boolean
  conflicts: string[]
  nlg?: string
  accelerateHint?: string
}

export interface FormationSlot {
  slotId: string
  position: string
  group: string
  defaultRole: string
  x: number
  y: number
}

export interface Formation {
  id: string
  label?: string
  eaFormationId?: string
  eaLabel?: string
  futggName?: string
  displayNameTr?: string
  displayNameEn?: string
  usage?: { community: number; pro: number; asOf: string }
  slots: FormationSlot[]
}

export interface Preset {
  id: string
  kind: 'STYLE' | 'REPLICA' | 'PERSONAL'
  name: string
  club?: string
  coach?: string
  season?: string
  formation: string
  signature?: string
  roleHints?: Record<string, string>
  slotTags?: Record<string, string[]>
  sourceNote?: string
  settings?: Record<string, unknown>
}

export interface SlotSelection {
  slotId: string
  tags: string[]
  roleId?: string
}

export interface TacticRequest {
  formation?: string
  presetId?: string
  slots: SlotSelection[]
  setup?: { buildUp: string; depth: number }
}

export interface ResolvedSlot {
  slotId: string
  position: string
  group: string
  roleId: string
  roleName: string
  tags: string[]
  lockedTags: string[]
}

export interface ResolvedTactic {
  formation: string
  presetId?: string
  slots: ResolvedSlot[]
}

export interface WeaponCheck {
  attr: string
  value: number
  hardMin: number
  effectiveMin: number
  target: number
  playstylePlusCompensated: boolean
  state: WeaponState
  penalty: number
}

export interface RoleFit {
  playerId: number
  playerName: string
  roleId: string
  roleName: string
  score: number
  projectedRating: number
  badge?: WeaponState | null
  badgeText?: string
  /** v3 (E3-5): currentFit = score; levelFit seviye-normalize; fitLabel GOOD|AT_LEVEL|WEAK|WRONG_ROLE (AT_LEVEL → badge boş) */
  engineVersion?: string
  currentFit?: number
  levelFit?: number
  fitLabel?: 'GOOD' | 'AT_LEVEL' | 'WEAK' | 'WRONG_ROLE'
  contributions?: { term: string; key: string; points: number }[]
  narrative?: FitNarrative
  outOfPosition: boolean
  reasons: string[]
  weaponChecks: WeaponCheck[]
}

export interface TagCheck {
  tagId: string
  label: string
  attr: string
  value: number
  expected: number
  ratio: number
  ok: boolean
  state: WeaponState
  note: string
}

export interface IntentFit {
  playerId: number
  score: number
  perTag: TagCheck[]
}

export interface FitRoleResult {
  roleFit: RoleFit
  intentFit?: IntentFit
}

export interface ScoutQuery {
  positions: string[]
  minAttrs: Record<string, number>
  accelerate: string[]
}

export interface DepthEntry {
  playerId: number
  playerName: string
  combined: number
  roleFitScore: number
  badge: WeaponState
}

export interface SlotAssignment {
  slotId: string
  position: string
  roleId: string
  roleName: string
  tags: string[]
  playerId?: number
  playerName?: string
  overall?: number
  combined?: number
  roleFit?: RoleFit
  intentFit?: IntentFit
  depth?: DepthEntry[]
}

export interface WeakLink {
  slotId: string
  playerId?: number
  playerName?: string
  roleId: string
  score: number
  badge: WeaponState
  sentence: string
  scoutQuery?: ScoutQuery
}

export interface RuleFinding {
  ruleId: string
  severity: 'RISK' | 'WARN' | 'INFO' | 'PLUS'
  title: string
  message: string
  fix?: string
  /** Analiz motoru (E3-7): sayısal kanıt (metrik, değer, işlem, eşik). */
  evidence?: { metric: string; value: number; op: string; threshold: number; params?: Record<string, unknown> }[]
}

export interface SquadFit {
  mirrored?: boolean
  squadFit: number
  setupDelta?: number
  intentFit?: number
  summary: string
  slots: SlotAssignment[]
  weakLinks: WeakLink[]
  rules: RuleFinding[]
  attackPattern: string
  bench: number[]
}

export interface Credited<T> {
  result: T
  charged: number
  balance?: number
}

export interface RecommendationItem {
  player?: PlayerSummary
  roleFit: RoleFit
  intentFit?: IntentFit
  combined: number
  deltaVsCurrent?: number
}

export interface Recommendation {
  roleId: string
  position: string
  budgetMax?: number
  current?: RecommendationItem
  items: RecommendationItem[]
  scoutQuery?: ScoutQuery
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInSeconds: number
}

export interface Me {
  id: number
  email: string
  subscriptionType: 'FREE' | 'PREMIUM'
  creditBalance?: number
  dailyCreditLimit: number
  showAds: boolean
  role?: 'USER' | 'ADMIN'
  emailVerified?: boolean
  emailVerificationRequired?: boolean
  createdAt?: string
}

export interface Career {
  id: number
  name?: string
  gender?: number
  gameVersionId: number
  clubId: number
  clubName?: string
  season?: number
  budgetEur?: number
  squadSize: number
  createdAt?: string
  spoilerMode?: 'SHOW' | 'SCOUT_RANGE'
  wageBudgetEur?: number
  windowEndsOn?: string
  /** Kariyerin oyun içi tarihi (BE-BUG-18); yaş filtreleri buna göre çalışır. */
  gameDate?: string
  challengeId?: string
}

export interface CareerSnapshot {
  id: number
  takenAt: string
  season?: number
  transferWindow?: string
  source: 'IMPORT' | 'MANUAL' | 'OCR'
  playerCount: number
  note?: string
}

export interface SnapshotDiffRow {
  playerId: number
  name: string
  kind: 'CHANGED' | 'TRANSFER' | 'NEW' | 'REMOVED'
  overallFrom?: number
  overallTo?: number
  potentialFrom?: number
  potentialTo?: number
  teamFrom?: number
  teamTo?: number
}

export interface SnapshotDiff {
  fromSnapshot?: number
  toSnapshot?: number
  changed: number
  transfers: number
  added: number
  removed: number
  rows: SnapshotDiffRow[]
}

export interface HistoryPoint {
  snapshotId: number
  takenAt: string
  season?: number
  overall: number
  potential: number
  teamId?: number
}

export type PlayerTagKind = 'LOCKED' | 'ROTATION' | 'DEVELOPING' | 'FOR_SALE' | 'LOAN_OK'

export interface ShortlistItem {
  playerId: number
  /** Gömülü oyuncu özeti (WEB-BUG-13); katalogdan kalkmış oyuncuda yok. */
  player?: PlayerSummary
  note?: string
  maxFeeEur?: number
  createdAt?: string
}

export interface SeasonRecord {
  season: number
  leaguePosition?: number
  trophies: string[]
  topScorerId?: number
  note?: string
}

export interface CareerBackup {
  version: number
  name?: string
  season?: number
  budgetEur?: number
  spoilerMode?: string
  wageBudgetEur?: number
  challengeId?: string
  tags: { playerId: number; tag: PlayerTagKind }[]
  shortlist: ShortlistItem[]
  seasons: SeasonRecord[]
}

export interface CareerPlayer {
  player: PlayerSummary
  onLoan: boolean
  loanedOut?: boolean
  dynamicPotential?: number
  valueEur?: number
  form?: number
  acquiredAt?: string
}

export type RosterEventType = 'BUY' | 'SELL' | 'LOAN_IN' | 'LOAN_OUT' | 'PROMOTE'

export interface RosterEvent {
  id: number
  type: RosterEventType
  playerId: number
  playerName?: string
  feeEur?: number
  fromClubId?: number
  fromClubName?: string
  toClubId?: number
  toClubName?: string
  createdAt?: string
  budgetEurAfter?: number
}

export interface Subscription {
  plan: string
  status: string
  startedAt?: string
  expiresAt?: string
}

export interface ImportSummary {
  players: number
  generatedPlayers?: number
  unmatchedPlayers: number
  teams: number
  freeAgents: number
  guessedTeamId?: number
  guessedTeamName?: string
  squadSynced?: number
  skippedNoPosition?: number
  warnings?: string[]
}

export interface TeamSummary {
  teamId: number
  name: string
  league?: string
  gender?: number
  overall?: number
  attack?: number
  midfield?: number
  defence?: number
  playerCount: number
}

export interface TeamProfile {
  team: TeamSummary
  rivalTeamId?: number
  rivalTeamName?: string
  averageAge?: number
  strengths: string[]
  weaknesses: string[]
  culture: string[]
  topPlayers: PlayerSummary[]
}

export interface PositionOption {
  position: string
  roleName: string
  score: number
  natural: boolean
  reasons?: string[]
}

export interface PlayerPositionAdvice {
  playerId: number
  playerName: string
  listedPositions: string[]
  best: PositionOption[]
  note?: string
  ownPositionBest: boolean
  bestOverallPosition?: string
  bestOverall?: number
}

export interface RankedItem {
  id: string
  label: string
  pct: number
  note?: string
}

export interface TacticCombo {
  formation: string
  formationLabel: string
  presetId: string
  presetName: string
  pct: number
  squadFit: number
  intentFit?: number
  feasibility: number
  mirrored?: boolean
  reasons: string[]
  weakLinks: WeakLink[]
  tactic: TacticRequest
}

export interface TacticRecommendation {
  formations: RankedItem[]
  presets: RankedItem[]
  bestCombos: TacticCombo[]
  evaluated: number
}

export type Acquisition = 'FREE' | 'LOAN' | 'BUY'

export interface TransferTarget {
  player: PlayerSummary
  roleFit: RoleFit
  combined: number
  acquisition: Acquisition
  reason: string
}

export interface PositionTargets {
  position: string
  roleId: string
  targets: TransferTarget[]
}

export interface TransferTargetsResult {
  squadAverage?: number
  budgetEur?: number
  positions: PositionTargets[]
}

export interface SimilarPlayer {
  player: PlayerSummary
  similarity: number
}

export interface PlayerRoleFit {
  position: string
  roleId: string
  roleName: string
  focus?: string
  score: number
  projectedRating: number
  badge?: WeaponState | null
  badgeText: string
  reasons: string[]
  gaps: { attr: string; value: number; needed: number }[]
  levelFit?: number
  currentFit?: number
  engineVersion?: string
  fitLabel?: 'GOOD' | 'AT_LEVEL' | 'WEAK' | 'WRONG_ROLE'
  narrative?: FitNarrative
}

/** V3-06b: kariyer oyuncu sayfası, Sözleşme ve değer. Veri yoksa alan gelmez (0 değil, ENG-02). */
export interface CareerPlayerContract {
  inSquad: boolean
  valueEur?: number
  valuationEstimated: boolean
  wageEur?: number
  releaseClauseEur?: number
  contractUntil?: string
  gameDate?: string
  monthsLeft?: number
  onLoan: boolean
  feasibility?: FeasibilityBucket
  budgetEur?: number
  budgetAfterPurchaseEur?: number
}

export interface SetupCheck {
  title: string
  status: WeaponState
  detail: string
  players: { id: number; name: string; position: string; value: number; ok: boolean }[]
}

export interface TacticCodeExport {
  code: string
  formation: string
  exact: boolean
  warnings: string[]
}

export interface TacticCodeImport {
  formation: string
  buildUp: string
  depth: number
  slots: { slotId: string; roleId: string; roleName: string }[]
  exact: boolean
  warnings: string[]
}

export interface RecommendationSetupFields {
  setupDelta?: number
}

export interface DevelopmentGap {
  attr: string
  value: number
  needed: number
  gap: number
  maxGain: number
  closable: boolean
  hardToTrain: boolean
}

export interface RoleDevelopment {
  roleId: string
  roleName: string
  position: string
  focus?: string
  currentScore: number
  currentBadge: WeaponState
  gaps: DevelopmentGap[]
  totalGap: number
  projectedScore: number
  projectedBadge: WeaponState
  projectedRating: number
  unlocks: boolean
}

export interface TrainingPriority {
  attr: string
  totalGap: number
  roles: number
  hardToTrain: boolean
}

export interface DevelopmentPlanResult {
  playerId: number
  playerName: string
  age?: number
  overall: number
  potential?: number
  headroom: number
  estimated: boolean
  perRole: RoleDevelopment[]
  bestPath?: RoleDevelopment
  trainingPriorities: TrainingPriority[]
}

export interface Wonderkid {
  id: number
  name: string
  age?: number
  overall: number
  potential: number
  gap: number
  positions: string[]
  club?: string
  league?: string
  valueEur?: number
  potentialPerMillion?: number
  roleId?: string
  roleName?: string
  rolePosition?: string
  roleScore?: number
  roleBadge?: WeaponState
  projectedBadge?: WeaponState
}

export interface MetaFormation {
  id: string
  share?: number
  note: string
  buildUp: string
  lineHeight: string
  keyRoles: string[]
}

export interface ChemStyleResult {
  style: string
  metaRating: number
  delta: number
  tier: string
}

export interface MetaCard {
  id: number
  name: string
  age?: number
  overall: number
  position: string
  metaRating: number
  tier: string
  bestChemStyle?: string
  chemStyles?: ChemStyleResult[]
  assumption: boolean
}

export type SbcRarity = 'REGULAR' | 'TOTW' | 'HERO' | 'ICON'

export interface SbcPoolEntry {
  rating: number
  rarity: SbcRarity
  count: number
  untradeable: boolean
  priceEach?: number
}

export interface SbcPick {
  rating: number
  rarity: SbcRarity
  untradeable: boolean
  count: number
  scoreEach: number
  priceEach?: number
  totalScore: number
  totalCost: number
}

export interface SbcResult {
  feasible: boolean
  targetScore: number
  totalScore: number
  overshoot: number
  totalCost: number
  itemCount: number
  coinless: boolean
  approximate: boolean
  picks: SbcPick[]
  maxReachableScore?: number
  note?: string
}

export interface UpgradeOption {
  card: MetaCard
  deltaMeta: number
  deltaOverall: number
}

export interface UpgradeResult {
  current: MetaCard
  options: UpgradeOption[]
  note?: string
}

export interface UtSlotEvaluation {
  slotId: string
  position: string
  card: MetaCard
  roleId?: string
  roleName?: string
  roleFit?: number
  badge?: WeaponState
  badgeText?: string
  reason?: string
  setupDelta?: number
}

export interface UtSquadEvaluation {
  slots: UtSlotEvaluation[]
  averageMeta: number
  averageOverall: number
  assumption: boolean
}

export interface CaptureCard {
  instanceId: number
  assetId: number
  name?: string
  rating: number
  position?: string
  positions: string[]
  rarity?: string
  rarityId?: number
  cardType?: 'ICON' | 'HERO' | 'HOF'
  teamId: number
  leagueId: number
  nation: number
  gender?: number
  playerId?: number
  club?: string
  league?: string
  nationality?: string
  attrs?: Record<string, number>
  untradeable: boolean
  faceLabels: string[]
  faceStats: number[]
  lastSalePrice?: number
  marketMin?: number
  marketMax?: number
  marketAverage?: number
  duplicate: boolean
  pile: string
  faceUrl?: string
  skillMoves?: number
  weakFoot?: number
}

export interface CaptureReward {
  type?: string
  value?: number
  count: number
  /** V3-05c-c: ödül kartıysa EA verisinin yalnız izinli 9 alanı (sunucu allowlist'i). */
  item?: RewardItem
}

/** EA ödül kartı (allowlist): kart örneği kimliği, sahip, fiyat, sözleşme vb. hiç gelmez. */
export interface RewardItem {
  resourceId?: number
  assetId?: number
  rating?: number
  preferredPosition?: string
  possiblePositions?: string[]
  rareflag?: number
  nation?: number
  leagueId?: number
  teamid?: number
}

export interface CaptureObjective {
  id: number
  name?: string
  description?: string
  progress: number
  total: number
  status?: string
  lockedBy: number[]
  rewards: CaptureReward[]
}

export interface CaptureObjectiveGroup {
  groupId: number
  name?: string
  gameMode?: string
  status?: string
  startTime?: number
  endTime?: number
  rewards: CaptureReward[]
  objectives: CaptureObjective[]
}

export interface SbcSetVotes {
  setId: number
  up: number
  down: number
  /** 1 beğendi, -1 beğenmedi, 0 oy yok. */
  mine: number
}

export interface KbSbcChallenge {
  id: number
  setId: number
  name: string
  /** Bizim formasyon kimliği (EA kodu eşlenmişse). */
  formation?: string
  /** V3-05d-b: EA ham formasyon kodu (eşlenmese de saklı) ve EA görev tipi (ONE_CLICK_CHALLENGE, OPEN_CHALLENGE, BRICK_CHALLENGE). */
  eaFormation?: string
  eaType?: string
  kind: 'SQUAD' | 'ITEM_SCORE' | 'SINGLE_ITEM' | string
  requirements: SbcRequirement[]
  itemScoreTarget?: number
  reward?: CaptureReward[] | null
}

export interface KbSbcSet {
  id: number
  name: string
  description?: string
  category: string
  repeatable?: number
  startsAt?: string
  endsAt?: string
  reward: unknown
  status: 'PENDING' | 'CONFIRMED' | 'RETIRED'
  challengeCount: number
  challenges?: KbSbcChallenge[]
  /** Set ilk görüldüğünde (V35); eski kayıtlarda ilk güncelleme anı. */
  firstSeenAt?: string
  /** İçerik özeti son değiştiğinde; değişmediyse yok. */
  contentChangedAt?: string
}

export interface KbObjectiveGroup {
  id: number
  name: string
  gameMode?: string
  startsAt?: string
  endsAt?: string
  reward?: CaptureReward[] | null
  objectives: { id: number; name?: string; description?: string; total: number; lockedBy: number[]; rewards: CaptureReward[] }[]
  status: string
}

export interface KbEvolution {
  id: number
  name: string
  cost?: unknown
  requirements?: Record<string, unknown>
  levels?: unknown
  startsAt?: string
  endsAt?: string
  status: string
}

export interface KbPromo {
  id: number
  code: string
  name: string
  startsAt?: string
  endsAt?: string
}

export interface KbItem {
  id: number
  eaAssetId: number
  eaResourceId: number
  name: string
  rating: number
  position: string
  altPositions: string[]
  clubId?: number
  leagueId?: number
  nationId?: number
  cardType: string
  rare: boolean
  promo?: string
  weakFoot?: number
  skillMoves?: number
  accelerate?: string
  untradeableOnly: boolean
  status: string
}

export interface KbPricePoint {
  bucket: string
  p10?: number
  p50?: number
  minBin?: number
  lowConfidence?: boolean
  samples: number
}

export interface EaRoleOption {
  position: string
  baseRole: string
  focus: string
}

export interface SbcRef {
  kind: 'CLUB' | 'LEAGUE' | 'NATION' | string
  id: number
  name?: string
}

export interface SbcRequirement {
  kind: string
  op: 'MIN' | 'MAX' | 'EXACT' | string
  value?: number
  level?: number
  refs?: SbcRef[]
  /** Aynı slottaki PLAYER_COUNT (parser v2). */
  count?: number
  /** Ham elgReq girdileri; bilinmeyen şartın tipi buradadır. */
  raw?: { type?: string; eligibilityValue?: number }[]
  /** V3-05c-c: kind UNKNOWN iken EA'nın tip adı (arayüz "Bilinmeyen şart" çipi). */
  eaType?: string
}

export interface SbcChallenge {
  setId: number
  setName?: string
  challengeId: number
  name: string
  status?: string
  type?: string
  /** Bilgi tabanından gelen challenge türü ('ITEM_SCORE' = hedef skor tipi). */
  kind?: string
  /** Hedef SBC skoru (ITEM_SCORE). */
  pointsRequired?: number
  formation?: string
  formationLabel?: string
  repeatable: boolean
  timesCompleted: number
  endTime?: number
  awards: CaptureReward[]
  requirements: SbcRequirement[]
}

/** POST /ut/contrib/capture sonucu. */
export interface ContributionResult {
  created: number
  updated: number
  unchanged: number
  queued: number
  pricesRecorded: number
  pricesSkipped: number
}

export interface CaptureResult {
  stats: {
    received: number
    processed: number
    stripped: number
    ignored: number
    invalid: number
    byKind: Record<string, number>
    definitionNames: number
    definitionsTruncated: boolean
    warnings: string[]
  }
  cards: CaptureCard[]
  activeSquad?: {
    formation?: string
    formationLabel?: string
    chemistry?: number
    name?: string
    slots: { index: number; starter: boolean; position?: string; chemistry?: number; card?: CaptureCard }[]
    tactic?: { tacticName?: string; formation?: string; instructions?: { index: number; value: number }[]; styles?: { index: number; value: number }[] }
  }
  squads: { id: number; name?: string; formationLabel?: string; rating?: number; chemistry?: number }[]
  prices: { source: string; assetId: number; name?: string; rating: number; buyNow?: number; currentBid?: number; startingBid?: number; lastSale?: number; card?: CaptureCard }[]
  objectives: CaptureObjectiveGroup[]
  sbcSets: { setId: number; name?: string; category?: string; challengesCount: number; challengesCompleted: number; repeatable: boolean; endTime?: number }[]
  evolutions: { id: number; name?: string; status?: string; levels: number }[]
  coins?: number
  currencies: { name: string; funds: number }[]
  config: { formations: { id: number; name: string; label: string; positionNames: string[] }[] }
  unknownPaths?: string[]
  sbcChallenges?: SbcChallenge[]
}

export type Feasibility = 'REALISTIC' | 'AMBITIOUS' | 'UNREALISTIC'

export interface ScoutingCandidate {
  player: PlayerSummary
  roleFit: RoleFit
  combined: number
  acquisition: Acquisition
  feasibility: Feasibility
  estimatedFee?: number
  valueSource: 'IMPORT' | 'MODELED'
  valueRatio?: number
  opportunity: number
  potential: boolean
}

export interface ScoutingResult {
  squadAverage?: number
  budgetEur?: number
  hiddenUnrealistic: number
  items: ScoutingCandidate[]
}

export interface ScoutingQuery {
  position: string
  roleId: string
  tags?: string[]
  setup?: { buildUp?: string; depth?: number }
  ageMax?: number
  potentialMin?: number
  potentialMax?: number
  overallMin?: number
  overallMax?: number
  leagueId?: number
  clubId?: number
  dream?: boolean
  sort?: 'fit' | 'opportunity' | 'potential'
  limit?: number
}

/** E3-8: rol uyumu anlatımı. Cümleler sunucuda yalnız katkı/kanıt sayılarından üretilir; tailored ("Biçilmiş kaftan") kararını sunucu verir (levelFit eşiği), web eşik bilmez. */
export interface FitNarrative {
  headline: string
  tailored: boolean
  strengths: { text: string; term: string; key: string; points: number }[]
  weaknesses: { text: string; term: string; key: string; points: number }[]
}

/** E3-6b/6c/10: kariyer öneri hattı (`POST /careers/{id}/recommendations`). */
export type RecommendBucket = 'ALINABILIR' | 'ZOR' | 'HAYAL'
export type RecommendProfile = 'BALANCED' | 'NOW' | 'FUTURE'
export type RecommendRoleSource = 'TACTIC' | 'SQUAD' | 'REQUEST' | 'DEFAULT' | 'ALTERNATIVES'

export interface RecommendBucketFactor {
  name: string
  value: string
  points: number
  note: string
}

export interface RecommendContribution {
  term: string
  key: string
  points: number
}

export interface CareerRecommendationItem {
  player: PlayerSummary
  roleId: string
  roleName: string
  focus?: string
  currentFit: number
  levelFit?: number
  fitLabel?: 'GOOD' | 'AT_LEVEL' | 'WEAK' | 'WRONG_ROLE'
  /** SCOUT_RANGE modunda sunucu göndermez. */
  futureFit?: number
  projectedRating?: number
  deltaVsCurrent?: number
  positionLabel?: string
  clubStrength?: number
  clubStrengthGap?: number
  ovrGap?: number
  bucket: RecommendBucket
  bucketLabel: string
  bucketPoints: number
  bucketFactors: RecommendBucketFactor[]
  narrative?: FitNarrative
  pros: RecommendContribution[]
  cons: RecommendContribution[]
  tags: ('FREE' | 'YOUNG' | 'READY')[]
  rankScore: number
}

export interface CareerRecommendation {
  position: string
  roleId?: string
  roleName?: string
  focus?: string
  roleSource: RecommendRoleSource
  profile: RecommendProfile
  poolSize: number
  scored: number
  userClubStrength?: number
  userFirstElevenAverage?: number
  current?: { playerId: number; playerName: string; roleId: string; currentFit: number }
  items: CareerRecommendationItem[]
  longShots?: CareerRecommendationItem[]
}

export interface CareerRecommendationRequest {
  position: string
  slotId?: string
  roleId?: string
  focus?: string
  forceRole?: boolean
  alternativeRoles?: boolean
  profile?: RecommendProfile
  limit?: number
  ageMax?: number
  budgetEur?: number
  budgetUnknown?: boolean
  includeLongShots?: boolean
}

export interface CreditCosts {
  recommend: number
  squadFit: number
  advisor: number
}

// ── Replikalar (E3-9 / REP-04, REP-07) ────────────────────────────────────────────────────────────────────────────────

export type ReplicaCategory = 'UCL_WINNER' | 'LEGENDARY_SQUAD' | 'LEGENDARY_COACH' | 'UNDERRATED_COACH' | 'TURKISH_BIG4' | 'TURKISH_CHAMPION'
export type ReplicaBuildUp = 'SHORT_PASSING' | 'BALANCED' | 'COUNTER'
export type ReplicaApproach = 'DEEP' | 'BALANCED' | 'HIGH' | 'AGGRESSIVE'

export interface ReplicaRoleSlot {
  slotId: string
  position: string
  role: string
  focus: string
  roleId: string
}

export interface ReplicaSummary {
  id: string
  category: ReplicaCategory
  club: string
  coach: string
  season: string
  formationId: string
  eaFormation: string
  buildUp: ReplicaBuildUp
  defensiveApproach: ReplicaApproach
  lineHeight: number
  fidelity: number | null
  tacticCode: string
  slots: ReplicaRoleSlot[]
  eaOrderedSlots: ReplicaRoleSlot[]
  /** Uyarı + risk bulgusu sayısı (bilgi sayılmaz). */
  attentionCount: number
}

export interface TacticEvidence {
  metric: string
  params: Record<string, unknown>
  value: number
  op: string
  threshold: number
  reference?: number | null
  margin?: number | null
}

export interface TacticFinding {
  code: string
  title: string
  severity: 'INFO' | 'WARN' | 'RISK'
  instance: { side?: string; sideTr?: string }
  evidence: TacticEvidence[]
  recommendation?: { code: string; text: string }
  text: string
}

export interface TacticAnalysis {
  metrics: { band: string; depth: number }
  findings: TacticFinding[]
  notEvaluated: { code: string; reason: string }[]
  levelLabel?: string | null
}

export interface ReplicaDetailSlot {
  slot: string
  position: string
  role: string
  focus: string
  profile?: string
  keyAttributes?: string[]
  keyPlayStyles?: string[]
}

export interface ReplicaDetail {
  id: string
  category: ReplicaCategory
  club: string
  coach: string
  season: string
  honours?: string[]
  whyIconic?: string
  realShape?: { inPossession?: string; outOfPossession?: string; keyMechanisms?: string[] }
  fc27: {
    formation: string
    buildUp: ReplicaBuildUp
    defensiveApproach: ReplicaApproach
    lineHeight: number
    slots: ReplicaDetailSlot[]
    planB?: { label: string; formation: string; buildUp: string; defensiveApproach: string; lineHeight: number; changes: string[] }
    smartTactics?: string[]
  }
  replicaFidelity?: { score: number; cannotReplicate?: string[] }
  /** Yalnız yönetici görünümünde gelir. */
  sources?: string[]
  verify?: string[]
  /** false: kaynaklar doğrulanmadı (iç notlar yalnız yönetici görünümünde). */
  verified?: boolean
  tacticCode: string
  analysis: TacticAnalysis
}

export type ReplicaSlotState = 'GOOD' | 'AT_LEVEL' | 'WEAK' | 'WRONG_ROLE' | 'EMPTY'

export interface ReplicaApplySlot {
  slotId: string
  position: string
  roleId: string
  roleName: string
  focus: string
  player: PlayerSummary | null
  currentFit: number | null
  levelFit: number | null
  state: ReplicaSlotState
  badgeText: string | null
  suggest: boolean
  /** Oyuncu bu mevkide doğal değil; playerPosition asıl mevkisi ("ST→LW" etiketi). */
  outOfPosition: boolean
  playerPosition: string | null
}

export interface ReplicaApplyResult {
  replicaId: string
  source: 'CAREER' | 'UT' | 'SAMPLE'
  squadFit: number
  slots: ReplicaApplySlot[]
  analysis: TacticAnalysis
}

export interface ReplicaApplyBody {
  careerId?: number
  playerIds?: number[]
}

export interface UserTactic {
  slot: number
  careerId: number | null
  name: string
  formation: string
  buildUp: string | null
  defensiveApproach: string | null
  lineHeight: number | null
  slots: { slot: string; position: string; roleId: string; focus: string }[]
  eaCode: string | null
  sourceReplicaId: string | null
}
