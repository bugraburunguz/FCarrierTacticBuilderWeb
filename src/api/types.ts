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
  name: string
  age?: number
  overall: number
  positions: string[]
  club?: string
  league?: string
  nationality?: string
  accelerate?: string
  potential?: number
  valueEur?: number
  valuationEstimated: boolean
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
}

export interface Club {
  id: number
  name: string
  league?: string
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
  slots: FormationSlot[]
}

export interface Preset {
  id: string
  kind: 'STYLE' | 'REPLICA'
  name: string
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
  squadFit: number
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
  feeEur?: number
  createdAt?: string
  budgetEurAfter?: number
}

export interface Subscription {
  plan: string
  status: string
  startedAt?: string
  expiresAt?: string
}
