import type { FormationSlot, LineStrength, MatchOpponent } from '../../api/types'
import type { PitchSlot } from '../../components/pitch/Pitch'

/** FCA-23 Maç Merkezi: saf kurallar (rakip seçici gruplaması, eksik veri metni, ilk 11 farkı, saha slotları, hat güçleri). */

const OTHER_LEAGUE = 'Diğer'
const fold = (s: string) => s.toLocaleLowerCase('tr-TR')

/** Rakipler lige göre gruplu; sıra sunucudaki gibi (önce bizim lig, sonra OVR). Arama takım ya da lig adında, Türkçe harf duyarsız. */
export function groupOpponents(list: readonly MatchOpponent[], query: string): { league: string; items: MatchOpponent[] }[] {
  const q = fold(query.trim())
  const groups = new Map<string, MatchOpponent[]>()
  for (const o of list) {
    const league = o.leagueName?.trim() || OTHER_LEAGUE
    if (q && !fold(o.name).includes(q) && !fold(league).includes(q)) {
      continue
    }
    groups.set(league, [...(groups.get(league) ?? []), o])
  }
  return [...groups].map(([league, items]) => ({ league, items }))
}

const MISSING_TEXT: Record<string, string> = {
  USER_TEAM: 'Takımın henüz bilinmiyor; bu sürümle kaydını içe aktar.',
  FORMATION: 'Rakibin dizilişi kayıtta yok.',
  LIKELY_ELEVEN: 'Rakibin muhtemel ilk 11\'i kayıtta yok.',
  SEASON_STATS: 'Sezon istatistiği yok; maç verisi içe aktarılınca dolar.',
  SET_PIECES: 'Duran top atıcıları kayıtta yok.',
  OUR_FORMATION: 'Bizim dizilişimiz belirlenemedi; ana taktik seç ya da kaydı içe aktar.',
  MATCH_RATINGS: 'Maç notu yok; form ve dinlendirme için maç verisi gerekir.',
}

export function missingText(code: string): string {
  return MISSING_TEXT[code] ?? 'Bu bölüm için veri yok.'
}

/** Ana taktikteki ilk 11 ile önerilen arasındaki fark: aynı slotta farklı oyuncu. Ana taktik yoksa boş. */
export function elevenDiff(mainLineup: Readonly<Record<string, number | undefined>> | undefined, eleven: readonly { slotId: string; playerId: number; name: string }[], names: ReadonlyMap<number, string>): { slotId: string; out: string; in: string }[] {
  if (!mainLineup) {
    return []
  }
  return eleven.flatMap((e) => {
    const current = mainLineup[e.slotId]
    return current !== undefined && current !== e.playerId ? [{ slotId: e.slotId, out: names.get(current) ?? `Oyuncu ${current}`, in: e.name }] : []
  })
}

/** Formasyonun koordinatları + oyuncular: önce slot kimliği, yoksa aynı mevkideki sıradaki boş slot. Rol adı gösterilmez (ham kod). */
export function pitchSlotsOf(formation: readonly FormationSlot[], players: readonly { slotId: string; position: string; name: string; overall: number }[]): PitchSlot[] {
  const byId = new Map(formation.map((s) => [s.slotId, s]))
  const taken = new Map<string, (typeof players)[number]>()
  const rest: (typeof players)[number][] = []
  for (const p of players) {
    if (byId.has(p.slotId) && !taken.has(p.slotId)) taken.set(p.slotId, p)
    else rest.push(p)
  }
  for (const p of rest) {
    const free = formation.find((s) => s.position === p.position && !taken.has(s.slotId)) ?? formation.find((s) => !taken.has(s.slotId))
    if (free) taken.set(free.slotId, p)
  }
  return formation.map((s) => {
    const p = taken.get(s.slotId)
    return { slotId: s.slotId, position: s.position, x: s.x, y: s.y, player: p && { name: p.name, rating: p.overall, position: s.position } }
  })
}

const LINES = [
  { key: 'overall', label: 'Genel', base: 'overall', matchday: 'matchdayOverall' },
  { key: 'attack', label: 'Hücum', base: 'attack', matchday: 'matchdayAttack' },
  { key: 'midfield', label: 'Orta saha', base: 'midfield', matchday: 'matchdayMidfield' },
  { key: 'defence', label: 'Savunma', base: 'defence', matchday: 'matchdayDefence' },
] as const

const valueOf = (s: LineStrength, base: (typeof LINES)[number]['base'], matchday: (typeof LINES)[number]['matchday']) => s[matchday] ?? s[base]

/** Hat güçleri yan yana: maç günü (muhtemel ilk 11) değeri varsa o, yoksa kadro değeri. */
export function lineRows(lines: { ours: LineStrength; opponent: LineStrength }) {
  return LINES.map(({ key, label, base, matchday }) => {
    const ours = valueOf(lines.ours, base, matchday)
    const opponent = valueOf(lines.opponent, base, matchday)
    return { key, label, ours, opponent, diff: ours - opponent }
  })
}
