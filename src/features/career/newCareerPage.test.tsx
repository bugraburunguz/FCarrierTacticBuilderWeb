import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { careerStore } from '../../state/careerStore'
import { NewCareerPage } from './NewCareerPage'

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { clubs: vi.fn(), createCareer: vi.fn(), updateCareer: vi.fn(), careers: vi.fn(), deleteCareer: vi.fn() } }))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/career/new']}>
        <Routes><Route path="/career/new" element={<NewCareerPage />} /><Route path="/career/dashboard" element={<p>masa açıldı</p>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const pickClub = async () => {
  fireEvent.change(screen.getByLabelText('Kulüp'), { target: { value: 'Crewe' } })
  fireEvent.click(await screen.findByRole('option', { name: /Crewe Alexandra/ }))
}

beforeEach(() => {
  vi.mocked(endpoints.clubs).mockResolvedValue([{ id: 9, name: 'Crewe Alexandra', league: 'EFL League Two' }] as never)
  vi.mocked(endpoints.createCareer).mockReset().mockResolvedValue({ id: 42, clubId: 9, gameVersionId: 27, squadSize: 27 } as never)
  vi.mocked(endpoints.updateCareer).mockReset().mockResolvedValue({ id: 42 } as never)
  vi.mocked(endpoints.careers).mockResolvedValue([] as never)
})

describe('Yeni kariyer (v3)', () => {
  it('kulüp seçilmeden oluşturulamaz; kulüp araması Takımlar ucuyla', async () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Kariyeri oluştur' })).toBeDisabled()
    await pickClub()
    expect(endpoints.clubs).toHaveBeenCalledWith('Crewe')
    expect(screen.getByRole('button', { name: 'Kariyeri oluştur' })).toBeEnabled()
  })

  it('bütçe boşsa 0 gönderilmez (bilinmiyor, ENG-02); oluşturunca aktif kariyer olur ve Masa açılır', async () => {
    renderPage()
    await pickClub()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri oluştur' }))
    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalled())
    const body = vi.mocked(endpoints.createCareer).mock.calls[0][0]
    expect(body).toEqual({ clubId: 9 })
    expect(body).not.toHaveProperty('budgetEur')
    expect(await screen.findByText('masa açıldı')).toBeInTheDocument()
    expect(careerStore.get()).toBe(42)
    expect(endpoints.updateCareer).not.toHaveBeenCalled()
  })

  it('bütçe, sezon ve oyun tarihi: bütçe/sezon oluşturmada, oyun tarihi ardından kariyere yazılır', async () => {
    renderPage()
    await pickClub()
    fireEvent.change(screen.getByLabelText('Transfer bütçesi'), { target: { value: '2,5' } })
    fireEvent.change(screen.getByLabelText('Sezon'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Oyun tarihi'), { target: { value: '2027-07-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri oluştur' }))
    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalledWith({ clubId: 9, budgetEur: 2_500_000, season: 2 }))
    await waitFor(() => expect(endpoints.updateCareer).toHaveBeenCalledWith(42, { gameDate: '2027-07-01' }))
    expect(await screen.findByText('masa açıldı')).toBeInTheDocument()
  })
})
