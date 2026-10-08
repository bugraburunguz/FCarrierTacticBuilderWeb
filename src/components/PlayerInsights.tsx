import { PLAYSTYLES, triggerResults } from '../lib/playstyles'
import { thresholdNotes } from '../lib/thresholds'
import { ATTR_LABELS } from '../lib/format'
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
                  <span className="text-slate-600 dark:text-slate-300"> · {level >= 2 ? info.plus : info.effect}</span>
                  <span className="block text-xs text-slate-500">En çok işe yarar: {info.best}</span>
                </li>
              )
            })}
          </ul>
        )}
        {hints.map((hint) => {
          const info = PLAYSTYLES[hint.playstyle]
          return (
            <p key={hint.playstyle} className="text-slate-600 dark:text-slate-300">
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
              <li key={note.id} className={note.tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                {note.tone === 'good' ? '✓' : '!'} {note.text}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">PlayStyle açıklamaları EA rehberinden özetlendi. Eşikler topluluk kaynaklıdır, oyun açıklamaz ("tune"); rol uyum puanını değiştirmez.</p>
      </div>
    </Card>
  )
}
