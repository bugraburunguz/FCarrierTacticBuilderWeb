import { api } from './client'
import type {
  BehaviorTag,
  Career,
  CareerPlayer,
  Club,
  Credited,
  Formation,
  FitRoleResult,
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
} from './types'

export interface PlayerFilters {
  q?: string
  pos?: string[]
  ps?: string[]
  at?: string[]
  ovr_min?: number
  ovr_max?: number
  pot_min?: number
  value_max?: number
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  size?: number
  attrMin?: Record<string, number>
}

function playerQuery(filters: PlayerFilters) {
  const { attrMin, ...rest } = filters
  const query: Record<string, string | number | string[] | undefined> = { ...rest }
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
  clubs: (q: string) => api.get<Club[]>('/clubs', { q, limit: 8 }),

  roles: () => api.get<Role[]>('/roles'),
  behaviorTags: (pos?: string) => api.get<BehaviorTag[]>('/behavior-tags', { pos }),
  formations: () => api.get<Formation[]>('/formations'),
  presets: (kind?: string) => api.get<Preset[]>('/presets', { kind }),
  resolveTactic: (tactic: TacticRequest) => api.post<ResolvedTactic>('/tactics/resolve', tactic, false),

  fitRole: (body: { playerId: number; roleId: string; position?: string; tags?: string[] }) =>
    api.post<FitRoleResult>('/fit/role', body, false),
  compare: (body: { ids: number[]; roleId: string; position?: string; tags?: string[] }) =>
    api.post<FitRoleResult[]>('/players/compare', body, false),
  fitSquad: (body: { careerId: number; tactic: TacticRequest }) => api.post<Credited<SquadFit>>('/fit/squad', body),
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
  createCareer: (body: { clubId: number; budgetEur?: number }) => api.post<Career>('/careers', body),
  squad: (careerId: number) => api.get<CareerPlayer[]>(`/careers/${careerId}/squad`),
  events: (careerId: number) => api.get<RosterEvent[]>(`/careers/${careerId}/events`),
  applyEvent: (careerId: number, body: { type: RosterEventType; playerId: number; feeEur?: number }) =>
    api.post<RosterEvent>(`/careers/${careerId}/events`, body),
}
