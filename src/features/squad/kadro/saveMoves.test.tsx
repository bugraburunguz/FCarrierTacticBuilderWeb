import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CareerMove } from '../../../api/types'
import { endpoints } from '../../../api/endpoints'
import { SaveMoves } from './SaveMoves'

vi.mock('../../../api/endpoints', () => ({ endpoints: { careerMoves: vi.fn() } }))

const move = (m: Partial<CareerMove>): CareerMove => ({ type: 'TRANSFER_IN', playerId: 1, name: 'Oyuncu', sinceStart: false, ...m })

function renderMoves(moves: CareerMove[]) {
  vi.mocked(endpoints.careerMoves).mockResolvedValue(moves)
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><SaveMoves careerId={7} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Kayda göre hareketler (ana kayıtla fark)', () => {
  it('gelenler ve gidenler türüne göre; nereden → nereye; sezon başından kiralık işaretli; bedel yok', async () => {
    renderMoves([
      move({ type: 'TRANSFER_IN', playerId: 1, name: 'Abdellah Ouazane', overall: 66, position: 'CAM', fromClub: 'Ajax', toClub: 'Port Vale' }),
      move({ type: 'LOAN_IN', playerId: 2, name: 'Keyrol', fromClub: 'Liverpool', toClub: 'Port Vale', sinceStart: true }),
      move({ type: 'NEW_PLAYER', playerId: 3, name: 'Ellis Hubbard', toClub: 'Port Vale' }),
      move({ type: 'TRANSFER_OUT', playerId: 4, name: 'Jordan Gabriel', fromClub: 'Port Vale', toClub: 'Hertha BSC' }),
      move({ type: 'LOAN_OUT', playerId: 5, name: 'Jack Shorrock', fromClub: 'Port Vale', toClub: 'Sligo Rovers' }),
    ])
    const incoming = await screen.findByRole('region', { name: 'Gelenler (3)' })
    expect(within(incoming).getByText('Abdellah Ouazane')).toBeInTheDocument()
    expect(within(incoming).getByText('Transfer')).toBeInTheDocument()
    expect(within(incoming).getByText('Ajax →')).toBeInTheDocument()
    expect(within(incoming).getByText('Kiralık')).toBeInTheDocument()
    expect(within(incoming).getByText('sezon başından')).toBeInTheDocument()
    expect(within(incoming).getByText('Yeni oyuncu')).toBeInTheDocument()
    const outgoing = screen.getByRole('region', { name: 'Gidenler (2)' })
    expect(within(outgoing).getByText('→ Hertha BSC')).toBeInTheDocument()
    expect(within(outgoing).getByText('Kiralık')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abdellah Ouazane' })).toHaveAttribute('href', '/players/1')
  })

  it('fark yoksa kısa boş durum', async () => {
    renderMoves([])
    expect(await screen.findByText(/Ana kayda göre kadroda değişiklik yok/)).toBeInTheDocument()
  })
})
