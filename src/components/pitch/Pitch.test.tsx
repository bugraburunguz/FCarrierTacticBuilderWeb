import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pitch, type PitchSlot } from './Pitch'

const empty: PitchSlot = { slotId: 'ST', position: 'ST', x: 50, y: 20, roleLabel: 'Hedef Forvet · Hücum' }

describe('Pitch (WEB-BUG-11)', () => {
  it('boş slotta da rol çipi görünür ve tıklanınca rol seçimi açılır', async () => {
    const onPickRole = vi.fn()
    const onPickPlayer = vi.fn()
    render(<Pitch slots={[empty]} onPickPlayer={onPickPlayer} onPickRole={onPickRole} />)

    await userEvent.click(screen.getByRole('button', { name: 'Hedef Forvet · Hücum' }))

    expect(onPickRole).toHaveBeenCalledWith('ST')
    expect(onPickPlayer).not.toHaveBeenCalled()
  })

  it('FCA-12: telefonda rol çipi ve "×" düğmesi görünüm ve yerleşim değişmeden 44 px dokunma alanı taşır (::before)', () => {
    const filled: PitchSlot = { ...empty, player: { id: 1, name: 'Oyuncu Bir', overall: 70 } as never }
    render(<Pitch slots={[filled]} onPickPlayer={() => undefined} onPickRole={() => undefined} onRemove={() => undefined} />)
    const role = screen.getByRole('button', { name: 'Hedef Forvet · Hücum' })
    expect(role).toHaveAttribute('data-hit-area')
    expect(role.className).toMatch(/\brelative\b/)
    expect(role.className).toContain('max-sm:before:-inset-y-3.5')
    const remove = screen.getByRole('button', { name: 'Oyuncu Bir kartını kaldır' })
    expect(remove).toHaveAttribute('data-hit-area')
    // Alan karttan dışarı (sol-üst) büyür: kartın örtülen köşesi eskisi kadar kalır.
    expect(remove.className).toContain('max-sm:before:-left-4')
    expect(remove.className).toContain('max-sm:before:-top-4')
    expect(remove.className).toContain('max-sm:before:right-0')
    expect(remove.className).toContain('max-sm:before:bottom-0')
  })

  it('rol etiketi yoksa çip çizilmez', () => {
    render(<Pitch slots={[{ ...empty, roleLabel: undefined }]} onPickPlayer={() => undefined} onPickRole={() => undefined} />)
    expect(screen.queryByRole('button', { name: /Hücum/ })).toBeNull()
  })
})
