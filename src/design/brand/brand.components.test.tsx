import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LogoLockup } from './LogoLockup'
import { LogoMark } from './LogoMark'

describe('marka bileşenleri', () => {
  it('lockup ana sayfaya bağlanır ve erişilebilir adı "FC Assist"', () => {
    render(<MemoryRouter><LogoLockup /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'FC Assist' })
    expect(link).toHaveAttribute('href', '/')
    expect(link.textContent).toContain('FC Assist')
  })

  it('işaret boyut prop\'unu alır; başlık yoksa dekoratif, varsa img', () => {
    const { container, rerender } = render(<LogoMark size={48} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    rerender(<LogoMark title="FC Assist" />)
    expect(screen.getByRole('img', { name: 'FC Assist' })).toBeInTheDocument()
  })

  it('iki işaret örneğinin gradyan kimlikleri çakışmaz', () => {
    const { container } = render(<><LogoMark /><LogoMark /></>)
    const ids = [...container.querySelectorAll('linearGradient')].map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('collapse: dar ekranda yazı gizlenir, işaret kalır', () => {
    const { container } = render(<MemoryRouter><LogoLockup collapse /></MemoryRouter>)
    expect(container.querySelector('span[aria-hidden]')!.className).toContain('max-sm:hidden')
  })
})

describe('yasal not', () => {
  it('Hakkında sayfasında EA markası notu aynen yer alır', async () => {
    const { AboutPage } = await import('../../pages/AboutPage')
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expect(screen.getByTestId('legal-note').textContent).toBe("FC Assist, EA SPORTS veya Electronic Arts ile bağlantılı değildir. EA SPORTS FC, Electronic Arts Inc.'in ticari markasıdır.")
  })
})
