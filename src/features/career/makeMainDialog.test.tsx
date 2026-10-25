import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { MakeMainDialog } from './MakeMainDialog'

vi.mock('../../api/endpoints', () => ({
  endpoints: { userTactics: vi.fn(() => Promise.resolve([])), saveUserTactic: vi.fn(() => Promise.resolve({})), setMainTactic: vi.fn(() => Promise.resolve({})) },
}))

function renderDialog(name: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MakeMainDialog careerId={7} name={name} tactic={{ formation: '4-3-3', slots: {} }} lineup={{}} onClose={() => undefined} />
    </QueryClientProvider>,
  )
}

/** FAZ 6a-F: "Ana taktiğim yap"ta ad sorulur; göçten gelen "Önceki taslak" adı varsayılan olarak "Ana taktik · <formasyon>" olur. */
describe('MakeMainDialog ad', () => {
  beforeEach(() => vi.clearAllMocks())

  it('göç adı yerine "Ana taktik · 4-3-3" önerilir; kullanıcının yazdığı ad kaydedilir', async () => {
    renderDialog('Önceki taslak')
    const input = screen.getByLabelText('Ana taktik adı') as HTMLInputElement
    expect(input.value).toBe('Ana taktik · 4-3-3')
    fireEvent.change(input, { target: { value: 'Gegenpress' } })
    fireEvent.click(screen.getByRole('radio', { name: /Slot 1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet ve ana taktik yap' }))
    await waitFor(() => expect(endpoints.saveUserTactic).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Gegenpress' })))
  })

  it('boş ad kaydedilmez', () => {
    renderDialog('Deneme')
    fireEvent.change(screen.getByLabelText('Ana taktik adı'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('radio', { name: /Slot 1/ }))
    expect(screen.getByRole('button', { name: 'Kaydet ve ana taktik yap' })).toBeDisabled()
  })
})
