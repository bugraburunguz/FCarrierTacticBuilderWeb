import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { CareerRecommendationItem, FitNarrative } from '../api/types'
import { RecommendationRow } from '../features/recommend/RecommendationRow'
import { FitBadge } from './card/FitBadge'
import { FitNarrativeView } from './FitNarrativeView'

const narrative = (tailored: boolean): FitNarrative => ({
  headline: tailored ? 'Biçilmiş kaftan: rol puanı 91, seviyesine göre %88 (240 oyunculuk örneklem).' : 'Rol puanı 78; seviyesine göre %60 (240 oyunculuk örneklem).',
  tailored,
  strengths: [{ text: 'Vizyon: rol için güçlü yön (+11.2 puan).', term: 'attr', key: 'Vision', points: 11.2 }],
  weaknesses: [{ text: 'Dayanıklılık: rolün taban eşiğinin altında (-3.5 puan).', term: 'base', key: 'Stamina', points: -3.5 }],
})

describe('FitNarrativeView (E3-8): öneriler, analiz ve oyuncu sayfası aynı bileşen ve aynı sözlük', () => {
  it('başlık, güçlü ve zayıf yön cümleleri sunucudan gelen metinle gösterilir', () => {
    render(<FitNarrativeView narrative={narrative(false)} />)
    expect(screen.getByText(/Rol puanı 78; seviyesine göre %60/)).toBeInTheDocument()
    expect(screen.getByText(/Vizyon: rol için güçlü yön/)).toBeInTheDocument()
    expect(screen.getByText(/Dayanıklılık: rolün taban eşiğinin altında/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Güçlü yönler' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Zayıf yönler' })).toBeInTheDocument()
  })

  it('"Biçilmiş kaftan" rozeti yalnız tailored iken: sunucu karar verir, web eşik bilmez', () => {
    const { rerender } = render(<FitNarrativeView narrative={narrative(false)} />)
    expect(screen.queryByText('Biçilmiş kaftan')).not.toBeInTheDocument()
    rerender(<FitNarrativeView narrative={narrative(true)} />)
    expect(screen.getByText('Biçilmiş kaftan')).toBeInTheDocument()
  })

  it('FitBadge: tailored metni sözlükten (fitLabels) gelir', () => {
    render(<FitBadge state="good" tailored />)
    expect(screen.getByRole('img', { name: /biçilmiş kaftan/i })).toBeInTheDocument()
  })

  it('öneri satırı "Neden?" bölümünde aynı anlatımı gösterir', () => {
    const item = { player: { id: 1, name: 'Ada', age: 24, overall: 78, positions: ['ST'], valuationEstimated: false }, roleId: 'r', roleName: 'Rol', currentFit: 91, levelFit: 88, fitLabel: 'GOOD', bucket: 'ALINABILIR', bucketLabel: 'Alınabilir', bucketPoints: 0, bucketFactors: [], pros: [], cons: [], tags: [], rankScore: 1, narrative: narrative(true) } as CareerRecommendationItem
    render(<MemoryRouter><ul><RecommendationRow item={item} /></ul></MemoryRouter>)
    expect(screen.getByText('Neden?')).toBeInTheDocument()
    expect(screen.getByText(/Vizyon: rol için güçlü yön/)).toBeInTheDocument()
    expect(screen.getAllByText('Biçilmiş kaftan').length).toBeGreaterThan(0)
  })
})
