import { Link } from 'react-router-dom'
import type { CareerPlayer, PlayerPositionAdvice } from '../api/types'
import { Chip } from '../design/components/primitives'
import { HelpPopover } from './ui'
import { formatEur } from '../lib/format'
import { squadGroups, type SquadGrouping } from '../lib/squadGroups'

const GROUPS: { label: string; positions: string[] }[] = [
  { label: 'Kaleciler', positions: ['GK'] },
  { label: 'Defans', positions: ['CB', 'LB', 'RB'] },
  { label: 'Orta saha', positions: ['CDM', 'CM', 'CAM', 'LM', 'RM'] },
  { label: 'Hücum', positions: ['LW', 'RW', 'ST'] },
]

const ORDER = GROUPS.flatMap((g) => g.positions)

interface Props {
  squad: CareerPlayer[]
  positionAdvice: PlayerPositionAdvice[]
  /** KARIYER-UX FAZ 3: kayıttaki haftalık maaş sütunu ve kiralık bitiş tarihi (v3 Kadro); v2 vermez, tablo değişmez. */
  recordColumns?: boolean
  /** KARIYER-UX FAZ 3.1 (v3): tek tablo, gruplar tbody; v2 vermez, eski grup başına tablo kalır. */
  grouping?: SquadGrouping
}

const DAY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const day = (date: string) => DAY.format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
const loanDate = (date?: string) => (date ? ` · ${day(date)}` : '')

