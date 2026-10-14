import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerCard, type CardPlayer } from './PlayerCard'

// V3-05b-b: Q18 okunabilirliği PlayerCard'ın her boyutunda varsayılan: kart içi yazı ≥ 11px, OVR ≥ 14px, soyad görünür.
const player: CardPlayer = {
  name: 'Kylian Mbappé', rating: 91, position: 'ST', nationality: 'France', club: 'Real Madrid', league: 'LALIGA',
  faceStats: [97, 90, 80, 92, 36, 78], faceLabels: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'],
}

/** Ölçeklenmiş katmandaki yazının ekrandaki px'i: satır içi font-size × en yakın `scale()` dönüşümü. */
function effectiveSizes(container: HTMLElement): { text: string; px: number }[] {
  return [...container.querySelectorAll<HTMLElement>('[style*="font-size"]')]
    .filter((el) => (el.textContent ?? '').trim() !== '')
    .map((el) => {
      const layer = el.closest<HTMLElement>('[style*="scale("]')
      const scale = layer ? Number(/scale\(([\d.]+)\)/.exec(layer.style.transform)?.[1] ?? 1) : 1
      return { text: (el.textContent ?? '').trim(), px: parseFloat(el.style.fontSize) * scale }
    })
}

describe('PlayerCard okunabilirliği (varsayılan, Q18)', () => {
  it.each([['md (ızgara)', { size: 'md' as const }], ['44px küçük resim', { width: 44 }], ['200px mobil', { width: 200 }], ['280px masaüstü', { width: 280 }]])('%s: hiçbir yazı < 11px değil, OVR ≥ 14px', (_, props) => {
    const { container } = render(<PlayerCard player={player} {...props} />)
    const sizes = effectiveSizes(container)
    sizes.forEach((s) => expect(s.px, `"${s.text}"`).toBeGreaterThanOrEqual(11))
    const ovr = sizes.find((s) => s.text === '91')
    expect(ovr).toBeDefined()
    expect(ovr!.px).toBeGreaterThanOrEqual(14)
  })

  it('ızgara kartında (md) soyad görünür; ülke/kulüp/lig çipleri ve 6 stat sığmadığı için gizli', () => {
    render(<PlayerCard player={player} size="md" />)
    expect(screen.getByText('Mbappé')).toBeVisible()
    expect(screen.queryByText('PAC')).toBeNull()
    expect(screen.queryByText('FRA')).toBeNull()
  })

  it('büyük kartta (280px) çipler ve 6 stat görünür', () => {
    render(<PlayerCard player={player} width={280} />)
    expect(screen.getByText('PAC')).toBeInTheDocument()
    expect(screen.getByText('97')).toBeInTheDocument()
    expect(screen.getByText('FRA')).toBeInTheDocument()
  })
})
