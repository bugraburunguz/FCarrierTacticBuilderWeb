import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { themeStore } from '../../state/themeStore'
import { MobileMenu, ThemeToggle } from './ThemeToggle'

describe('F7: tema düğmesi', () => {
  beforeEach(() => themeStore.set('dark'))

  it('ikonlu düğmenin aria-label\'ı bir sonraki durumu söyler ve döngü ilerler', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Açık temaya geç' })).toBeInTheDocument()
    expect(screen.queryByText('Koyu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Açık temaya geç' }))
    expect(screen.getByRole('button', { name: 'Sistem temasına geç' })).toBeInTheDocument()
  })

  it('mobil menü tema düğmesini içerir', () => {
    render(<MemoryRouter><MobileMenu /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Menü' }))
    expect(screen.getByRole('button', { name: /temaya geç|temasına geç/ })).toBeInTheDocument()
  })
})
