import { queryOptions } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import type { CareerSquadVersion, SquadVersion } from '../../api/types'

export const squadVersionKeys = {
  all: ['squad-versions'] as const,
}

export const squadVersionsQuery = queryOptions({ queryKey: squadVersionKeys.all, queryFn: endpoints.squadVersions })

const DATE = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' })

export function formatSquadVersion(version: Pick<SquadVersion, 'label' | 'exportedAt'>): string {
  if (!version.exportedAt) {
    return version.label
  }
  const date = new Date(version.exportedAt)
  if (Number.isNaN(date.getTime())) {
    return version.label
  }
  const formatted = DATE.format(date)
  return version.label.includes(formatted) ? version.label : `${version.label} · ${formatted}`
}

export function pickDefaultSquadVersion(versions: SquadVersion[]): number | undefined {
  return (versions.find((v) => v.latest) ?? versions[0])?.id
}

export function formatCareerSquadBadge(version: CareerSquadVersion): string {
  return `Kadro: ${version.label}${version.latest ? '' : ' (eski sürüm)'}`
}
