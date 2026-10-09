import { useState } from 'react'
import type { ResolvedSlot, Role } from '../api/types'
import { protectLead } from '../lib/protectLead'
import { tacticStore, useTactic, type TacticState } from '../state/tacticStore'
import { Button, Card } from './ui'

interface Props {
  slots: ResolvedSlot[]
  roles: Role[]
}

export function ProtectLeadCard({ slots, roles }: Props) {
  const tactic = useTactic()
  const [previous, setPrevious] = useState<TacticState>()
  const roleNames = Object.fromEntries(roles.map((r) => [r.id, r.name + ' (' + r.focus + ')']))
  const suggestion = protectLead(slots, tactic.setup?.depth, roleNames)
  const hasChanges = suggestion.roles.length > 0 || Boolean(suggestion.depth)

  function apply() {
    setPrevious(tactic)
    const nextSlots = { ...tactic.slots }
    suggestion.roles.forEach((change) => {
      nextSlots[change.slotId] = { tags: nextSlots[change.slotId]?.tags ?? [], roleId: change.to }
    })
    tacticStore.set({
      ...tactic,
      slots: nextSlots,
      setup: suggestion.depth ? { buildUp: tactic.setup?.buildUp ?? 'Balanced', depth: suggestion.depth.to } : tactic.setup,
    })
  }

  return (
    <Card title="Skoru koru (70. dakika sonrası)">
      <p className="mb-2 text-sm text-muted">
        Öndeyken ritmi bozmadan temkine geç: hattı biraz düşür, oyuncular arasını daralt, bek ve orta saha rollerini temkinli yap, yorulanları hızlı forvet ya da sağlam 6'lıkla değiştir.
      </p>
      {hasChanges ? (
        <ul className="mb-3 list-disc space-y-0.5 pl-5 text-sm">
          {suggestion.depth && <li>Hat yüksekliği {suggestion.depth.from} → <b>{suggestion.depth.to}</b></li>}
          {suggestion.roles.map((c) => (
            <li key={c.slotId}>{c.slotId} ({c.position}): {c.from} → <b>{c.toName}</b></li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted">Bu taktikte değiştirilecek riskli rol yok; hat yüksekliği de zaten alt sınırda.</p>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" disabled={!hasChanges} onClick={apply}>Koruma ayarını uygula</Button>
        {previous && <Button variant="ghost" onClick={() => { tacticStore.set(previous); setPrevious(undefined) }}>Geri al</Button>}
      </div>
      <p className="mt-2 text-xs text-muted">Öneri, Pro FC 27 ipuçlarındaki maç sonu yönergelerinden türetilmiştir; mevcut taktiğini ancak "uygula"ya basarsan değiştirir.</p>
    </Card>
  )
}
