import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogShell } from './CatalogShell'

/**
 * Oyuncular: yapışkan filtre paneli "Daha fazla filtre" açıkken ekrandan uzun olabiliyordu; ekrandan uzun yapışkan panelin altına ulaşılamıyor ve
 * kaydırırken sayfayı örtüyordu. Panel ekran yüksekliğiyle sınırlı, taşan kısım panelin içinde kayar.
 */
describe('CatalogShell filtre paneli', () => {
  it('"Daha fazla filtre" açıkken panel yapışkan değil (sonuçları örtmez); kapanınca yeniden yapışkan', () => {
    render(
      <CatalogShell title="Oyuncular" bar={<details data-testid="more"><summary>Daha fazla filtre</summary><p>alanlar</p></details>}>
        <p>liste</p>
      </CatalogShell>,
    )
    const sticky = () => screen.getByRole('region', { name: 'Süzgeçler' }).parentElement!
    expect(sticky().className).toContain('min-[820px]:sticky')
    const more = screen.getByTestId('more') as HTMLDetailsElement
    more.open = true
    fireEvent(more, new Event('toggle'))
    expect(sticky().className).not.toContain('min-[820px]:sticky')
    more.open = false
    fireEvent(more, new Event('toggle'))
    expect(sticky().className).toContain('min-[820px]:sticky')
  })

  it('masaüstünde yapışkan panel ekran yüksekliğini aşmaz, içi kayar', () => {
    render(<CatalogShell title="Oyuncular" bar={<p>süzgeçler</p>}><p>liste</p></CatalogShell>)
    const panel = screen.getByRole('region', { name: 'Süzgeçler' })
    expect(panel.className).toContain('min-[820px]:max-h-[calc(100dvh-var(--header-h)-6rem)]')
    expect(panel.className).toContain('min-[820px]:overflow-y-auto')
    // overscroll-contain sayfa kaydırmasını panelde hapsediyordu (fare paneldeyken sayfa kaymıyordu).
    expect(panel.className).not.toContain('overscroll-contain')
  })
})
