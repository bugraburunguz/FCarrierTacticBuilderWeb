import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { TraditionalSbc } from '../components/TraditionalSbc'
import { Card } from '../components/ui'
import { challengeSetup, describeRequirement } from '../lib/sbcChallenge'
import { useUtCapture } from '../state/utCaptureStore'

export function UtSbcChallengePage() {
  const { setId, challengeId } = useParams()
  const capture = useUtCapture()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const siblings = (capture?.sbcChallenges ?? []).filter((c) => String(c.setId) === setId)
  const challenge = challengeId ? siblings.find((c) => String(c.challengeId) === challengeId) : siblings.find((c) => c.status !== 'COMPLETED') ?? siblings[0]
  const setName = capture?.sbcSets.find((s) => String(s.setId) === setId)?.name
  const setup = challenge && formations.data ? challengeSetup(challenge, formations.data) : undefined
  if (!challenge) {
    return (
      <Card title={setName ?? 'SBC bulunamadı'}>
        <p className="text-sm text-muted">Bu SBC'nin şartları yakalanan veride yok. Extension açıkken EA Web App'te bu SBC setini aç (challenge'lar yüklensin), sonra dosyayı Kulüp içe aktar'dan yeniden yükle. <Link className="underline" to="/ut/sbc">SBC listesine dön</Link></p>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      <Link className="text-sm underline" to="/ut/sbc">← SBC listesi</Link>
      {siblings.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {siblings.map((c) => (
            <Link key={c.challengeId} to={`/ut/sbc/${c.setId}/${c.challengeId}`} className={`rounded-lg border px-2 py-1 text-xs ${c.challengeId === challenge.challengeId ? 'border-accent bg-accent/10 font-semibold' : 'border-line'}`}>{c.name}</Link>
          ))}
        </div>
      )}
      <Card title={`${challenge.setName ?? 'SBC'} · ${challenge.name}`}>
        <ul className="flex flex-wrap gap-1 text-xs">
          {challenge.requirements.map((r, i) => (
            <li key={i} className="rounded border border-line bg-surface-2 px-1.5 py-0.5">{describeRequirement(r)}</li>
          ))}
        </ul>
        {setup && setup.notes.length > 0 && (
          <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            <p className="font-semibold">Çözücünün zorlayamadığı şartlar (elle kontrol et):</p>
            <ul className="list-disc pl-4">{setup.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </Card>
      <TraditionalSbc key={challenge.challengeId} challenge={challenge} autoRun />
    </div>
  )
}
