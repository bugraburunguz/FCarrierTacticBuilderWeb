import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CareerPlayer } from '../api/types'
import { TransferDialog } from './TransferDialog'

vi.mock('../api/endpoints', () => ({ endpoints: { clubs: vi.fn(() => Promise.resolve([])) } }))

const entry = { player: { id: 3, name: 'Oyuncu 3', overall: 70, positions: ['ST'], valuationEstimated: false }, onLoan: false } as CareerPlayer

/** REVIEW O2: satış/kiralık bedeli diğer ekranlarla aynı para girişiyle (birim seçili); "2,5" milyon olarak gider, ham € değil. */
describe('TransferDialog bedel girişi', () => {
  it('"2,5" + Milyon € → 2.500.000 €; geçersiz tutarda onay pasif', () => {
    const onSubmit = vi.fn()
    render(<QueryClientProvider client={new QueryClient()}><TransferDialog mode="SELL" entry={entry} pending={false} error={null} onClose={() => undefined} onSubmit={onSubmit} /></QueryClientProvider>)
    const amount = screen.getByRole('textbox', { name: /bedel/i })
    fireEvent.change(amount, { target: { value: '2,5' } })
    fireEvent.click(screen.getByRole('button', { name: /Satışı onayla/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ feeEur: 2_500_000 }))

    fireEvent.change(amount, { target: { value: '1,2,3' } })
    expect(screen.getByRole('button', { name: /Satışı onayla/ })).toBeDisabled()
  })
})
