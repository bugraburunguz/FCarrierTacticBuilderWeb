import type { SbcRequirement } from '../../../api/types'
import { qualityOf } from '../../../lib/sbcTraditional'
import type { UtCard } from '../../../lib/utCard'

/** Tek kartın verisiyle ölçülebilen şart türleri (kalite, OVR sınırı, kulüp/lig/ülke adı). */
const KEY = { CLUB: 'club', LEAGUE: 'league', NATION: 'nationality' } as const

function cardMeets(r: SbcRequirement, card: UtCard): boolean | undefined {
  const value = r.value ?? 0
  switch (r.kind) {
    case 'QUALITY':
      return r.op === 'MAX' ? qualityOf(card.rating) <= value : r.op === 'EXACT' ? qualityOf(card.rating) === value : qualityOf(card.rating) >= value
    case 'MIN_OVR':
      return card.rating >= value
    case 'MAX_OVR':
      return card.rating <= value
    case 'EXACT_OVR':
      return card.rating === value
    case 'FROM': {
      const refs = r.refs ?? []
      if (refs.length === 0 || refs.some((x) => !x.name)) return undefined
      return refs.some((x) => {
        const key = KEY[x.kind as keyof typeof KEY]
        return key !== undefined && card[key] === x.name
      })
    }
    default:
      return undefined
  }
}

export interface SingleItemPlan {
  /** Tüm şartlar kart verisinden ölçülebiliyor mu. */
  evaluable: boolean
  /** Ölçülemeyen şartlar (elle kontrol). */
  unverified: SbcRequirement[]
  /** Uygun kulüp kartları: önce takas edilemez, sonra düşük reyting (ölçülemeyen şart varsa boş). */
  cards: UtCard[]
}

/**
 * V3-05d-b — tek kart teslimi (EA ONE_CLICK_CHALLENGE): şartlar tek kart üzerinden değerlendirilebiliyorsa kulüpten uygun kartlar listelenir;
 * değerlendirilemiyorsa (gerçek yakalamada: PLAYER_ATTRIBUTE + ACADEMY_PLAYER_SLOTTING, anlamları doğrulanmadı) liste yok, elle kontrol.
 */
export function singleItemCandidates(requirements: SbcRequirement[], club: UtCard[]): SingleItemPlan {
  const probe: UtCard = { key: 'probe', source: 'club', name: '', rating: 0, positions: [] }
  const unverified = requirements.filter((r) => cardMeets(r, probe) === undefined)
  if (unverified.length > 0 || requirements.length === 0) {
    return { evaluable: false, unverified, cards: [] }
  }
  const cards = club.filter((c) => c.source === 'club' && requirements.every((r) => cardMeets(r, c)))
    .sort((a, b) => Number(Boolean(b.untradeable)) - Number(Boolean(a.untradeable)) || a.rating - b.rating)
  return { evaluable: true, unverified: [], cards }
}
