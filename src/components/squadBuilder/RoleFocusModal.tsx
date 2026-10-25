import { useState } from 'react'
import type { RoleAlternative } from '../../api/types'
import { alternativeFitText } from '../../lib/fitLabels'
import { firstFocus, rankRoleGroups, type RoleGroup } from '../../lib/squadBuilder'
import { AppDialog } from '../../design/components/AppDialog'

interface Props {
  position: string
  groups: RoleGroup[]
  /** EA rol listesi hazır değilse seçici kilitli. */
  lock?: { status: 'loading' | 'error'; retry: () => void }
  currentRoleId: string
  onApply: (roleId: string) => void
  onClose: () => void
  /** FIT-2 madde 6 (kariyer): slottaki oyuncunun rollere göre Güç/Rol oturması; verilirse roller en uygun önce ve sayısıyla. UT vermez. */
  fits?: Map<string, RoleAlternative>
}

/** Taslak yerel tutulur; yalnızca Uygula'da dışarı yazılır. */
export function RoleFocusModal(props: Props) {
  return (
    <AppDialog title={`${props.position} — Rol & Özelleştirme`} hint="Rol ve odak seç" onClose={props.onClose}>
      <RoleFocusPanel {...props} />
    </AppDialog>
  )
}

export function RoleFocusPanel({ groups: given, lock, currentRoleId, onApply, onClose, fits }: Props) {
  const groups = rankRoleGroups(given, fits)
  const fitOf = (roleId: string) => fits?.get(roleId)
  const initial = groups.find((g) => g.options.some((o) => o.roleId === currentRoleId)) ?? groups[0]
  const [base, setBase] = useState(initial?.base)
  const [roleId, setRoleId] = useState(initial?.options.find((o) => o.roleId === currentRoleId)?.roleId ?? (initial ? firstFocus(initial).roleId : ''))
  const group = groups.find((g) => g.base === base)

  function pickBase(next: RoleGroup) {
    setBase(next.base)
    setRoleId(firstFocus(next).roleId)
  }

  if (lock) {
    return (
      <div role="status" className="space-y-3 text-sm">
        <p className="text-muted">{lock.status === 'loading' ? 'Oyundaki roller yükleniyor…' : 'Oyundaki rol listesi alınamadı; rol seçimi bu liste olmadan kapalı.'}</p>
        {lock.status === 'error' && <button type="button" onClick={lock.retry} className="rounded-md bg-accent-bg px-3 py-1.5 text-[12.5px] font-bold text-on-accent">Yeniden dene</button>}
      </div>
    )
  }

  return (
    <>
      <div role="radiogroup" aria-label="Rol" className="space-y-1.5">
        {groups.map((g) => (
          <label
            key={g.base}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[13px] ${g.base === base ? 'border-accent bg-accent-soft' : 'border-line'}`}
          >
            <input type="radio" name="role" className="accent-accent" checked={g.base === base} onChange={() => pickBase(g)} />
            {g.base}
            {fitOf(g.options[0].roleId) && <span className="ml-auto text-[11.5px] text-muted">{alternativeFitText(fitOf(g.options[0].roleId)!)}</span>}
          </label>
        ))}
      </div>
      <p className="mb-1.5 mt-3 text-[11px] uppercase tracking-wider text-muted">Focus</p>
      <div role="radiogroup" aria-label="Focus" className="flex flex-wrap gap-1.5">
        {group?.options.map((o) => (
          <button
            key={o.roleId}
            type="button"
            role="radio"
            aria-checked={o.roleId === roleId}
            onClick={() => setRoleId(o.roleId)}
            className={`rounded-md border px-2.5 py-1 text-[11.5px] ${o.roleId === roleId ? 'border-accent text-accent' : 'border-line text-muted'}`}
          >
            {o.focus}
            {/* Oturma biliniyorsa yalnız yüzde; norm yoksa sayının adı (Güç) yazılır, iki ölçek karışmasın. */}
            {fitOf(o.roleId) && <span className="text-muted"> · {fitOf(o.roleId)!.levelFit == null ? alternativeFitText(fitOf(o.roleId)!) : `%${Math.round(fitOf(o.roleId)!.levelFit!)}`}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={!roleId} onClick={() => onApply(roleId)} className="flex-1 rounded-md bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent disabled:opacity-50">
          Uygula
        </button>
        <button type="button" onClick={onClose} className="flex-1 rounded-md bg-surface-2 py-2 text-[12.5px] font-bold text-ink">
          Vazgeç
        </button>
      </div>
    </>
  )
}
