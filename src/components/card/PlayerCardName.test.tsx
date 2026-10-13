import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerCard } from './PlayerCard'

// Q18 eki: her dolu kartta isim görünür (soyad, Barlow Condensed, ≥ 11px); tam ad title'da.
describe.each([48, 56, 72, 96])('saha kartı %ipx', (width) => {
  it('soyad görünür, yazı ≥ 11px, tam ad title içinde', () => {
    render(<PlayerCard player={{ name: 'Kylian Mbappé', rating: 91, position: 'ST' }} width={width} minText={11} minRating={14} />)

    const name = screen.getByText('Mbappé')
    expect(name).toBeVisible()
    expect(name).toHaveAttribute('title', 'Kylian Mbappé')
    expect(name.className).toContain('font-display')
    expect(parseFloat(name.style.fontSize)).toBeGreaterThanOrEqual(11)
  })
})
