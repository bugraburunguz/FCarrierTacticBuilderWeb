import { api, request } from './client'
import type {
  BehaviorTag,
  Career,
  CareerPlayer,
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
  Recommendation,
  ResolvedTactic,
  Role,
  RosterEvent,
  RosterEventType,
  ScoutingQuery,
  ScoutingResult,
  SquadFit,
  Subscription,
  TacticRequest,
  TokenResponse,
  PlayerPositionAdvice,
  ImportSummary,
  TacticRecommendation,
  TeamProfile,
  TeamSummary,
  TransferTargetsResult,
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
  CaptureResult,
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
  register: (email: string, password: string) => api.post<TokenResponse>('/auth/register', { email, password }, false),
  login: (email: string, password: string) => api.post<TokenResponse>('/auth/login', { email, password }, false),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }, false),
  me: () => api.get<Me>('/me'),
  subscribe: () => api.post<Subscription>('/billing/subscribe'),

  players: (filters: PlayerFilters) => api.get<PageResponse<PlayerSummary>>('/players', playerQuery(filters)),
  player: (id: number, careerId?: number) => api.get<PlayerDetail>(`/players/${id}`, { career: careerId }),
  playerRoles: (id: number, careerId?: number) => api.get<PlayerRoleFit[]>(`/players/${id}/roles`, { career: careerId }),
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
    api.post<SbcResult>('/ut/sbc/streamlined', body, false),
  utSquadEvaluate: (body: {
    slots: { slotId: string; position: string; playerId?: number; roleId?: string; card?: { name?: string; overall: number; positions?: string[]; attrs: Record<string, number> } }[]
    setup?: SetupBody
  }) =>
    api.post<UtSquadEvaluation>('/ut/squad/evaluate', body, false),
  utCapture: (captures: unknown[]) => api.post<CaptureResult>('/ut/capture', { captures }),
  keyAttributes: () => api.get<{ source: string; positions: Record<string, string[]> }>('/config/key-attributes'),
  clubs: (q: string, options: { league?: number; gender?: number; limit?: number } = {}) =>
    api.get<Club[]>('/clubs', { q, limit: options.limit ?? 8, league: options.league, gender: options.gender }),
  leagues: (gender?: number) => api.get<LookupItem[]>('/leagues', { gender }),
  nationalities: () => api.get<LookupItem[]>('/nationalities'),

  roles: () => api.get<Role[]>('/roles'),
  behaviorTags: (pos?: string) => api.get<BehaviorTag[]>('/behavior-tags', { pos }),
  formations: () => api.get<Formation[]>('/formations'),
  presets: (kind?: string) => api.get<Preset[]>('/presets', { kind }),
  resolveTactic: (tactic: TacticRequest) => api.post<ResolvedTactic>('/tactics/resolve', tactic, false),

  fitRole: (body: { playerId: number; roleId: string; position?: string; tags?: string[] }) =>
    api.post<FitRoleResult>('/fit/role', body, false),
  compare: (body: { ids: number[]; roleId: string; position?: string; tags?: string[] }) =>
    api.post<FitRoleResult[]>('/players/compare', body, false),
  positionAdvice: (careerId: number) => api.get<PlayerPositionAdvice[]>(`/advisor/positions/${careerId}`),
  recommendTactic: (body: { careerId: number; lockFormation?: string; lockPreset?: string; topN?: number; diversityMode?: string; setup?: SetupBody }) =>
    api.post<Credited<TacticRecommendation>>('/advisor/tactic', body),
  lineup: (careerId: number, tactic: TacticRequest) => api.post<SquadFit>('/fit/lineup', { careerId, tactic }),
  fitSquad: (body: { careerId: number; tactic: TacticRequest }) => api.post<Credited<SquadFit>>('/fit/squad', body),
  previewSlot: (body: { roleId: string; position: string; tags?: string[]; gender?: number; limit?: number; setup?: SetupBody }) =>
    api.post<Recommendation>('/recommend/preview', body, false),
  transferTargets: (body: { careerId: number; perPosition?: number; setup?: SetupBody; slots: { position: string; roleId: string; tags?: string[] }[] }) =>
    api.post<TransferTargetsResult>('/recommend/transfer-targets', body),
  scoutingSearch: (careerId: number, body: ScoutingQuery) => api.post<ScoutingResult>(`/scouting/${careerId}/search`, body),
  setupCheck: (body: { careerId: number; buildUp: string; depth: number }) => api.post<SetupCheck[]>('/fit/setup-check', body),
  exportTacticCode: (tactic: TacticRequest) => api.post<TacticCodeExport>('/tactics/export-code', tactic, false),
  importTacticCode: (code: string) => api.post<TacticCodeImport>('/tactics/import-code', { code }, false),
  slotView: (body: {
    careerId: number
    scope: 'SQUAD' | 'LEAGUE' | 'MARKET'
    slot: { roleId: string; position: string; tags?: string[]; leagueId?: number; limit?: number; setup?: SetupBody }
  }) => api.post<Recommendation>('/recommend/slot-view', body),
  recommendSlot: (body: {
    careerId?: number
    roleId: string
    position: string
    tags?: string[]
    budgetMax?: number
    setup?: SetupBody
    currentPlayerId?: number
    limit?: number
  }) => api.post<Credited<Recommendation>>('/recommend/slot', body),

  careers: () => api.get<Career[]>('/careers'),
  createCareer: (body: { clubId: number; budgetEur?: number; name?: string }) => api.post<Career>('/careers', body),
  updateCareer: (careerId: number, body: { name?: string; budgetEur?: number; season?: number }) =>
    request<Career>(`/careers/${careerId}`, { method: 'PATCH', body }),
  importCareer: (careerId: number, form: FormData) => request<ImportSummary>(`/careers/${careerId}/import`, { method: 'POST', body: form }),
  syncSquad: (careerId: number, teamId: number) => request<{ players: number }>(`/careers/${careerId}/import/squad`, { method: 'POST', query: { teamId } }),
  careerTeams: (careerId: number, q: string) => api.get<TeamSummary[]>(`/careers/${careerId}/teams`, { q, limit: 30 }),
  careerTeam: (careerId: number, teamId: number) => api.get<TeamProfile>(`/careers/${careerId}/teams/${teamId}`),
  deleteCareer: (careerId: number) => request<void>(`/careers/${careerId}`, { method: 'DELETE' }),
  squad: (careerId: number) => api.get<CareerPlayer[]>(`/careers/${careerId}/squad`),
  events: (careerId: number) => api.get<RosterEvent[]>(`/careers/${careerId}/events`),
  applyEvent: (
    careerId: number,
    body: { type: RosterEventType; playerId: number; feeEur?: number; toClubId?: number },
  ) => api.post<RosterEvent>(`/careers/${careerId}/events`, body),
  undoEvent: (careerId: number, eventId: number) =>
    request<RosterEvent>(`/careers/${careerId}/events/${eventId}`, { method: 'DELETE' }),
}
