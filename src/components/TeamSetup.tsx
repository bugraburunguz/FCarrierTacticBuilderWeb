import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import type { WeaponState } from '../api/types'
import { depthBand, type BuildUp } from '../lib/wizard'
import { DEFAULT_SETUP, tacticStore, useTactic } from '../state/tacticStore'
import { BadgeDot, Button, Card, ErrorBox, Pill } from './ui'

const BUILD_UP: { value: BuildUp; label: string; hint: string }[] = [
  { value: 'Short', label: 'Kısa pas', hint: 'Defanstan kısa paslarla kur' },
  { value: 'Balanced', label: 'Dengeli', hint: 'Duruma göre' },
  { value: 'Counter', label: 'Kontra', hint: 'Hızlı ve dikey' },
]

const STATUS_TEXT: Record<WeaponState, string> = { GREEN: 'Uygun', YELLOW: 'Sınırda', RED: 'Eksik' }

export function TeamSetup({ careerId }: { careerId?: number }) {
  const tactic = useTactic()
  const { authenticated } = useAuth()
  const setup = tactic.setup ?? DEFAULT_SETUP
  const check = useMutation({
    mutationFn: () => endpoints.setupCheck({ careerId: careerId!, buildUp: setup.buildUp, depth: setup.depth }),
  })

  function update(next: Partial<typeof setup>) {
    tacticStore.set({ ...tactic, setup: { ...setup, ...next } })
    check.reset()
  }

  return (
    <Card title="Takım ayarları" actions={<Pill tone="emerald">Ücretsiz</Pill>}>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-muted">Build-Up (oyun kurulumu)</legend>
        <div className="grid grid-cols-3 gap-2">
          {BUILD_UP.map((o) => (
            <label key={o.value} title={o.hint} className={`cursor-pointer rounded-md border px-2 py-1.5 text-center text-sm transition ${setup.buildUp === o.value ? 'border-accent bg-accent-soft font-medium' : 'border-line'}`}>
              <input type="radio" name="buildup" className="sr-only" checked={setup.buildUp === o.value} onChange={() => update({ buildUp: o.value })} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <label htmlFor="depth" className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
          <span>Defensive Depth (savunma hattı)</span>
          <span className="text-sm">
            <b>{setup.depth}</b> · {depthBand(setup.depth)}
          </span>
        </label>
        <input id="depth" type="range" min={0} max={100} step={1} value={setup.depth} onChange={(e) => update({ depth: Number(e.target.value) })} className="w-full accent-accent" />
        <div className="flex justify-between text-[11px] text-muted">
          <span>Deep</span>
          <span>Balanced</span>
          <span>High</span>
          <span>Aggressive</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {!authenticated || careerId === undefined ? (
          <p className="text-xs text-muted">
            Giriş yapıp bir kariyer seçersen bu ayarı kadronla kontrol edebilirsin. <Link to="/login" className="underline">Giriş yap</Link>
          </p>
        ) : (
          <Button variant="secondary" disabled={check.isPending} onClick={() => check.mutate()}>
            {check.isPending ? 'Kontrol ediliyor…' : 'Bu ayarı kadronla kontrol et'}
          </Button>
        )}
        <ErrorBox error={check.error} />
        {(check.data ?? []).map((c) => (
          <details key={c.title} className="rounded-md border border-line p-2 text-sm" open={c.status !== 'GREEN'}>
            <summary className="cursor-pointer">
              <BadgeDot state={c.status} /> <b>{c.title}</b> <span className="text-xs text-muted">· {STATUS_TEXT[c.status]}</span>
            </summary>
            <p className="mt-1 text-xs text-muted">{c.detail}</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {c.players.map((p) => (
                <li key={p.id} className={`rounded-full px-2 py-0.5 text-xs ${p.ok ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'}`}>
                  {p.name} ({p.position}) {p.value}{p.ok ? ' ✓' : ' ✗'}
                </li>
              ))}
              {c.players.length === 0 && <li className="text-xs text-muted">Kadronda bu mevkide oyuncu yok.</li>}
            </ul>
          </details>
        ))}
      </div>
    </Card>
  )
}
