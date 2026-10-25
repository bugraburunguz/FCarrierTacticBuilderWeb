import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { careerStore } from '../state/careerStore'
import { labStore } from '../state/labStore'
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
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    labStore.reload()
  })

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

  /** KARIYER-UX (15 §6.2): kariyer silinince o kariyerin Lab taslakları da gider; diğer kariyerlerinkiler kalır. */
  it('silme başarılı olunca kariyerin Lab taslakları silinir, diğerleri kalır', async () => {
    const tactic = { formation: '4-3-3', slots: {} }
    labStore.create(7, { name: 'A', origin: { kind: 'blank' }, tactic, lineup: {} })
    labStore.create(8, { name: 'B', origin: { kind: 'blank' }, tactic, lineup: {} })
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    fireEvent.change(await screen.findByLabelText(/Onaylamak için kariyer adını yaz/), { target: { value: 'Magdeburg Yolu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kalıcı olarak sil' }))

    await waitFor(() => expect(labStore.get(7).drafts).toEqual([]))
    expect(labStore.get(8).drafts).toHaveLength(1)
  })

  it('REVIEW O4: silinen kariyerin sorguları önbellekten kalkar; aktif seçim kalan kariyere geçer (seçimsiz sayfa kalmaz)', async () => {
    const client = new QueryClient()
    client.setQueryData(['careers'], [career, { id: 9, name: 'Diğer' }])
    client.setQueryData(['squad', 7], [{ id: 1 }])
    client.setQueryData(['slot-fit', 'lineup', 7, '{}', '{}'], { slots: [] })
    client.setQueryData(['squad', 9], [{ id: 2 }])
    careerStore.set(7)
    render(<QueryClientProvider client={client}><DeleteCareerButton career={career} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    fireEvent.change(await screen.findByLabelText(/Onaylamak için kariyer adını yaz/), { target: { value: 'Magdeburg Yolu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kalıcı olarak sil' }))
    await waitFor(() => expect(client.getQueryData(['squad', 7])).toBeUndefined())
    expect(client.getQueryData(['slot-fit', 'lineup', 7, '{}', '{}'])).toBeUndefined()
    expect(client.getQueryData(['squad', 9])).toEqual([{ id: 2 }])
    expect(careerStore.get()).toBe(9)
  })

  it('silme başarısızsa taslaklar kalır', async () => {
    vi.mocked(endpoints.deleteCareer).mockRejectedValueOnce(new Error('ağ'))
    labStore.create(7, { name: 'A', origin: { kind: 'blank' }, tactic: { formation: '4-3-3', slots: {} }, lineup: {} })
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    fireEvent.change(await screen.findByLabelText(/Onaylamak için kariyer adını yaz/), { target: { value: 'Magdeburg Yolu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kalıcı olarak sil' }))

    await waitFor(() => expect(endpoints.deleteCareer).toHaveBeenCalled())
    expect(labStore.get(7).drafts).toHaveLength(1)
  })

  it('Vazgeç diyaloğu kapatır ve hiçbir şey silmez', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Kariyeri sil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Vazgeç' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(endpoints.deleteCareer).not.toHaveBeenCalled()
  })
})
