import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { PlayerSummary, ShortlistItem } from '../api/types'
import { ShortlistLabel } from './ShortlistLabel'

const player = { id: 5, name: 'Jude Bellingham', overall: 91, positions: ['CM', 'CAM'], club: 'Real Madrid', valueEur: 150_000_000 } as PlayerSummary
const renderLabel = (item: ShortlistItem) => render(<MemoryRouter><ShortlistLabel item={item} /></MemoryRouter>)

describe('ShortlistLabel (WEB-BUG-13)', () => {
  it('oyuncu adını, OVR, mevki ve kulübü gösterir', () => {
    renderLabel({ playerId: 5, note: 'orta saha', player })
    expect(screen.getByRole('link', { name: 'Jude Bellingham' })).toHaveAttribute('href', '/players/5')
    expect(screen.getByText(/91/)).toBeInTheDocument()
    expect(screen.getByText(/CM/)).toBeInTheDocument()
    expect(screen.getByText(/Real Madrid/)).toBeInTheDocument()
    expect(screen.getByText(/orta saha/)).toBeInTheDocument()
  })

  it('özet yoksa (katalogdan kalkmış) kimlikle gösterir', () => {
    renderLabel({ playerId: 123 })
    expect(screen.getByRole('link', { name: 'Oyuncu #123' })).toBeInTheDocument()
  })
})
