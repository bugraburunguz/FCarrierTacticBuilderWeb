import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import { ShortlistButton } from './ShortlistButton'

vi.mock('../api/endpoints', () => ({
  endpoints: { shortlist: vi.fn(), shortlistAdd: vi.fn(() => Promise.resolve()), shortlistRemove: vi.fn(() => Promise.resolve()) },
}))

const renderButton = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  render(<QueryClientProvider client={client}><ShortlistButton careerId={7} playerId={50} note="CM · Box-to-Box" /></QueryClientProvider>)
  return client
}

beforeEach(() => {
  vi.mocked(endpoints.shortlist).mockReset().mockResolvedValue([])
  vi.mocked(endpoints.shortlistAdd).mockClear()
  vi.mocked(endpoints.shortlistRemove).mockClear()
})

/** KARIYER-UX FAZ 5 (15 §4.4): "Kısa listeye ekle" köprüsü; her yerde aynı mutation (PUT /shortlist/{pid}) ve ['shortlist', id] tazelenir. */
describe('ShortlistButton', () => {
  it('listede değilse ekler (PUT, not ile) ve kısa listeyi tazeler', async () => {
    const client = renderButton()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const button = await screen.findByRole('button', { name: 'Kısa listeye ekle', pressed: false })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(endpoints.shortlistAdd).toHaveBeenCalledWith(7, 50, { note: 'CM · Box-to-Box' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['shortlist', 7] }))
  })

  it('listedeyse "Listede" basılı; tıklayınca çıkarır', async () => {
    vi.mocked(endpoints.shortlist).mockResolvedValue([{ playerId: 50 }] as never)
    renderButton()
    fireEvent.click(await screen.findByRole('button', { name: 'Listede', pressed: true }))
    await waitFor(() => expect(endpoints.shortlistRemove).toHaveBeenCalledWith(7, 50))
  })
})
