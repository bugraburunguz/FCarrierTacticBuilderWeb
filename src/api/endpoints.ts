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
  SquadFit,
  Subscription,
  TacticRequest,
  TokenResponse,
  PlayerPositionAdvice,
  ImportSummary,
  TacticRecommendation,
  TeamProfile,
  TeamSummary,
} from './types'

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
  player: (id: number) => api.get<PlayerDetail>(`/players/${id}`),
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
  recommendTactic: (body: { careerId: number; lockFormation?: string; lockPreset?: string; topN?: number; diversityMode?: string }) =>
    api.post<Credited<TacticRecommendation>>('/advisor/tactic', body),
  lineup: (careerId: number, tactic: TacticRequest) => api.post<SquadFit>('/fit/lineup', { careerId, tactic }),
  fitSquad: (body: { careerId: number; tactic: TacticRequest }) => api.post<Credited<SquadFit>>('/fit/squad', body),
  previewSlot: (body: { roleId: string; position: string; tags?: string[]; gender?: number; limit?: number }) =>
    api.post<Recommendation>('/recommend/preview', body, false),
  slotView: (body: {
    careerId: number
    scope: 'SQUAD' | 'LEAGUE' | 'MARKET'
    slot: { roleId: string; position: string; tags?: string[]; leagueId?: number; limit?: number }
  }) => api.post<Recommendation>('/recommend/slot-view', body),
  recommendSlot: (body: {
    careerId?: number
    roleId: string
    position: string
    tags?: string[]
    budgetMax?: number
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
