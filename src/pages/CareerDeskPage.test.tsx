import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { careerStore } from '../state/careerStore'
import { CareerDeskPage } from './CareerDeskPage'

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../api/endpoints', () => {
  const none = () => Promise.resolve([])
  return {
    endpoints: {
      careers: vi.fn(), squad: none, lineup: () => Promise.reject(new Error('yok')), snapshotDiff: () => Promise.reject(new Error('yok')), snapshots: none,
      playerTags: none, events: none, updateCareer: vi.fn(() => Promise.resolve({})),
    },
  }
})

const career = (id: number, name: string, wage: number, spoilerMode: 'SHOW' | 'SCOUT_RANGE'): Career =>
  ({ id, name, clubId: id, clubName: name, budgetEur: 1_000_000, wageBudgetEur: wage, spoilerMode, squadSize: 0, season: 1 }) as Career

describe('CareerDeskPage ayarları', () => {
  beforeEach(() => {
    vi.mocked(endpoints.careers).mockResolvedValue([career(1, 'A Kulübü', 250_000, 'SHOW'), career(2, 'B Kulübü', 80_000, 'SCOUT_RANGE')])
    vi.mocked(endpoints.updateCareer).mockClear()
    careerStore.set(1)
  })

  it('kariyer değişince form seçili kariyerin değerlerini gösterir, kaydetmek yalnız onu değiştirir', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><CareerDeskPage /></MemoryRouter></QueryClientProvider>)

    const wage = await screen.findByLabelText('Tutar')
    expect(wage).toHaveValue('250')
    expect(screen.getByLabelText('Potansiyel gösterimi')).toHaveValue('SHOW')

    act(() => careerStore.set(2))
    await waitFor(() => expect(screen.getByLabelText('Tutar')).toHaveValue('80'))
    expect(screen.getByLabelText('Potansiyel gösterimi')).toHaveValue('SCOUT_RANGE')

    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))
    await waitFor(() => expect(endpoints.updateCareer).toHaveBeenCalled())
    expect(vi.mocked(endpoints.updateCareer).mock.calls[0][0]).toBe(2)
    expect(vi.mocked(endpoints.updateCareer).mock.calls[0][1]).toMatchObject({ spoilerMode: 'SCOUT_RANGE', wageBudgetEur: 80_000 })
  })
})
