import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FutCard, rarityFromOverall } from './FutCard'

describe('FutCard', () => {
  it('rarity OVR bandından türetilir', () => {
    expect(rarityFromOverall(64)).toBe('bronze')
    expect(rarityFromOverall(65)).toBe('silver')
    expect(rarityFromOverall(74)).toBe('silver')
    expect(rarityFromOverall(75)).toBe('gold')
  })

  it('kariyer modunda uyum rozeti, UT modunda kimya elması gösterir', () => {
    const { rerender } = render(<FutCard name="Dembélé" overall={84} position="CM" mode="career" fit={{ pct: 88, band: 'GREEN' }} />)
    expect(screen.getByText(/%88/)).toBeTruthy()
    rerender(<FutCard name="Dembélé" overall={84} position="CM" mode="ut" chem={3} />)
    expect(screen.queryByText(/%88/)).toBeNull()
    expect(screen.getByLabelText('Kimya 3/3')).toBeTruthy()
  })

  it('yüz görseli yoksa yuva gösterilir, yüz stat satırı yalnızca veri varsa çıkar', () => {
    render(<FutCard name="Waine" overall={63} position="ST" mode="career" />)
    expect(screen.getByText('yüz')).toBeTruthy()
    expect(screen.queryByText('PAC')).toBeNull()
  })
})
