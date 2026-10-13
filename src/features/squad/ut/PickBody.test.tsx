import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { UtCard } from '../../../lib/utCard'
import { PickBody } from './PickBody'

vi.mock('../../../api/endpoints', () => ({ endpoints: { players: vi.fn(() => Promise.resolve({ items: [], total: 0 })), utSquadEvaluate: vi.fn(() => Promise.resolve({ slots: [], averageMeta: 0 })) } }))

describe('V3-04.1: "Meta rating*" açıklaması', () => {
  it('yıldızın yanında HelpPopover var; neyin tahmini olduğunu ve nedenini söyler', () => {
    const current: UtCard = { key: 'p:1', source: 'catalog', name: 'Test', rating: 90, positions: ['ST'], playerId: 1 }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <PickBody position="ST" current={current} usedKeys={new Set()} onPick={() => undefined} evaluation={{ card: { metaRating: 87.4, tier: 'A' }, roleFit: 84, roleName: 'Poacher' }} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByLabelText('Meta rating nedir')).toBeInTheDocument()
    expect(screen.getByText(/tahmin metriğidir/)).toBeInTheDocument()
  })
})
