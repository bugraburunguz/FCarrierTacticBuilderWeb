import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { pitchSlotsOf } from '../../features/squad/pitchSlots'
import { Pitch } from './Pitch'

vi.mock('../../api/endpoints', () => ({ endpoints: { playerAssetNames: vi.fn(async () => []) } }))

const views = [
  { slotId: 'ST', position: 'ST', x: 50, y: 15, roleLabel: 'Hedef forvet', player: { id: 1, assetId: 231747, name: 'Kylian Mbappé', overall: 91 } },
  { slotId: 'GK', position: 'GK', x: 50, y: 90, roleLabel: 'Kaleci', player: { id: 2, name: 'Oyuncu', overall: 60 } },
]

/** Kariyer sahası (Kadro, kadro kurucu): kartlar EA kart görseli; UT sahası kendi kartını çizer (özel sürümler). */
describe('saha EA kart görseli', () => {
  it('eaCards: EA kimliği olan oyuncunun kartı /img/card/{id}; kimliksiz oyuncuda istenmez', () => {
    const { container } = render(<Pitch slots={pitchSlotsOf(views)} onPickPlayer={() => undefined} eaCards />)
    const images = [...container.querySelectorAll<HTMLImageElement>('img[data-ea-card]')]
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('src')).toMatch(/\/api\/v1\/img\/card\/231747$/)
  })

  it('eaCards verilmezse (UT) görsel istenmez', () => {
    const { container } = render(<Pitch slots={pitchSlotsOf(views)} onPickPlayer={() => undefined} />)
    expect(container.querySelector('img[data-ea-card]')).toBeNull()
  })
})
