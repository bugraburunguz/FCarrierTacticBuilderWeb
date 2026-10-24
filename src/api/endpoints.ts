import { api, request } from './client'
import type { CaptureRules } from '../lib/har/harCapture'
import type {
  BehaviorTag,
  CareerRecommendation,
  CareerRecommendationRequest,
  CreditCosts,
  Career,
  CareerPlayer,
  CareerPlayerContract,
  CareerPlayerFacets,
  Club,
  Credited,
  Formation,
  FitRoleResult,
  LookupItem,
  Me,
  PageResponse,
  PlayerDetail,
  PlayerSummary,
  Preset,
  ReplicaApplyBody,
  ReplicaApplyResult,
  ReplicaDetail,
  ReplicaSummary,
  UserTactic,
  Recommendation,
  ResolvedTactic,
  Role,
  RosterEvent,
  CareerMove,
  RosterEventType,
  SquadFit,
  Subscription,
  TacticRequest,
  TokenResponse,
  PlayerPositionAdvice,
  ImportSummary,
  TacticRecommendation,
  TeamProfile,
  TeamSummary,
  SimilarPlayer,
  TacticCodeExport,
  TacticCodeImport,
  SetupCheck,
  PlayerRoleFit,
  DevelopmentPlanResult,
  Wonderkid,
  MetaCard,
  MetaFormation,
  SbcPoolEntry,
  SbcResult,
  UpgradeResult,
  UtSquadEvaluation,
  CareerBackup,
  CareerSnapshot,
  CaptureResult,
  ContributionResult,
  HistoryPoint,
  PlayerTag,
  PlayerTagKind,
  SeasonRecord,
  ShortlistItem,
  SnapshotDiff,
  EaRoleOption,
  KbEvolution,
  KbItem,
  KbObjectiveGroup,
  KbPricePoint,
  KbPromo,
  KbSbcSet,
  SbcSetVotes,
  SaveUserTacticBody,
  StarterTactic,
} from './types'

export interface SetupBody {
  buildUp?: string
  depth?: number
}

export interface PlayerFilters {
  q?: string
  pos?: string[]
  ps?: string[]
  at?: string[]
  ovr_min?: number
  ovr_max?: number
  pot_min?: number
  pot_max?: number
  age_min?: number
  age_max?: number
  /** V3-06a, kariyer havuzu: değer aralığı, kiralık, oyun tarihine göre sözleşme (ay), ulaşılabilirlik kovası, rol sıralaması. */
  value_min?: number
  value_max?: number
  on_loan?: boolean
  contract_months?: number
  bucket?: string[]
  role?: string
  wf_min?: number
  sm_min?: number
  foot?: string
  club?: number
  career?: number
  team?: number
  free_agent?: boolean
  league?: number
  nat?: number
  gender?: number
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  size?: number
  attrMin?: Record<string, number>
}

function playerQuery(filters: PlayerFilters) {
  const { attrMin, ...rest } = filters
  const query: Record<string, string | number | boolean | string[] | undefined> = { ...rest }
  Object.entries(attrMin ?? {}).forEach(([attr, value]) => {
    query[`${attr}_min`] = value
  })
  return query
}

