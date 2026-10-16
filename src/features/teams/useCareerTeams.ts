import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import type { TeamSummary } from '../../api/types'

export type TeamSort = 'overall' | 'attack' | 'midfield' | 'defence' | 'name'

/** İçe aktarılan kariyer verisindeki takımlar ve seçili takımın profili (V3-07c; TeamsPage'den). v2 ve v3 aynı hook. */
export function useCareerTeams(careerId: number | undefined, term: string, selected: number | undefined) {
  const teams = useQuery({
    queryKey: ['career-teams', careerId, term],
    queryFn: () => endpoints.careerTeams(careerId!, term),
    enabled: careerId !== undefined,
  })
  const profile = useQuery({
    queryKey: ['career-team', careerId, selected],
    queryFn: () => endpoints.careerTeam(careerId!, selected!),
    enabled: careerId !== undefined && selected !== undefined,
  })
  return { teams, profile }
}

/** Lig süzgeci (istemcide; uç lig parametresi almaz) ve sıralama: güç sütunları büyükten küçüğe, ad alfabetik; eşitlikte ad. */
export function filterTeams(teams: TeamSummary[], league: string | undefined, sort: TeamSort): TeamSummary[] {
  const rows = league ? teams.filter((t) => t.league === league) : teams
  return [...rows].sort((a, b) => (sort === 'name' ? 0 : (b[sort] ?? -1) - (a[sort] ?? -1)) || a.name.localeCompare(b.name, 'tr'))
}

/** Kariyerin kulübü: kulüp kimliği (katalog) ile içe aktarılan takım kimliği (EA) farklı uzaylarda; eşleme adla yapılır. */
export const isOwnTeam = (team: TeamSummary, clubName?: string) => Boolean(clubName) && team.name.localeCompare(clubName!, 'tr', { sensitivity: 'base' }) === 0
