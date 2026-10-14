import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FitBadge } from './card/FitBadge'
import { FitMeter } from './FitMeter'
import { BadgeDot } from './ui'

describe('AT_LEVEL: rozet boş gelir → renk yok + "seviyesinde" etiketi (E3-5c)', () => {
  it('FitMeter badge yokken yeşile düşmez, etiket "Seviyesinde"', () => {
    const { container } = render(<FitMeter score={55} badge={undefined} />)
    const meter = screen.getByRole('img')
    expect(meter).toHaveAttribute('aria-label', 'Uyum %55 (Seviyesinde)')
    expect(meter).toHaveAttribute('title', 'Uyum %55 (Seviyesinde)')
    const strokes = Array.from(container.querySelectorAll('circle')).map((c) => c.getAttribute('stroke'))
    expect(strokes).not.toContain('#2e9b52')
    expect(strokes).not.toContain('#d0a022')
    expect(strokes).not.toContain('#c0392b')
  })

  it('BadgeDot badge yokken hata vermez, adı "Seviyesinde"', () => {
    render(<BadgeDot state={undefined} />)
    expect(screen.getByRole('img', { name: 'Seviyesinde' })).toBeInTheDocument()
  })

  it('FitBadge neutral: metin SEVİYESİNDE, koyu cam çip + açık yazı (gümüş kart üstünde okunur, REP-b)', () => {
    render(<FitBadge state="neutral" pct={55} />)
    const badge = screen.getByRole('img', { name: 'Rol için seviyesinde, yüzde 55' })
    expect(badge).toHaveTextContent('SEVİYESİNDE')
    expect(badge.style.background).not.toBe('transparent')
    expect(badge.style.color).not.toBe('inherit')
  })
})
