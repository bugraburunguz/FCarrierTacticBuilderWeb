import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { assetNames } from '../../lib/assetNames'
import { PlayerCard } from './PlayerCard'

vi.mock('../../api/endpoints', () => ({ endpoints: { playerAssetNames: vi.fn() } }))

beforeEach(() => {
  assetNames.reset()
  vi.mocked(endpoints.playerAssetNames).mockReset().mockImplementation(async (ids: number[]) =>
    ids.filter((id) => id === 7001 || id === 7002).map((id) => ({ assetId: id, name: id === 7001 ? 'Pedro González López' : 'Jude Bellingham' })))
})

const strip = (container: HTMLElement) => container.querySelector('[data-card-name]')!

// V3-05d-c (Q18): kulüp kartının adı assetId → katalog toplu ad ucuyla; ad şeridi asla yalnız rakam olmaz.
describe('kart adı katalogdan (assetId)', () => {
  it('yakalanan ad yoksa ("#7001") katalog adı görünür; birçok kart tek istekte', async () => {
    const { container } = render(<>
      <PlayerCard player={{ name: '#7001', rating: 86, position: 'CM', assetId: 7001 }} width={72} minText={11} minRating={14} />
      <PlayerCard player={{ name: '#7002', rating: 90, position: 'CAM', assetId: 7002 }} width={72} minText={11} minRating={14} />
    </>)
    await waitFor(() => expect(screen.getByText('López')).toBeInTheDocument())
    expect(screen.getByText('Bellingham')).toHaveAttribute('title', 'Jude Bellingham')
    expect(endpoints.playerAssetNames).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('[role="img"]')[0]).toHaveAccessibleName(/^Pedro González López, 86/)
  })

  it('katalogda yoksa: mevki + reyting kısa etiket, title "Ad bilinmiyor"; rakamdan ibaret şerit yok', async () => {
    const { container } = render(<PlayerCard player={{ name: '#9999', rating: 84, position: 'ST', assetId: 9999 }} width={72} minText={11} minRating={14} />)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => expect(strip(container)).toHaveTextContent('ST 84'))
    expect(strip(container)).toHaveAttribute('title', 'Ad bilinmiyor')
    expect(strip(container).textContent).not.toMatch(/^\s*[#\d]+\s*$/)
  })

  it('soyadı rakamla biten addan rakam gösterilmez (son harfli sözcük)', () => {
    const { container } = render(<PlayerCard player={{ name: 'Kapı Oyuncu 14', rating: 75, position: 'CB' }} width={72} minText={11} minRating={14} />)
    expect(strip(container).textContent).not.toMatch(/^\s*\d+\s*$/)
  })

  it('katalog adı yoksa ama yakalanan gerçek ad varsa o kalır', async () => {
    const { container } = render(<PlayerCard player={{ name: 'Rodri', rating: 90, position: 'CDM', assetId: 9998 }} width={72} minText={11} minRating={14} />)
    await waitFor(() => expect(endpoints.playerAssetNames).toHaveBeenCalled())
    expect(strip(container)).toHaveTextContent('Rodri')
  })
})
