import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FitBadge } from './FitBadge'

// V3-05b-b: yüzde Türkçe biçimde (işaret sayının önünde); kariyer de aynı rozeti kullanır.
describe('FitBadge yüzdesi', () => {
  it('"%95" render eder, "95%" değil', () => {
    render(<FitBadge state="good" pct={95} />)
    expect(screen.getByText('%95')).toBeInTheDocument()
    expect(screen.queryByText('95%')).toBeNull()
  })

  it('compact rozette de aynı biçim; erişilebilir ad değişmez', () => {
    render(<FitBadge state="ok" pct={7} compact />)
    expect(screen.getByText('%7')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Rol için sınırda, yüzde 7')
  })
})
