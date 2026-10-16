import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ReplicaApplySlot } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { ErrorBox } from '../../components/ui'
import { AppDialog } from '../../design/components/AppDialog'
import { Button, EmptyState, Skeleton, StatTile } from '../../design/components/primitives'
import { PickBody } from '../squad/ut/PickBody'
import { AttentionPoints } from './AttentionPoints'
import { SaveToSlot } from './SaveToSlot'
import { SOURCE_TEXT } from './labels'
import { SQUAD_FIT_TEXT } from '../../lib/fitLabels'
import { slotFit } from './slotFit'
import { useReplicaApply } from './useReplicaApply'

function SlotRow({ slot, mode, onSuggest }: { slot: ReplicaApplySlot; mode: 'career' | 'ut'; onSuggest: (slot: ReplicaApplySlot) => void }) {
  const fit = slot.player ? slotFit(slot) : undefined
  return (
    <li className="glass-3 flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5">
      <span className="w-12 shrink-0 font-[var(--font-num)] text-xs tabular-nums text-ink-2">{slot.position}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{slot.player ? slot.player.name : 'Boş'}</p>
        <p className="truncate text-xs text-muted" title={`${slot.roleName} · ${slot.focus}`}>{slot.roleName} · {slot.focus}</p>
      </div>
      {slot.outOfPosition && slot.playerPosition && (
        <span className="glass-3 inline-flex min-h-6 items-center px-2 font-[var(--font-num)] text-xs tabular-nums text-ink" title="Mevki dışı" aria-label={`Mevki dışı: ${slot.playerPosition} oyuncusu ${slot.position} mevkisinde`}>
          {slot.playerPosition}→{slot.position}
        </span>
      )}
      {slot.player && <span className="font-[var(--font-num)] text-sm tabular-nums">{slot.player.overall}</span>}
      {fit && (
        <span className="flex flex-col items-end gap-0.5">
          <FitBadge state={fit.state} pct={fit.pct} />
          <span className="text-xs text-muted">{fit.text}</span>
        </span>
      )}
      {slot.suggest &&
        (mode === 'career' ? (
          <Link to={`/career/transfer?pos=${slot.position}`} className="glass-3 inline-flex min-h-8 items-center px-3 text-xs font-semibold text-ink underline decoration-accent underline-offset-2 hover:bg-[var(--glass-hover)] max-sm:min-h-11" aria-label={`${slot.position} için oyuncu öner`}>
            Öner
          </Link>
        ) : (
          <button type="button" onClick={() => onSuggest(slot)} className="glass-3 inline-flex min-h-8 items-center px-3 text-xs font-semibold text-ink underline decoration-accent underline-offset-2 hover:bg-[var(--glass-hover)] max-sm:min-h-11" aria-label={`${slot.position} için oyuncu öner`}>
            Öner
          </button>
        ))}
    </li>
  )
}

/** Kadromla uygula (REP-07): 11 slotta oyuncu + seviye rozeti, zayıf/boş slotlar için "öner", oyunculu bulgular, "Taktik slotuma kaydet". */
export function ApplyTab({ replicaId, apply }: { replicaId: string; apply: ReturnType<typeof useReplicaApply> }) {
  const { mode, authenticated, plan, result, addCard, loading } = apply
  const [suggesting, setSuggesting] = useState<ReplicaApplySlot>()
  const data = result.data

  if (!authenticated) {
    return (
      <EmptyState action={<Link to="/login" className="font-semibold text-accent underline">Giriş yap</Link>}>
        Kadromla uygulamak için giriş yapmalısın.
      </EmptyState>
    )
  }
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Yükleniyor" className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }
  if (result.isError || !data) {
    return <ErrorBox error={result.error ?? new Error('Atama yüklenemedi.')} />
  }
  const used = new Set(data.slots.flatMap((s) => (s.player ? [String(s.player.id)] : [])))
  const filled = data.slots.filter((s) => s.player).length
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm">
          <b>{SOURCE_TEXT[data.source]}</b>
          {plan.skipped > 0 && plan.source === 'UT' && <span className="text-muted"> · {plan.skipped} kart katalogla eşleşmedi</span>}
        </p>
        {plan.note && <p className="text-xs text-muted">{plan.note}</p>}
        {data.source === 'SAMPLE' && mode === 'ut' && (
          <Link to="/ut/import" className="text-xs font-semibold text-accent underline">Kulüp kartlarını içe aktar</Link>
        )}
      </div>
      <div className="flex gap-2">
        <StatTile label="Dolu slot" value={`${filled}/11`} />
        <StatTile label={SQUAD_FIT_TEXT} value={Math.round(data.squadFit)} suffix="/100" />
      </div>
      <ol className="flex flex-col gap-1.5" aria-label="Slot atamaları">
        {data.slots.map((s) => (
          <SlotRow key={s.slotId} slot={s} mode={mode} onSuggest={setSuggesting} />
        ))}
      </ol>
      <AttentionPoints analysis={data.analysis} withPlayers />
      <SaveToSlot replicaId={replicaId} careerId={data.source === 'CAREER' ? plan.body.careerId : undefined} />
      {suggesting && (
        <AppDialog wide title={`${suggesting.position} · ${suggesting.roleName} — Kart seç`} hint="Kulüp kartların ya da katalog" onClose={() => setSuggesting(undefined)}>
          <PickBody
            position={suggesting.position}
            roleId={suggesting.roleId}
            usedKeys={used}
            onPick={(card) => {
              if (card.playerId !== undefined) {
                addCard(card.playerId)
              }
              setSuggesting(undefined)
            }}
          />
          <div className="mt-3">
            <Button onClick={() => setSuggesting(undefined)}>Vazgeç</Button>
          </div>
        </AppDialog>
      )}
    </div>
  )
}
