import type { CareerSnapshot, RosterEvent } from '../../api/types'
import { EmptyState } from '../../design/components/primitives'
import { EVENT_LABEL, SNAPSHOT_LABEL } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'

const MAX_ROWS = 8

/** Zaman çizelgesi (WEB-BUG-17): içe aktarmalar ve kadro olayları Türkçe etiketlerle, en yeni başta; v2 ve v3 Masa ortak. */
export function Timeline({ events, snapshots }: { events: RosterEvent[]; snapshots: CareerSnapshot[] }) {
  const rows = [
    ...snapshots.map((s) => ({ key: `s${s.id}`, at: s.takenAt, text: `${SNAPSHOT_LABEL[s.source] ?? 'Güncelleme'} · ${s.playerCount} oyuncu` })),
    ...events.map((e) => ({ key: `e${e.id}`, at: e.createdAt ?? '', text: `${EVENT_LABEL[e.type] ?? 'Kadro değişikliği'}${e.playerName ? ` · ${e.playerName}` : ''}${e.feeEur ? ` · ${formatEur(e.feeEur)}` : ''}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ROWS)
  if (rows.length === 0) {
    return <EmptyState>Henüz kayıt yok. İlk transferi ya da içe aktarmayı yapınca burada görünür.</EmptyState>
  }
  return (
    <ol className="space-y-1.5 border-l border-[var(--glass-border)] pl-3 text-sm">
      {rows.map((r) => (
        <li key={r.key}><span className="font-[var(--font-num)] text-xs tabular-nums text-muted">{r.at ? new Date(r.at).toLocaleDateString('tr-TR') : '—'}</span> {r.text}</li>
      ))}
    </ol>
  )
}
