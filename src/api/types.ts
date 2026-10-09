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
  valueEur?: number
  valuationEstimated: boolean
  faceUrl?: string
  faceAssetId?: number
  changed?: boolean
  changeSummary?: ChangeSummary
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
  badge: WeaponState
  badgeText: string
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
  depth: DepthEntry[]
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
  severity: 'RISK' | 'WARN' | 'PLUS'
  title: string
  message: string
  fix?: string
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
  badge: WeaponState
  badgeText: string
  reasons: string[]
  gaps: { attr: string; value: number; needed: number }[]
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
  formation?: string
  kind: 'SQUAD' | 'ITEM_SCORE' | string
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
}

export interface SbcChallenge {
  setId: number
  setName?: string
  challengeId: number
  name: string
  status?: string
  type?: string
  formation?: string
  formationLabel?: string
  repeatable: boolean
  timesCompleted: number
  endTime?: number
  awards: CaptureReward[]
  requirements: SbcRequirement[]
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
