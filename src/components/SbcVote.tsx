import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { endpoints } from '../api/endpoints'
import type { SbcSetVotes } from '../api/types'

const KEY = ['sbc-votes']

export function useSbcVotes() {
  const query = useQuery({ queryKey: KEY, queryFn: endpoints.sbcVotes, staleTime: 60_000, retry: false })
  return new Map((query.data?.sets ?? []).map((v) => [v.setId, v]))
}

/**
 * SBC oyu (DS-04 VoteControl): yukarı/aşağı ok + sayı + yüzde çubuğu. Aynı düğmeye tekrar basmak oyu geri alır.
 * Durum renk + yön oku + sayıyla verilir; seçili oy aria-pressed ile bildirilir.
 */
export function SbcVote({ setId, votes }: { setId: number; votes?: SbcSetVotes }) {
  const client = useQueryClient()
  const vote = useMutation({
    mutationFn: (value: number) => endpoints.sbcVote(setId, value),
    onSuccess: (updated) =>
      client.setQueryData<{ sets: SbcSetVotes[] }>(KEY, (cur) => ({ sets: [...(cur?.sets ?? []).filter((s) => s.setId !== setId), updated] })),
  })
  const mine = votes?.mine ?? 0
  const up = votes?.up ?? 0
  const down = votes?.down ?? 0
  const total = up + down
  const pct = total === 0 ? 0 : Math.round((up / total) * 100)
  const button = (value: 1 | -1, count: number, title: string) => (
    <button
      type="button"
      title={title}
      aria-label={`${title}: ${count} oy`}
      aria-pressed={mine === value}
      disabled={vote.isPending}
      onClick={() => vote.mutate(mine === value ? 0 : value)}
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-semibold transition ${mine === value ? (value === 1 ? 'border-good bg-good-soft text-good' : 'border-danger bg-danger-soft text-danger') : 'border-line bg-surface-2 text-muted hover:text-ink'}`}
    >
      {value === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
      <span className="num">{count}</span>
    </button>
  )
  return (
    <span className="inline-flex items-center gap-1.5">
      {button(1, up, 'Yapmaya değer')}
      {button(-1, down, 'Gereksiz pahalı / kötü SBC')}
      {total > 0 && (
        <span className="hidden items-center gap-1 text-[11px] text-muted sm:inline-flex" title={`${total} oyun %${pct}'i olumlu`}>
          <span className="inline-block h-1.5 w-12 overflow-hidden rounded-sm bg-danger-soft">
            <span className="block h-full bg-good" style={{ width: `${pct}%` }} />
          </span>
          <span className="num">%{pct}</span>
        </span>
      )}
    </span>
  )
}
