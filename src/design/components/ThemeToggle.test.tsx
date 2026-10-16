/// <reference types="node" />
import { readFileSync } from 'node:fs'
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

describe('V3-04.1: dar ekranda hesap alanı', () => {
  it('oturumsuzken Giriş mobil menüde de bulunur', () => {
    render(<MemoryRouter><MobileMenu loginLink /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Menü' }))
    expect(screen.getByRole('link', { name: 'Giriş' })).toHaveAttribute('href', '/login')
  })

  it('"Kayıt ol" tek satırda kalır (nowrap) ve 480px altında "Giriş" üst çubuktan menüye iner', () => {
    const source = readFileSync('src/design/components/AppShell.tsx', 'utf8')
    expect(source).toMatch(/to="\/register"[^>]*whitespace-nowrap/)
    expect(source).toMatch(/to="\/login"[^>]*max-\[479px\]:hidden/)
  })
})
