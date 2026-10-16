import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { displayName, UserMenu } from './UserMenu'

describe('kullanıcı menüsü', () => {
  it('görünen ad e-postanın yerel kısmından türetilir, ilk harf avatar olur', () => {
    expect(displayName('bugra.b@example.com')).toBe('Bugra.b')
    expect(displayName('x@y.z')).toBe('X')
  })

  it('üst barda e-posta görünmez; menü açılınca e-posta, profil ve çıkış gelir', () => {
    const logout = vi.fn()
    render(<MemoryRouter><UserMenu email="bugra@example.com" onLogout={logout} /></MemoryRouter>)
    expect(document.body.textContent).not.toContain('bugra@example.com')
    const trigger = screen.getByRole('button', { name: /Hesap menüsü/ })
    expect(trigger).toHaveTextContent('B')
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
    fireEvent.click(trigger)
    expect(screen.getByText('bugra@example.com')).toHaveAttribute('data-private')
    expect(screen.getByRole('link', { name: 'Profil' })).toHaveAttribute('href', '/profile')
    fireEvent.click(screen.getByRole('button', { name: 'Çıkış' }))
    expect(logout).toHaveBeenCalled()
  })
})
