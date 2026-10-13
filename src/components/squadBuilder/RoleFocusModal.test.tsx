import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RoleFocusPanel } from './RoleFocusModal'

const base = { position: 'RM', groups: [], currentRoleId: '', onApply: vi.fn(), onClose: vi.fn() }

describe('RoleFocusPanel kilidi (TAC-10)', () => {
  it('EA rol listesi yüklenirken seçim yok, hata olunca yeniden dene sunar', async () => {
    const retry = vi.fn()
    const { rerender } = render(<RoleFocusPanel {...base} lock={{ status: 'loading', retry }} />)
    expect(screen.getByRole('status')).toHaveTextContent('yükleniyor')
    expect(screen.queryByRole('button', { name: 'Uygula' })).toBeNull()

    rerender(<RoleFocusPanel {...base} lock={{ status: 'error', retry }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
