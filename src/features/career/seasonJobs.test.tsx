import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CareerPlayer } from '../../api/types'
import { SeasonJobs } from './SeasonJobs'

vi.mock('../../api/endpoints', () => ({
  endpoints: {
    playerTags: vi.fn(() => Promise.resolve([])),
    academy: vi.fn(() => Promise.resolve({ found: true, teamId: 9, name: 'Kulüp Youth Academy', message: null, players: [
      { playerId: 41, name: 'Kyle Preston', positions: ['CM'], youthVerified: false,
        promote: { position: 'CDM', strength1: 62, backupName: 'Smith', backupStrength: 60, text: 'Kyle Preston · 1 sezon sonra tahmini CDM gücü 62, yedek Smith 60. Bu bir tahmin; A takıma alma oyunda yapılır.' } },
    ] })),
  },
}))

const squad = Array.from({ length: 11 }, (_, i) => ({ player: { id: i + 1, name: `P${i + 1}`, overall: 70, age: 26, positions: ['CM'], potential: 72 }, onLoan: false })) as CareerPlayer[]

/** ACADEMY-b: Masa "Bu dönemin 3 işi"nde "Altyapıdan A takıma al" işi (Altyapı etiketi, Altyapı paneline bağlantı). */
describe('SeasonJobs + altyapı', () => {
  it('altyapıda "A takıma al" önerisi varsa iş listede', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><SeasonJobs careerId={7} squad={squad} rows={[]} /></MemoryRouter>
      </QueryClientProvider>,
    )
    const job = (await screen.findByText('Altyapıdan A takıma al: Kyle Preston')).closest('li')!
    expect(within(job).getByText('Altyapı')).toBeInTheDocument()
    expect(within(job).getByText(/Bu bir tahmin/)).toBeInTheDocument()
    expect(within(job).getByRole('link', { name: 'Gör' })).toHaveAttribute('href', '/career/academy?oyuncu=41')
  })
})
