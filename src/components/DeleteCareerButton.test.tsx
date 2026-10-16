import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { DeleteCareerButton } from './DeleteCareerButton'

vi.mock('../api/endpoints', () => ({ endpoints: { deleteCareer: vi.fn(() => Promise.resolve()) } }))

const career = { id: 7, name: 'Magdeburg Yolu', clubName: '1. FC Magdeburg' } as Career

function renderButton() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DeleteCareerButton career={career} />
    </QueryClientProvider>,
  )
}

describe('F9: kariyer silme onayı kariyer adını yazdırır', () => {
  beforeEach(() => vi.clearAllMocks())

  it('diyalog açılır; ad yazılana kadar silme pasif, doğru ad yazılınca çalışır', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))

    const confirm = await screen.findByRole('button', { name: 'Kalıcı olarak sil' })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Onaylamak için kariyer adını yaz/), { target: { value: 'Yanlış ad' } })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Onaylamak için kariyer adını yaz/), { target: { value: 'Magdeburg Yolu' } })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    await waitFor(() => expect(endpoints.deleteCareer).toHaveBeenCalledWith(7))
  })

  it('Vazgeç diyaloğu kapatır ve hiçbir şey silmez', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Vazgeç' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(endpoints.deleteCareer).not.toHaveBeenCalled()
  })
})
