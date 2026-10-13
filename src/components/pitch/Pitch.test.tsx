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

  it('rol etiketi yoksa çip çizilmez', () => {
    render(<Pitch slots={[{ ...empty, roleLabel: undefined }]} onPickPlayer={() => undefined} onPickRole={() => undefined} />)
    expect(screen.queryByRole('button', { name: /Hücum/ })).toBeNull()
  })
})
