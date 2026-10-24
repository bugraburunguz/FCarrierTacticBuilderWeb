import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReplicaSummary } from '../../api/types'
import { Button } from '../../design/components/primitives'
import { cloneReplicaToDraft } from './labSources'

/**
 * "Klonla → taslak" (KARIYER-UX 6, tek başına /replicas listesi): Lab › Replikalar ve replika detayıyla aynı akış (`cloneReplicaToDraft`):
 * replika taktiği + kadromla diziliş yeni taslak olur, Lab kurucusu açılır. Taslak sınırı doluysa nedeni düğmenin altında yazar.
 */
export function ReplicaCloneButton({ careerId, replica }: { careerId: number; replica: ReplicaSummary }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const clone = useMutation({
    mutationFn: () => cloneReplicaToDraft(client, careerId, replica),
    onSuccess: (result) => {
      if (result.ok) {
        navigate('/career/tactics-lab?sekme=kurucu')
      }
    },
  })
  const failure = clone.data && !clone.data.ok ? clone.data.message : clone.isError ? 'Replika kadroya uygulanamadı. Tekrar dene.' : undefined
  return (
    <span className="flex flex-col items-start gap-1">
      <Button disabled={clone.isPending} onClick={() => clone.mutate()}>
        <Copy size={14} aria-hidden="true" />{clone.isPending ? 'Açılıyor…' : 'Klonla → taslak'}
      </Button>
      {failure && <span role="alert" className="text-xs text-bad">{failure}</span>}
    </span>
  )
}
