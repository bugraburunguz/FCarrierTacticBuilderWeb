import { Link } from 'react-router-dom'
import type { SbcChallenge } from '../api/types'
import { KbSbcList } from '../components/KbSbcList'
import { StreamlinedSolver } from '../components/StreamlinedSolver'
import { SbcVote, useSbcVotes } from '../components/SbcVote'
import { describeRequirement } from '../lib/sbcChallenge'
import { Card, Pill } from '../components/ui'
import { isBeforeDailyRefresh } from '../lib/coinPrice'
import { useUtCapture } from '../state/utCaptureStore'

function daysLeft(endTime?: number): number | undefined {
  // EA kalan süreyi saniye olarak verir; çok büyük değerler "süresiz" demektir.
  if (endTime === undefined) {
    return undefined
  }
  const days = Math.floor(endTime / 86400)
  return days <= 120 ? days : undefined
}

const ONE_CLICK = new Set(['ONE_CLICK', 'BRICK'])

function ChallengeList({ challenges }: { challenges: SbcChallenge[] }) {
  return (
    <ul className="mt-1 space-y-2 border-l border-line pl-3">
      {challenges.map((c) => {
        const done = c.status === 'COMPLETED' && !c.repeatable
        const skip = c.type !== undefined && ONE_CLICK.has(c.type)
        return (
          <li key={c.challengeId} className="text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {skip ? <b>{c.name}</b> : <Link to={`/ut/sbc/${c.setId}/${c.challengeId}`} className={`font-bold underline decoration-dotted hover:text-accent ${done ? 'text-muted line-through' : ''}`}>{c.name}</Link>}
              {c.formationLabel && <Pill tone="slate">{c.formationLabel}</Pill>}
              {c.repeatable && <Pill tone="sky">tekrarlanabilir</Pill>}
              {done && <Pill tone="emerald">tamamlandı</Pill>}
              {skip && <span className="text-muted">tek tık: çözücü gerekmez</span>}
            </div>
            <ul className="mt-1 flex flex-wrap gap-1">
              {c.requirements.map((r, i) => (
                <li key={i} className="rounded border border-line bg-surface-2 px-1.5 py-0.5">{describeRequirement(r)}</li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

function ClubSbcSets() {
  const capture = useUtCapture()
  const sets = capture?.sbcSets ?? []
  const challenges = capture?.sbcChallenges ?? []
  const votes = useSbcVotes()
  if (sets.length === 0) {
    return (
      <Card title="Kulübündeki SBC'ler">
        <p className="text-sm text-muted">Henüz SBC yakalanmadı. Extension açıkken EA Web App'te SBC sekmesine gir, ardından <Link className="underline" to="/ut/import">Kulüp içe aktar</Link> sayfasından dosyayı yükle.</p>
      </Card>
    )
  }
  const byCategory = new Map<string, typeof sets>()
  sets.forEach((s) => byCategory.set(s.category ?? 'Diğer', [...(byCategory.get(s.category ?? 'Diğer') ?? []), s]))
  return (
    <Card title={`Kulübündeki SBC'ler (${sets.length})`}>
      {capture && (
        <p className={`mb-2 text-xs ${isBeforeDailyRefresh(capture.importedAt) ? 'text-code' : 'text-muted'}`}>
          Son yakalama: {new Date(capture.importedAt).toLocaleString('tr-TR')}.
          {isBeforeDailyRefresh(capture.importedAt) && ' Yeni SBC\'ler her gün Londra saatiyle 18:00\'de (TRT 20:00, kışın 21:00) yenilenir; bu liste eski olabilir. Web App\'i açıp yeniden dışa aktar.'}
        </p>
      )}
      <div className="space-y-3">
        {[...byCategory.entries()].map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted">{category}</h3>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {items.map((s) => {
                const left = daysLeft(s.endTime)
                const done = s.challengesCount > 0 && s.challengesCompleted >= s.challengesCount
                return (
                  <li key={s.setId} className="border-t border-line py-1 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                    <Link to={`/ut/sbc/${s.setId}`} className={`underline decoration-dotted hover:text-accent ${done ? 'text-muted line-through' : ''}`}>{s.name ?? `#${s.setId}`}</Link>
                    <span className="flex items-center gap-1.5 text-xs">
                      <SbcVote setId={s.setId} votes={votes.get(s.setId)} />
                      <span className="tabular-nums">{s.challengesCompleted}/{s.challengesCount}</span>
                      {s.repeatable && <Pill tone="sky">tekrarlanabilir</Pill>}
                      {left !== undefined && <Pill tone="amber">{left} gün</Pill>}
                    </span>
                    </div>
                    {challenges.some((c) => c.setId === s.setId) && (
                      <ChallengeList challenges={challenges.filter((c) => c.setId === s.setId)} />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Şartlar, SBC setini Web App'te açıp yeniden dışa aktardığında gelir; bir challenge'ın adına tıklayınca şartlara uygun hazır kadro açılır.</p>
    </Card>
  )
}

export function UtSbcPage() {
  return (
    <div className="space-y-4">
      <KbSbcList />
      <ClubSbcSets />
      <StreamlinedSolver />
    </div>
  )
}
