import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlayerCard } from './PlayerCard'

vi.mock('../../api/endpoints', () => ({ endpoints: { playerAssetNames: vi.fn(async () => []) } }))

const player = { name: 'Kylian Mbappé', rating: 91, position: 'ST', assetId: 231747 }
const eaImage = (container: HTMLElement) => container.querySelector<HTMLImageElement>('img[data-ea-card]')
const design = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-card-design]')!

/** Kart görseli EA reyting görseli (sunucu üzerinden /api/v1/img/card/{EA kimliği}); gelmezse bizim kart tasarımımız. */
describe('PlayerCard EA kart görseli', () => {
  it('eaCard + EA kimliği: görsel bizim adresimizden istenir; yüklenince tasarım gizlenir', () => {
    const { container } = render(<PlayerCard player={player} width={160} eaCard />)
    const img = eaImage(container)!
    expect(img.getAttribute('src')).toMatch(/\/api\/v1\/img\/card\/231747$/)
    expect(img).toHaveAttribute('alt', '')
    expect(design(container)).toBeVisible()

    Object.defineProperty(img, 'naturalWidth', { value: 600 })
    fireEvent.load(img)
    expect(img.className).toContain('opacity-100')
    expect(design(container).style.visibility).toBe('hidden')
  })

  it('görsel yoksa (404) img kalkar, bizim tasarımımız görünür', () => {
    const { container } = render(<PlayerCard player={player} width={160} eaCard />)
    fireEvent.error(eaImage(container)!)
    expect(eaImage(container)).toBeNull()
    expect(design(container).style.visibility).not.toBe('hidden')
  })

  it('sunucu "kart yok" için 1×1 saydam görsel döner: doğal genişlik 1 px ise tasarım kalır', () => {
    const { container } = render(<PlayerCard player={player} width={160} eaCard />)
    const img = eaImage(container)!
    Object.defineProperty(img, 'naturalWidth', { value: 1 })
    fireEvent.load(img)
    expect(eaImage(container)).toBeNull()
    expect(design(container).style.visibility).not.toBe('hidden')
  })

  it('eaCard verilmezse ya da EA kimliği yoksa görsel istenmez', () => {
    expect(eaImage(render(<PlayerCard player={player} width={160} />).container)).toBeNull()
    expect(eaImage(render(<PlayerCard player={{ ...player, assetId: undefined }} width={160} eaCard />).container)).toBeNull()
  })
})
