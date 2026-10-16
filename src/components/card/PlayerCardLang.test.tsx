import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerCard } from './PlayerCard'

describe('kartta isim lang\'ı uyruktan gelir (V3-04.1)', () => {
  it.each([
    ['Pedri', 'Spain', 'en'],
    ['Barış Atik', 'Türkiye', 'tr'],
    ['Joshua Kimmich', 'Germany', 'en'],
  ])('%s (%s) → lang=%s', (name, nationality, lang) => {
    render(<PlayerCard player={{ name, rating: 80, nationality }} width={56} minText={11} minRating={14} />)
    const el = screen.getByTitle(name)
    expect(el).toHaveAttribute('lang', lang)
  })
})
