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

describe('RoleFocusPanel oyuncuya göre (FIT-2 madde 6)', () => {
  it('rol ve odaklar bu oyuncunun Rol oturmasıyla yazılır, en uygun önce', () => {
    const groups = [
      { base: 'Winger', options: [{ focus: 'Balanced', roleId: 'w_b' }] },
      { base: 'Inside Forward', options: [{ focus: 'Attack', roleId: 'if_a' }] },
    ]
    const fits = new Map([
      ['w_b', { roleId: 'w_b', roleName: 'Winger (Balanced)', currentFit: 60, levelFit: 40 }],
      ['if_a', { roleId: 'if_a', roleName: 'Inside Forward (Attack)', currentFit: 70, levelFit: 71 }],
    ])
    render(<RoleFocusPanel {...base} groups={groups} currentRoleId="w_b" fits={fits} />)
    const radios = screen.getAllByRole('radio', { name: /Winger|Inside Forward/ })
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['Inside ForwardRol oturması %71', 'WingerRol oturması %40'])
    expect(screen.getByRole('radio', { name: /Balanced/ })).toHaveTextContent('%40')
  })
})