export const endpoints = {
  register: (email: string, password: string, privacyVersion?: number) => api.post<TokenResponse>('/auth/register', { email, password, privacyVersion }, false),
  login: (email: string, password: string) => api.post<TokenResponse>('/auth/login', { email, password }, false),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }, false),
  me: () => api.get<Me>('/me'),
  /** V3-07a: diğer oturumlar kapanır, bu oturum için yeni token'lar döner. */
  changePassword: (currentPassword: string, newPassword: string) => api.post<TokenResponse>('/me/password', { currentPassword, newPassword }),
  verifyEmail: (token: string) => api.post<void>('/auth/verify-email', { token }, false),
  resendVerification: () => api.post<void>('/me/email/resend'),
  subscribe: () => api.post<Subscription>('/billing/subscribe'),
  /** PROD-PREP 2: herkese açık uygulama ayarları (ücretsiz beta, günlük kredi). */
  /** PROD-PREP 4: hesabı kalıcı siler (mevcut şifre + e-posta yazma onayı). */
  deleteAccount: (password: string, emailConfirm: string) => api.post<void>('/me/delete', { password, emailConfirm }),
  /** PROD-PREP 3: aydınlatma metni bilgilendirme bandı onayı. */
  acknowledgePrivacy: (version: number) => api.post<void>('/me/privacy-ack', { version }),
  appConfig: () => api.get<{ freeBeta: boolean; dailyCredits: number }>('/config/app'),

  players: (filters: PlayerFilters) => api.get<PageResponse<PlayerSummary>>('/players', playerQuery(filters)),
  playerFacets: (careerId: number) => api.get<CareerPlayerFacets>('/players/facets', { career: careerId }),
  player: (id: number, careerId?: number) => api.get<PlayerDetail>(`/players/${id}`, { career: careerId }),
  playerRoles: (id: number, careerId?: number, engine?: 'v1' | 'v3') => api.get<PlayerRoleFit[]>(`/players/${id}/roles`, { career: careerId, engine }),
  playerContract: (id: number, careerId: number) => api.get<CareerPlayerContract>(`/players/${id}/contract`, { career: careerId }),
  playerByAsset: (assetId: number) => api.get<PlayerDetail>(`/players/asset/${assetId}`),
  /** V3-05c-c: ödül kartı adı için toplu assetId → katalog adı (bilinmeyen kimlik yanıtta yok). */
  playerAssetNames: (assetIds: number[]) => api.get<{ assetId: number; name: string }[]>('/players/assets', { id: assetIds.map(String) }),
  similarPlayers: (id: number, options: { ageMax?: number; potentialMin?: number; limit?: number } = {}) =>
    api.get<SimilarPlayer[]>(`/players/${id}/similar`, { age_max: options.ageMax, pot_min: options.potentialMin, limit: options.limit }),
  development: (id: number, body: { targetRoles?: string[]; careerId?: number } = {}) =>
    api.post<DevelopmentPlanResult>(`/players/${id}/development`, body, false),
  wonderkids: (params: { career?: number; pos?: string; maxAge?: number; minPot?: number; league?: number; budgetMax?: number; role?: string; sort?: string; gender?: number; limit?: number }) =>
    api.get<Wonderkid[]>('/wonderkids', params),
  utFormations: () => api.get<{ snapshotNote: string; formations: MetaFormation[] }>('/ut/meta/formations'),
  utTier: (pos: string, options: { gender?: number; limit?: number } = {}) =>
    api.get<MetaCard[]>('/ut/meta/tier', { pos, gender: options.gender, limit: options.limit }),
  utChemStyle: (id: number, pos?: string) => api.post<MetaCard>(`/ut/card/${id}/chemstyle?${pos ? `pos=${pos}` : ''}`, undefined, false),
  utUpgrades: (id: number, pos?: string) => api.get<UpgradeResult>(`/ut/card/${id}/upgrades`, { pos, limit: 8 }),
  sbcStreamlined: (body: { targetScore: number; minRating?: number; pool: SbcPoolEntry[] }) =>
    api.post<SbcResult>('/ut/sbc/streamlined', body),
  utSquadEvaluate: (body: {
    slots: { slotId: string; position: string; playerId?: number; roleId?: string; card?: { name?: string; overall: number; positions?: string[]; attrs: Record<string, number> } }[]
    setup?: SetupBody
  }) =>
    api.post<UtSquadEvaluation>('/ut/squad/evaluate', body, false),
  kbSbc: (params: { category?: string; active?: boolean; challenges?: boolean } = {}) => api.get<KbSbcSet[]>('/ut/kb/sbc', params),
  kbSbcSet: (id: number) => api.get<KbSbcSet>(`/ut/kb/sbc/${id}`),
  kbObjectives: () => api.get<KbObjectiveGroup[]>('/ut/kb/objectives'),
  kbEvolutions: () => api.get<KbEvolution[]>('/ut/kb/evolutions'),
  kbPromos: () => api.get<KbPromo[]>('/ut/kb/promos'),
  /** `resource`: EA kaynak kimlikleri (ör. SBC ödül oyuncuları); yalnız bunlar döner. */
  kbItems: (params: { q?: string; minRating?: number; maxRating?: number; pos?: string; type?: string; resource?: number[]; limit?: number; offset?: number }) =>
    api.get<KbItem[]>('/ut/kb/items', { ...params, resource: params.resource?.map(String) }),
  kbItem: (id: number) => api.get<{ item: KbItem; versions: KbItem[] }>(`/ut/kb/items/${id}`),
  /** V3-05d: toplu son gözlenen fiyat (yalnız katkı gözlemi; gözlemi olmayan kimlik yanıtta yok). */
  kbLatestPrices: (resourceIds: number[], platform = 'CONSOLE') =>
    api.get<{ resourceId: number; price: number; observedAt: string; lowConfidence: boolean }[]>('/ut/kb/prices', { resource: resourceIds.map(String), platform }),
  kbPrices: (id: number, platform: string, range: string) => api.get<KbPricePoint[]>(`/ut/kb/items/${id}/prices`, { platform, range }),
  eaRoles: () => api.get<EaRoleOption[]>('/tactics/ea-roles'),
  captureLink: (mode: 'PERSONAL' | 'CONTRIB') => request<{ token: string; mode: string; expiresInSeconds: number }>('/ut/capture/link', { method: 'POST', body: {}, query: { mode } }),
  sbcVotes: () => api.get<{ sets: SbcSetVotes[] }>('/ut/sbc/votes'),
  sbcVote: (setId: number, vote: number) => request<SbcSetVotes>(`/ut/sbc/votes/${setId}`, { method: 'PUT', body: { vote } }),
  utCapture: (captures: unknown[]) => api.post<CaptureResult>('/ut/capture', { captures }),
  /** Yakalama kuralları (uzantı ve HAR ayrıştırıcısının tek kaynağı). */
  captureRules: () => api.get<Partial<CaptureRules>>('/ut/capture/rules'),
  /** Bilgi tabanına katkı: uzantının CONTRIB yoluyla aynı uç; web oturumu (JWT) ile — sunucu katkıcı yetkisini ve kişisel uç süzmesini aynen uygular. */
  contribCapture: (captures: unknown[]) => api.post<ContributionResult>('/ut/contrib/capture', { captures }),
  keyAttributes: () => api.get<{ source: string; positions: Record<string, string[]> }>('/config/key-attributes'),
  clubs: (q: string, options: { league?: number; gender?: number; limit?: number } = {}) =>
    api.get<Club[]>('/clubs', { q, limit: options.limit ?? 8, league: options.league, gender: options.gender }),
  leagues: (gender?: number) => api.get<LookupItem[]>('/leagues', { gender }),
  nationalities: () => api.get<LookupItem[]>('/nationalities'),

  roles: () => api.get<Role[]>('/roles'),
  behaviorTags: (pos?: string) => api.get<BehaviorTag[]>('/behavior-tags', { pos }),
  formations: () => api.get<Formation[]>('/formations'),
  presets: (kind?: string) => api.get<Preset[]>('/presets', { kind }),
  replicas: () => api.get<ReplicaSummary[]>('/replicas'),
  replica: (id: string) => api.get<ReplicaDetail>(`/replicas/${id}`),
  replicaLegacyIds: () => api.get<Record<string, string | null>>('/replicas/legacy-ids'),
  replicaApply: (id: string, body: ReplicaApplyBody) => api.post<ReplicaApplyResult>(`/replicas/${id}/apply`, body),
  userTactics: (careerId?: number) => api.get<UserTactic[]>('/user-tactics', { careerId }),
  saveUserTactic: (slot: number, body: SaveUserTacticBody) => request<UserTactic>(`/user-tactics/${slot}`, { method: 'PUT', body }),
  /** Kariyerin ana taktiği (D-30); yoksa null. */
  mainTactic: (careerId: number) => api.get<UserTactic | null>('/user-tactics/main', { careerId }),
  setMainTactic: (slot: number, careerId: number) => request<UserTactic>(`/user-tactics/${slot}/main`, { method: 'PUT', query: { careerId } }),
  /** Ücretsiz otomatik başlangıç önerisi (D-31); kredi düşmez. */
  starterTactic: (careerId: number) => api.get<StarterTactic>(`/careers/${careerId}/starter-tactic`),
  deleteUserTactic: (slot: number, careerId?: number) => request<void>(`/user-tactics/${slot}`, { method: 'DELETE', query: { careerId } }),
  resolveTactic: (tactic: TacticRequest) => api.post<ResolvedTactic>('/tactics/resolve', tactic, false),

  fitRole: (body: { playerId: number; roleId: string; position?: string; tags?: string[]; engineVersion?: 'v1' | 'v3' }) =>
    api.post<FitRoleResult>('/fit/role', body, false),
  compare: (body: { ids: number[]; roleId: string; position?: string; tags?: string[] }) =>
    api.post<FitRoleResult[]>('/players/compare', body, false),
  positionAdvice: (careerId: number) => api.get<PlayerPositionAdvice[]>(`/advisor/positions/${careerId}`),
  recommendTactic: (body: { careerId: number; lockFormation?: string; lockPreset?: string; topN?: number; diversityMode?: string; setup?: SetupBody }) =>
    api.post<Credited<TacticRecommendation>>('/advisor/tactic', body),
  /** locked (KARIYER-UX Q2): slotId → oyuncu sabit kalır, kalan slotları sunucu doldurur. */
  lineup: (careerId: number, tactic: TacticRequest, locked?: Record<string, number>) => api.post<SquadFit>('/fit/lineup', locked ? { careerId, tactic, locked } : { careerId, tactic }),
  fitSquad: (body: { careerId: number; tactic: TacticRequest }) => api.post<Credited<SquadFit>>('/fit/squad', body),
  previewSlot: (body: { roleId: string; position: string; tags?: string[]; gender?: number; limit?: number; setup?: SetupBody }) =>
    api.post<Recommendation>('/recommend/preview', body, false),
  setupCheck: (body: { careerId: number; buildUp: string; depth: number }) => api.post<SetupCheck[]>('/fit/setup-check', body),
  exportTacticCode: (tactic: TacticRequest) => api.post<TacticCodeExport>('/tactics/export-code', tactic, false),
  importTacticCode: (code: string) => api.post<TacticCodeImport>('/tactics/import-code', { code }, false),
  careerRecommendations: (careerId: number, body: CareerRecommendationRequest) => api.post<Credited<CareerRecommendation>>(`/careers/${careerId}/recommendations`, body),
  creditCosts: () => api.get<CreditCosts>('/billing/costs'),

  careers: () => api.get<Career[]>('/careers'),
  createCareer: (body: { clubId: number; budgetEur?: number; name?: string; season?: number }) => api.post<Career>('/careers', body),
  updateCareer: (careerId: number, body: { name?: string; budgetEur?: number; season?: number; spoilerMode?: string; wageBudgetEur?: number; windowEndsOn?: string; challengeId?: string; gameDate?: string }) =>
    request<Career>(`/careers/${careerId}`, { method: 'PATCH', body }),
  importCareer: (careerId: number, form: FormData) => request<ImportSummary>(`/careers/${careerId}/import`, { method: 'POST', body: form }),
  syncSquad: (careerId: number, teamId: number) => request<{ players: number }>(`/careers/${careerId}/import/squad`, { method: 'POST', query: { teamId } }),
  careerTeams: (careerId: number, q: string) => api.get<TeamSummary[]>(`/careers/${careerId}/teams`, { q, limit: 30 }),
  careerTeam: (careerId: number, teamId: number) => api.get<TeamProfile>(`/careers/${careerId}/teams/${teamId}`),
  deleteCareer: (careerId: number) => request<void>(`/careers/${careerId}`, { method: 'DELETE' }),
  snapshots: (careerId: number) => api.get<CareerSnapshot[]>(`/careers/${careerId}/snapshots`),
  snapshotDiff: (careerId: number, from?: number, to?: number) => api.get<SnapshotDiff>(`/careers/${careerId}/snapshots/diff`, { from, to }),
  playerHistory: (careerId: number, playerId: number) => api.get<HistoryPoint[]>(`/careers/${careerId}/players/${playerId}/history`),
  updateRatings: (careerId: number, body: { updates: { playerId: number; overall: number; potential?: number }[]; note?: string }) =>
    request<CareerSnapshot>(`/careers/${careerId}/players/ratings`, { method: 'PUT', body }),
  playerTags: (careerId: number) => api.get<PlayerTag[]>(`/careers/${careerId}/tags`),
  /** `askingPriceEur` yalnız satış planında (FAZ 5); verilmezse sunucu bedeli temizler. */
  setPlayerTag: (careerId: number, playerId: number, tag: PlayerTagKind, askingPriceEur?: number) =>
    request<unknown>(`/careers/${careerId}/tags/${playerId}`, { method: 'PUT', body: askingPriceEur === undefined ? { tag } : { tag, askingPriceEur } }),
  clearPlayerTag: (careerId: number, playerId: number) => request<void>(`/careers/${careerId}/tags/${playerId}`, { method: 'DELETE' }),
  shortlist: (careerId: number) => api.get<ShortlistItem[]>(`/careers/${careerId}/shortlist`),
  shortlistAdd: (careerId: number, playerId: number, body: { note?: string; maxFeeEur?: number } = {}) => request<void>(`/careers/${careerId}/shortlist/${playerId}`, { method: 'PUT', body }),
  shortlistRemove: (careerId: number, playerId: number) => request<void>(`/careers/${careerId}/shortlist/${playerId}`, { method: 'DELETE' }),
  seasons: (careerId: number) => api.get<SeasonRecord[]>(`/careers/${careerId}/seasons`),
  putSeason: (careerId: number, season: number, body: Omit<SeasonRecord, 'season'>) => request<void>(`/careers/${careerId}/seasons/${season}`, { method: 'PUT', body }),
  careerBackup: (careerId: number) => api.get<CareerBackup>(`/careers/${careerId}/backup`),
  careerRestore: (careerId: number, backup: CareerBackup) => request<CareerBackup>(`/careers/${careerId}/backup`, { method: 'POST', body: backup }),
  squad: (careerId: number) => api.get<CareerPlayer[]>(`/careers/${careerId}/squad`),
  events: (careerId: number) => api.get<RosterEvent[]>(`/careers/${careerId}/events`),
  careerMoves: (careerId: number) => api.get<CareerMove[]>(`/careers/${careerId}/moves`),
  applyEvent: (
    careerId: number,
    body: { type: RosterEventType; playerId: number; feeEur?: number; toClubId?: number },
  ) => api.post<RosterEvent>(`/careers/${careerId}/events`, body),
  undoEvent: (careerId: number, eventId: number) =>
    request<RosterEvent>(`/careers/${careerId}/events/${eventId}`, { method: 'DELETE' }),
}
