import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { TraditionalSbc } from '../components/TraditionalSbc'
import { SbcVote, useSbcVotes } from '../components/SbcVote'
import { Card, Skeleton } from '../components/ui'
import { challengeSetup, describeRequirement } from '../lib/sbcChallenge'
import { kbChallenges } from '../lib/kbSbc'
import { useUtCapture } from '../state/utCaptureStore'

export function UtSbcChallengePage() {
  const { setId, challengeId } = useParams()
  const capture = useUtCapture()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const captured = (capture?.sbcChallenges ?? []).filter((c) => String(c.setId) === setId)
  const kb = useQuery({ queryKey: ['kb-sbc-set', setId], queryFn: () => endpoints.kbSbcSet(Number(setId)), enabled: Boolean(setId) && captured.length === 0, retry: false, staleTime: 60_000 })
  const siblings = captured.length > 0 ? captured : kbChallenges(kb.data)
  const challenge = challengeId ? siblings.find((c) => String(c.challengeId) === challengeId) : siblings.find((c) => c.status !== 'COMPLETED') ?? siblings[0]
  const votes = useSbcVotes()
  const setName = capture?.sbcSets.find((s) => String(s.setId) === setId)?.name ?? kb.data?.name
  const setup = challenge && formations.data ? challengeSetup(challenge, formations.data) : undefined
  if (!challenge && kb.isLoading) {
    return (
      <Card title="SBC yükleniyor">
        <Skeleton className="h-24" />
      </Card>
    )
  }
  if (!challenge) {
    return (
      <Card title={setName ?? 'SBC bulunamadı'}>
        <p className="text-sm text-muted">Bu SBC'nin şartları henüz bilgi tabanında ve yakaladığın veride yok. Web App'te bu SBC setini aç ve Kulüp içe aktar'dan senkronla; ya da bir katkıcının girmesini bekle. <Link className="underline" to="/ut/sbc">SBC listesine dön</Link></p>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link className="text-sm underline" to="/ut/sbc">← SBC listesi</Link>
        <SbcVote setId={challenge.setId} votes={votes.get(challenge.setId)} />
      </div>
      {siblings.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {siblings.map((c) => (
            <Link key={c.challengeId} to={`/ut/sbc/${c.setId}/${c.challengeId}`} className={`rounded-md border px-2 py-1 text-xs ${c.challengeId === challenge.challengeId ? 'border-accent bg-accent/10 font-semibold' : 'border-line'}`}>{c.name}</Link>
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
          <div className="mt-2 text-xs text-code">
            <p className="font-semibold">Çözücünün zorlayamadığı şartlar (elle kontrol et):</p>
            <ul className="list-disc pl-4">{setup.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </Card>
      <TraditionalSbc key={challenge.challengeId} challenge={challenge} autoRun />
    </div>
  )
}
