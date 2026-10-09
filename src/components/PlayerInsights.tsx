import { PLAYSTYLES, triggerResults } from '../lib/playstyles'
import { thresholdNotes } from '../lib/thresholds'
import { ATTR_LABELS } from '../lib/format'
import { AlertTriangle, Check } from 'lucide-react'
import { Card, Pill } from './ui'

export function PlayerInsights({ attrs, positions, playstyles }: { attrs: Record<string, number>; positions: string[]; playstyles: Record<string, number> }) {
  const notes = thresholdNotes(attrs, positions)
  const hints = triggerResults(attrs, playstyles).filter((r) => r.state !== 'far')
  const owned = Object.entries(playstyles).filter(([id]) => PLAYSTYLES[id])
  if (notes.length === 0 && hints.length === 0 && owned.length === 0) {
    return null
  }
  return (
    <Card title="Oyun tarzı ve eşik notları">
      <div className="space-y-3 text-sm">
        {owned.length > 0 && (
          <ul className="space-y-1">
            {owned.map(([id, level]) => {
              const info = PLAYSTYLES[id]
              return (
                <li key={id}>
                  <span className="font-medium">
                    {info.name}
                    {level >= 2 ? '+' : ''}
                  </span>
                  <span className="text-muted"> · {level >= 2 ? info.plus : info.effect}</span>
                  <span className="block text-xs text-muted">En çok işe yarar: {info.best}</span>
                </li>
              )
            })}
          </ul>
        )}
        {hints.map((hint) => {
          const info = PLAYSTYLES[hint.playstyle]
          return (
            <p key={hint.playstyle} className="text-muted">
              <Pill tone={hint.state === 'met' ? 'emerald' : 'amber'}>{info.name}+</Pill>{' '}
              {hint.state === 'met'
                ? 'için istatistik eşikleri sağlanıyor (oyunda bu PlayStyle+ olarak gelmiyorsa kart verisi eski olabilir).'
                : `eşiğine yakın: ${hint.missing.map((m) => `${ATTR_LABELS[m.attr] ?? m.attr} ${m.value}/${m.min}`).join(', ')}.`}
            </p>
          )
        })}
        {notes.length > 0 && (
          <ul className="space-y-1">
            {notes.map((note) => (
              <li key={note.id} className={note.tone === 'good' ? 'text-accent' : 'text-code'}>
                {note.tone === 'good' ? <Check size={12} className="inline" aria-hidden="true" /> : <AlertTriangle size={12} className="inline" aria-hidden="true" />} {note.text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">PlayStyle açıklamaları EA rehberinden özetlendi. Eşikler topluluk kaynaklıdır, oyun açıklamaz ("tune"); rol uyum puanını değiştirmez.</p>
      </div>
    </Card>
  )
}
