import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import type { SbcSetVotes } from '../api/types'

const KEY = ['sbc-votes']

export function useSbcVotes() {
  const query = useQuery({ queryKey: KEY, queryFn: endpoints.sbcVotes, staleTime: 60_000, retry: false })
  return new Map((query.data?.sets ?? []).map((v) => [v.setId, v]))
}

/** SBC için beğen / beğenme: herkesin oyları toplanır, kendi oyun vurgulanır; aynı düğmeye tekrar basınca oy geri alınır. */
export function SbcVote({ setId, votes }: { setId: number; votes?: SbcSetVotes }) {
  const client = useQueryClient()
  const vote = useMutation({
    mutationFn: (value: number) => endpoints.sbcVote(setId, value),
    onSuccess: (updated) =>
      client.setQueryData<{ sets: SbcSetVotes[] }>(KEY, (cur) => ({ sets: [...(cur?.sets ?? []).filter((s) => s.setId !== setId), updated] })),
  })
  const mine = votes?.mine ?? 0
  const button = (value: 1 | -1, label: string, count: number, title: string) => (
    <button
      type="button"
      title={title}
      aria-pressed={mine === value}
      disabled={vote.isPending}
      onClick={() => vote.mutate(mine === value ? 0 : value)}
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums transition ${mine === value ? (value === 1 ? 'border-accent bg-accent-bg/20' : 'border-danger-line bg-danger/20') : 'border-line bg-surface-2 hover:bg-line'}`}
    >
      {label} {count}
    </button>
  )
  return (
    <span className="inline-flex items-center gap-1">
      {button(1, '👍', votes?.up ?? 0, 'Yapmaya değer')}
      {button(-1, '👎', votes?.down ?? 0, 'Gereksiz pahalı / kötü SBC')}
    </span>
  )
}
