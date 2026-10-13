import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { NewCareerForm } from './NewCareerForm'

vi.mock('../api/endpoints', () => ({
  endpoints: {
    clubs: vi.fn(() => Promise.resolve([{ id: 7, name: 'Port Vale', league: 'League Two', gender: 0 }])),
    createCareer: vi.fn(() => Promise.resolve({ id: 99 })),
  },
}))

const renderForm = () => render(<QueryClientProvider client={new QueryClient()}><NewCareerForm /></QueryClientProvider>)

describe('NewCareerForm (WEB-BUG-10)', () => {
  it('ad yazılırken ve kulüp seçilirken bütçe metni ve birimi korunur', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Tutar'), '2,5')
    await user.selectOptions(screen.getByLabelText('Birim'), 'K')
    await user.type(screen.getByPlaceholderText('Örn. Port Vale 2026'), 'Port Vale 2026')
    await user.type(screen.getByLabelText('Kulüp ara'), 'Port')
    await user.click(await screen.findByRole('button', { name: /Port Vale/ }))

    expect(screen.getByLabelText('Tutar')).toHaveValue('2,5')
    expect(screen.getByLabelText('Birim')).toHaveValue('K')
  })

  it('kariyer oluşturulunca bütçe alanı sıfırlanır', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Tutar'), '5')
    await user.type(screen.getByLabelText('Kulüp ara'), 'Port')
    await user.click(await screen.findByRole('button', { name: /Port Vale/ }))
    await user.click(screen.getByRole('button', { name: 'Başlat' }))

    await waitFor(() => expect(endpoints.createCareer).toHaveBeenCalledWith({ clubId: 7, budgetEur: 5_000_000, name: undefined }))
    await waitFor(() => expect(screen.getByLabelText('Tutar')).toHaveValue(''))
  })
})