export function SquadList({ squad, positionAdvice, recordColumns = false, grouping }: Props) {
  if (grouping) {
    return <GroupedSquadTable squad={squad} positionAdvice={positionAdvice} recordColumns={recordColumns} grouping={grouping} />
  }
  const adviceById = new Map(positionAdvice.map((a) => [a.playerId, a]))
  const placed = new Set<number>()
  const groups = GROUPS.map((group) => {
    const players = squad
      .filter((s) => group.positions.includes(s.player.positions[0] ?? ''))
      .sort((a, b) => ORDER.indexOf(a.player.positions[0]) - ORDER.indexOf(b.player.positions[0]) || b.player.overall - a.player.overall)
    players.forEach((p) => placed.add(p.player.id))
    return { ...group, players }
  })
  const others = squad.filter((s) => !placed.has(s.player.id))
  if (others.length > 0) {
    groups.push({ label: 'Diğer', positions: [], players: others })
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            {group.label} <span className="text-muted">· {group.players.length}</span>
          </h3>
          {group.players.length === 0 ? (
            <p className="text-xs text-muted">Bu bölgede oyuncu yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-1 pr-2">Oyuncu</th>
                    <th className="pr-2">Yaş</th>
                    <th className="pr-2">Mevkiler</th>
                    <th className="pr-2">En iyi mevki</th>
                    <th className="pr-2 text-right">OVR</th>
                    <th className="pr-2 text-right">POT</th>
                    {recordColumns && <th className="pr-2 text-right">Maaş (hafta)</th>}
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {group.players.map((entry) => {
                    const advice = adviceById.get(entry.player.id)
                    return (
                      <tr key={entry.player.id} className="border-t border-line">
                        <td className="py-1.5 pr-2 font-medium">
                          <Link to={`/players/${entry.player.id}`} className="hover:underline">{entry.player.name}</Link>
                        </td>
                        <td className="pr-2">{entry.player.age ?? '—'}</td>
                        <td className="pr-2 text-muted">{entry.player.positions.slice(0, 4).join(', ')}</td>
                        <td className="pr-2">
                          {advice?.bestOverallPosition ? (
                            <span title="Mevki bazlı en yüksek overall">
                              <b>{advice.bestOverallPosition}</b> <span className="text-muted">{advice.bestOverall}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="pr-2 text-right font-semibold tabular-nums">{entry.player.overall}</td>
                        <td className="pr-2 text-right tabular-nums">{entry.dynamicPotential ?? entry.player.potential ?? '—'}</td>
                        {recordColumns && <td className="pr-2 text-right tabular-nums">{entry.wageEur !== undefined && entry.wageEur !== null ? formatEur(entry.wageEur) : '—'}</td>}
                        <td>
                          {entry.onLoan && <Chip tone="warn">Kiralık (bizde){recordColumns ? loanDate(entry.loanUntil) : ''}</Chip>}
                          {entry.loanedOut && <Chip tone="info">Kiralıkta (başka takımda){recordColumns ? loanDate(entry.loanUntil) : ''}</Chip>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

// Sütunlar kırılım noktasına göre: sm altı isim · en iyi · OVR · POT; sm+ yaş ve durum; lg+ mevkiler ve maaş.
// Gizlenen sütunun col'u da gizlenir (gizli hücre ızgaradan çıkar; col kalırsa kalan hücreler kayar). Gizli bilgiler isim hücresinin altına iner.
const SM = 'hidden sm:table-cell'
const LG = 'hidden lg:table-cell'
const NUM = 'pr-2 text-right tabular-nums'
// Grup başlığı her genişlikte en az görünen sütun sayısı kadar yayılır; daha geniş colSpan dar ekranda boş sütun açar.
const GROUP_SPAN = 4

function GroupedSquadTable({ squad, positionAdvice, recordColumns, grouping }: Required<Omit<Props, 'grouping'>> & { grouping: SquadGrouping }) {
  const adviceById = new Map(positionAdvice.map((a) => [a.playerId, a]))
  const groups = squadGroups(squad, grouping)
  const noWages = recordColumns && squad.length > 0 && squad.every((s) => s.wageEur === undefined || s.wageEur === null)

  return (
    <div>
      <table className="w-full table-fixed text-left text-sm" data-squad-table>
        <colgroup>
          <col />
          <col className="hidden w-12 sm:table-column" />
          <col className="hidden w-32 lg:table-column" />
          <col className="w-16 sm:w-24" />
          <col className="w-12" />
          <col className="w-12" />
          {recordColumns && <col className="hidden w-28 lg:table-column" />}
          <col className="hidden w-48 sm:table-column" />
        </colgroup>
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th scope="col" className="py-1 pr-2">Oyuncu</th>
            <th scope="col" className={`pr-2 text-right ${SM}`}>Yaş</th>
            <th scope="col" className={`pr-2 ${LG}`}>Mevkiler</th>
            <th scope="col" className="pr-2">En iyi mevki</th>
            <th scope="col" className="pr-2 text-right">OVR</th>
            <th scope="col" className="pr-2 text-right">POT</th>
            {recordColumns && <th scope="col" className={`pr-2 text-right ${LG}`}>Maaş (hafta)</th>}
            <th scope="col" className={SM}>Durum</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.key}>
            <tr>
              <th scope="rowgroup" colSpan={GROUP_SPAN} className="pt-4 pb-1 text-sm font-semibold normal-case">
                {group.title} <span className="font-normal text-muted">· {group.players.length}</span>
              </th>
            </tr>
            {group.players.map((entry) => {
              const advice = adviceById.get(entry.player.id)
              const positions = entry.player.positions.slice(0, 4).join(', ')
              // Tarih çipin dışında, ayrı satırda: dar durum sütununda çip taşmaz.
              const status = (short: boolean) => (entry.onLoan || entry.loanedOut) && (
                <span className="flex flex-col items-start gap-0.5">
                  {entry.onLoan ? <Chip tone="warn">Kiralık (bizde)</Chip> : <Chip tone="info">{short ? 'Kiralıkta' : 'Kiralıkta (başka takımda)'}</Chip>}
                  {entry.loanUntil && <span className="text-xs text-muted">bitiş {day(entry.loanUntil)}</span>}
                </span>
              )
              return (
                <tr key={entry.player.id} className="border-t border-line align-top">
                  <td data-col="name" className="py-1.5 pr-2 font-medium">
                    <Link to={`/players/${entry.player.id}`} className="block truncate hover:underline">{entry.player.name}</Link>
                    <span data-compact className="block text-xs font-normal text-muted lg:hidden">
                      {positions}<span className="sm:hidden">{entry.player.age !== undefined && ` · ${entry.player.age} yaş`}</span>
                    </span>
                    {(entry.onLoan || entry.loanedOut) && <span className="mt-1 block sm:hidden">{status(true)}</span>}
                  </td>
                  <td data-col="age" className={`py-1.5 ${NUM} ${SM}`}>{entry.player.age ?? '—'}</td>
                  <td data-col="positions" className={`py-1.5 pr-2 text-muted ${LG}`}>{positions}</td>
                  <td data-col="best" className="py-1.5 pr-2">
                    {advice?.bestOverallPosition ? (
                      <span className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1">
                          <span title="Mevki bazlı en yüksek overall">
                            <b>{advice.bestOverallPosition}</b> <span className="tabular-nums text-muted">{advice.bestOverall}</span>
                          </span>
                          {/* FIT-3 madde 13: kanat tarafı tarzla seçildiyse gerekçe. */}
                          {advice.sideReason && <HelpPopover label="Taraf gerekçesi">{advice.sideReason}</HelpPopover>}
                        </span>
                        {/* FIT-3 madde 12: rol bazlı dönüşüm; ayrıntı oyuncunun Roller sekmesinde. */}
                        {advice.conversion && (
                          <Link to={`/players/${entry.player.id}?sekme=roller`} title={advice.conversion.text}
                            className="inline-flex min-h-6 items-center rounded-full bg-[var(--info-soft)] px-2 text-xs font-medium text-info hover:underline max-sm:min-h-8">
                            Dönüşüm: {advice.conversion.position}
                          </Link>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted">{entry.loanedOut ? 'Kiralıkta' : '—'}</span>
                    )}
                  </td>
                  <td data-col="ovr" className={`py-1.5 font-semibold ${NUM}`}>{entry.player.overall}</td>
                  <td data-col="pot" className={`py-1.5 ${NUM}`}>{entry.dynamicPotential ?? entry.player.potential ?? '—'}</td>
                  {recordColumns && (
                    <td data-col="wage" className={`py-1.5 ${NUM} ${LG}`}>{entry.wageEur !== undefined && entry.wageEur !== null ? formatEur(entry.wageEur) : '—'}</td>
                  )}
                  <td data-col="status" className={`py-1.5 ${SM}`}>{status(false)}</td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
      {noWages && <p className="mt-2 text-xs text-muted">Maaş verisi içe aktarmada gelmiyor.</p>}
    </div>
  )
}
