import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UtSbcChallengePage } from './UtSbcChallengePage'

const kb = vi.hoisted(() => ({
  set: {
    id: 77, name: 'Upgrade', repeatable: null,
    challenges: [
      { id: 1, setId: 77, name: 'Squad işi', kind: 'SQUAD', requirements: [], formation: '4-4-2' },
      { id: 2, setId: 77, name: 'Puan işi', kind: 'ITEM_SCORE', requirements: [], itemScoreTarget: 2500 },
    ],
  },
}))
vi.mock('../api/endpoints', () => ({ endpoints: { formations: () => Promise.resolve([]), kbSbcSet: () => Promise.resolve(kb.set) } }))
vi.mock('../state/utCaptureStore', () => ({ useUtCapture: () => undefined }))
vi.mock('../components/SbcVote', () => ({ SbcVote: () => null, useSbcVotes: () => new Map() }))
vi.mock('../components/TraditionalSbc', () => ({ TraditionalSbc: () => <p>BEAM-COZUCU</p> }))
vi.mock('../components/StreamlinedSolver', () => ({ StreamlinedSolver: ({ initialTarget }: { initialTarget?: number }) => <p>HEDEF-SKOR-COZUCU {initialTarget}</p> }))

const open = (path: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes><Route path="/ut/sbc/:setId/:challengeId" element={<UtSbcChallengePage />} /></Routes></MemoryRouter>
  </QueryClientProvider>,
)

describe('UtSbcChallengePage (WEB-BUG-04)', () => {
  it('item-score challenge streamlined çözücüyü hedef skorla açar, beam çözücü çalışmaz', async () => {
    open('/ut/sbc/77/2')
    expect(await screen.findByText(/HEDEF-SKOR-COZUCU 2500/)).toBeInTheDocument()
    expect(screen.queryByText('BEAM-COZUCU')).toBeNull()
  })

  it('squad challenge beam çözücüyü açar', async () => {
    open('/ut/sbc/77/1')
    expect(await screen.findByText('BEAM-COZUCU')).toBeInTheDocument()
  })
})
