import { endpoints } from '../../../api/endpoints'
import type { LookupItem, PageResponse, PlayerSummary } from '../../../api/types'
import { marketWindow, type SbcConstraints, type SbcSlot } from '../../../lib/sbcTraditional'

/** Kulüp/lig/ülke "şunlardan en az N" şartı için o kulüp/lig/ülkenin katalog oyuncuları (pencere içinde). */
async function fromAnyPages(r: NonNullable<SbcConstraints['fromAny']>[number], leagues: LookupItem[], nations: LookupItem[], positions: string[], ovrMin: number, ovrMax: number, order: 'asc' | 'desc'): Promise<PageResponse<PlayerSummary>[]> {
  if (r.kind === 'club') {
    const clubs = await Promise.all(r.names.map((name) => endpoints.clubs(name, { limit: 1, gender: 0 })))
    return Promise.all(clubs.flatMap((hit) => hit.slice(0, 1)).map((club) => endpoints.players({ club: club.id, ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order, size: 60, gender: 0 })))
  }
  const list = r.kind === 'league' ? leagues : nations
  const ids = r.names.flatMap((name) => list.filter((l) => l.name.toLowerCase() === name.toLowerCase()).map((l) => l.id))
  return Promise.all(
    ids.flatMap((id) => positions.map((pos) => endpoints.players({ pos: [pos], ...(r.kind === 'league' ? { league: id } : { nat: id }), ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order, size: 40, gender: 0 }))),
  )
}

export interface MarketPoolInput {
  slots: SbcSlot[]
  constraints: Pick<SbcConstraints, 'teamRatingMin' | 'minQuality' | 'maxQuality' | 'fromAny'>
  /** Ek zorunlu lig/ülke (eski sayfanın "XI şartları"): kimlikleri çözülmüş. */
  leagueIds?: number[]
  nationIds?: number[]
  leagues: LookupItem[]
  nations: LookupItem[]
}

/**
 * SBC için katalog (pazar) aday havuzu: her mevki için reyting penceresi (marketWindow), zorunlu lig/ülke ve "şunlardan en az N" şartlarının oyuncuları.
 * TraditionalSbc (v2) ve v3 çözüm sayfası aynı fonksiyonu kullanır. Aynı oyuncu bir kez.
 */
export async function fetchMarketPlayers({ slots, constraints, leagueIds = [], nationIds = [], leagues, nations }: MarketPoolInput): Promise<PlayerSummary[]> {
  const { ovrMin, ovrMax, order } = marketWindow(constraints.teamRatingMin, constraints)
  const positions = [...new Set(slots.map((s) => s.position))]
  const pages = await Promise.all([
    ...positions.map((pos) => endpoints.players({ pos: [pos], ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order, size: 100, gender: 0 })),
    ...leagueIds.flatMap((id) => positions.map((pos) => endpoints.players({ pos: [pos], league: id, ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order, size: 40, gender: 0 }))),
    ...nationIds.flatMap((id) => positions.map((pos) => endpoints.players({ pos: [pos], nat: id, ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order, size: 40, gender: 0 }))),
  ])
  const fromPages = (await Promise.all((constraints.fromAny ?? []).map((r) => fromAnyPages(r, leagues, nations, positions, ovrMin, ovrMax, order)))).flat()
  const byId = new Map<number, PlayerSummary>()
  pages.concat(fromPages).flatMap((p) => p.items).forEach((p) => byId.set(p.id, p))
  return [...byId.values()]
}
