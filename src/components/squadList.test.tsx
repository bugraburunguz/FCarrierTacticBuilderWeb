import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../api/types'
import { SquadList } from './SquadList'

const p = (id: number, positions: string[], overall: number, extra: Partial<CareerPlayer> = {}): CareerPlayer =>
  ({ player: { id, name: `Oyuncu ${id}`, positions, overall, potential: overall + 3, age: 24 }, onLoan: false, ...extra }) as CareerPlayer
const SQUAD = [p(1, ['ST'], 70), p(2, ['LW'], 68), p(3, ['LW'], 66), p(4, ['GK'], 66), p(5, ['CB'], 69, { onLoan: true, loanedOut: true })]
const ADVICE = [{ playerId: 1, playerName: 'Oyuncu 1', listedPositions: ['ST'], best: [], ownPositionBest: true, bestOverallPosition: 'ST', bestOverall: 70 }]

const renderList = (props: Partial<Parameters<typeof SquadList>[0]> = {}) => render(
  <MemoryRouter><SquadList squad={SQUAD} positionAdvice={ADVICE as never} recordColumns grouping="mevki" {...props} /></MemoryRouter>,
)

/** FCA-22: /squad/form verisiyle son 5 not, sezon G/A ve ortalama not; telefonda yalnız son 5 not (isim altında). */
describe('SquadList form kolonları (FCA-22)', () => {
  const form = new Map([
    [1, { playerId: 1, playerName: 'Oyuncu 1', lastRatings: [9, 7, 6, 8, 5], appearances: 12, goals: 6, assists: 2, averageRating: 7.04 }],
    [2, { playerId: 2, playerName: 'Oyuncu 2', lastRatings: [], appearances: 0, goals: 0, assists: 0, averageRating: null }],
  ])

  it('tek "Form" sütunu: son 5 not en yeni sağda (renk metinle birlikte), altında sezon G/A ve ortalama; isim sütunu daralmasın diye ayrı sütun yok', () => {
    const { container } = renderList({ form })
    const head = container.querySelector('thead')!
    expect(within(head as HTMLElement).getByText('Form')).toBeInTheDocument()
    expect(within(head as HTMLElement).queryByText('G/A')).toBeNull()
    const row = screen.getByRole('link', { name: 'Oyuncu 1' }).closest('tr')!
    const cell = row.querySelector('td[data-col="form"]')!
    expect(within(cell as HTMLElement).getByRole('list', { name: 'Son 5 maç notu' }).textContent).toBe('58679')
    expect(cell.querySelector('[data-form-totals]')).toHaveTextContent('G/A 6/2 · Ort. 7,04')
  })

  it('telefonda form sütunu gizli, yalnız son 5 not isim hücresinde', () => {
    const { container } = renderList({ form })
    const row = screen.getByRole('link', { name: 'Oyuncu 1' }).closest('tr')!
    expect(row.querySelector('td[data-col="form"]')!.className).toContain('hidden sm:table-cell')
    const compact = row.querySelector('td[data-col="name"] [data-form-compact]')!
    expect(compact.className).toContain('sm:hidden')
    expect(compact.textContent).toBe('58679')
    expect(container.querySelectorAll('colgroup col').length).toBe(container.querySelectorAll('thead th').length)
  })

  it('maçı olmayan oyuncu "—"; form verisi verilmezse kolonlar hiç çizilmez', () => {
    renderList({ form })
    const row = screen.getByRole('link', { name: 'Oyuncu 2' }).closest('tr')!
    expect(row.querySelector('td[data-col="form"]')).toHaveTextContent('—')
    expect(row.querySelector('td[data-col="form"] [data-form-totals]')).toBeNull()
    const plain = renderList()
    expect(plain.container.querySelector('td[data-col="form"]')).toBeNull()
  })
})

/** KARIYER-UX FAZ 3.1 (v3 opt-in `grouping`): tek tablo, sütun başlığı bir kez, gruplar tbody + rowgroup başlığı, sabit sütun genişlikleri. */
describe('SquadList (v3 gruplama)', () => {
  it('tek tablo: bir thead, colgroup, grup başına tbody ve "LW · Sol kanat · 2" rowgroup başlığı', () => {
    const { container } = renderList()
    const tables = container.querySelectorAll('table')
    expect(tables).toHaveLength(1)
    expect(tables[0].querySelectorAll('thead')).toHaveLength(1)
    expect(tables[0].querySelector('colgroup')?.querySelectorAll('col').length).toBeGreaterThan(0)
    const groups = within(tables[0]).getAllByRole('rowheader').map((th) => th.textContent)
    expect(groups).toEqual(['GK · Kaleci · 1', 'CB · Stoper · 1', 'LW · Sol kanat · 2', 'ST · Santrfor · 1'])
    expect(tables[0].querySelectorAll('tbody')).toHaveLength(4)
    tables[0].querySelectorAll('th[scope="rowgroup"]').forEach((th) => expect(th).toHaveAttribute('colspan'))
  })

  it('FCA-3: OVR hücresinde Stitch OVR kutusu (küçük); POT düz sayı', () => {
    const { container } = renderList()
    const row = screen.getByRole('link', { name: 'Oyuncu 1' }).closest('tr')!
    expect(within(row).getByRole('img', { name: 'OVR 70' })).toHaveAttribute('data-tier', 'good')
    expect(container.querySelectorAll('td[data-col="ovr"] [role="img"]')).toHaveLength(SQUAD.length)
  })

  it('FCA-3: kiralık satırları solda 3 px durum şeridi taşır (renk + çip metni birlikte); diğer satırlarda şerit yok', () => {
    renderList()
    const row = screen.getByRole('link', { name: 'Oyuncu 5' }).closest('tr')!
    expect(row).toHaveAttribute('data-status', 'loaned-out')
    expect(row.querySelector('td[data-col="name"]')!.className).toMatch(/shadow-\[inset_3px_0_0_var\(--info\)\]/)
    const plain = screen.getByRole('link', { name: 'Oyuncu 1' }).closest('tr')!
    expect(plain).not.toHaveAttribute('data-status')
  })

  it('FCA-3 3b: öneri şeritleri — Sat kırmızı, Süre ver amber (çip metniyle, gerekçe title); kayıttaki kiralık önce gelir ve mavi', () => {
    const advice = new Map([
      [1, { kind: 'SELL' as const, reason: '31 yaşında, ilk 11\'de değil' }],
      [2, { kind: 'LOAN' as const, reason: '19 yaşında, potansiyeli 12 puan üstünde' }],
      [5, { kind: 'SELL' as const, reason: 'kiralıkta olan öneri almaz' }],
    ])
    renderList({ advice })
    const row = (name: string) => screen.getByRole('link', { name }).closest('tr')!
    expect(row('Oyuncu 1')).toHaveAttribute('data-status', 'sell')
    expect(row('Oyuncu 1').querySelector('td[data-col="name"]')!.className).toMatch(/inset_3px_0_0_var\(--bad\)/)
    // çip iki yerde: mobilde isim altında, sm+ Durum sütununda (biri CSS ile gizli)
    within(row('Oyuncu 1')).getAllByText('Sat').forEach((chip) => expect(chip).toHaveAttribute('title', '31 yaşında, ilk 11\'de değil'))
    expect(row('Oyuncu 2')).toHaveAttribute('data-status', 'minutes')
    expect(row('Oyuncu 2').querySelector('td[data-col="name"]')!.className).toMatch(/inset_3px_0_0_var\(--warn\)/)
    expect(within(row('Oyuncu 2')).getAllByText('Süre ver').length).toBeGreaterThan(0)
    expect(row('Oyuncu 5')).toHaveAttribute('data-status', 'loaned-out')
  })

  it('FCA-3 3b: kiralık (bizde) satırı da mavi şerit (Stitch: kiralık mavi)', () => {
    render(<MemoryRouter><SquadList squad={[p(9, ['CM'], 64, { onLoan: true })]} positionAdvice={[]} recordColumns grouping="mevki" /></MemoryRouter>)
    const row = screen.getByRole('link', { name: 'Oyuncu 9' }).closest('tr')!
    expect(row).toHaveAttribute('data-status', 'on-loan')
    expect(row.querySelector('td[data-col="name"]')!.className).toMatch(/inset_3px_0_0_var\(--info\)/)
  })

  it('sayılar sağa hizalı ve tabular-nums', () => {
    const { container } = renderList()
    const ovr = [...container.querySelectorAll('table td[data-col="ovr"]')]
    expect(ovr.length).toBe(SQUAD.length)
    ovr.forEach((td) => expect(td.className).toMatch(/text-right.*tabular-nums|tabular-nums.*text-right/))
  })

  it('FIT-3: en iyi mevki yanında taraf gerekçesi (yardım) ve dönüşüm rozeti (oyuncunun Roller sekmesine)', () => {
    const advice = [{ ...ADVICE[0], playerId: 2, listedPositions: ['LW'], bestOverallPosition: 'RW', bestOverall: 68,
      sideReason: 'Orta profili baskın (Orta 78 · Bitiricilik 61) + sağ ayak → RW · Winger',
      conversion: { position: 'CDM', roleName: 'Holding (Defend)', strength: 72, fromPosition: 'LW', fromRoleName: 'Winger (Attack)', fromStrength: 64,
        text: "LW listeli ama CDM'de daha etkili: CDM · Holding gücü 72, LW · Winger 64. CDM mevki planı önerilir." } }]
    renderList({ positionAdvice: advice as never })
    const row = within(screen.getByRole('table')).getByRole('link', { name: 'Oyuncu 2' }).closest('tr')!
    const best = row.querySelector('td[data-col="best"]') as HTMLElement
    expect(best).toHaveTextContent('RW')
    expect(within(best).getByLabelText('Taraf gerekçesi')).toBeInTheDocument()
    expect(best).toHaveTextContent('Orta profili baskın (Orta 78 · Bitiricilik 61) + sağ ayak → RW · Winger')
    const badge = within(best).getByRole('link', { name: /Dönüşüm: CDM/ })
    expect(badge).toHaveAttribute('href', '/players/2?sekme=roller')
    expect(badge).toHaveAttribute('title', "LW listeli ama CDM'de daha etkili: CDM · Holding gücü 72, LW · Winger 64. CDM mevki planı önerilir.")
  })

  it('kiralıktaki oyuncunun en iyi mevkisi "Kiralıkta"; maaş verisi hiç yoksa tablo altında not', () => {
    renderList()
    const table = screen.getByRole('table')
    const row = within(table).getByRole('link', { name: 'Oyuncu 5' }).closest('tr')!
    expect(row.querySelector('td[data-col="best"]')).toHaveTextContent('Kiralıkta')
    expect(screen.getByText('Maaş verisi içe aktarmada gelmiyor.')).toBeInTheDocument()
  })

  it('hat gruplaması eski dört grup', () => {
    renderList({ grouping: 'hat' })
    expect(within(screen.getByRole('table')).getAllByRole('rowheader').map((th) => th.textContent)).toEqual(['Kaleciler · 1', 'Defans · 1', 'Hücum · 3'])
  })

  it('kırılımlar: sm altı yaş ve durum, lg altı mevkiler ve maaş gizli (col dahil); mevkiler isim altına iner; grup başlığı 4 sütuna yayılır; v2 eski görünüm', () => {
    const { container, unmount } = renderList()
    const hiddenUntil = (bp: string) => new RegExp(`(^| )hidden( |$).*${bp}:table-cell`)
    for (const [col, bp] of [['age', 'sm'], ['status', 'sm'], ['positions', 'lg'], ['wage', 'lg']]) {
      container.querySelectorAll(`td[data-col="${col}"]`).forEach((td) => expect(td.className).toMatch(hiddenUntil(bp)))
    }
    expect([...container.querySelectorAll('col')].map((c) => c.className)).toEqual(
      ['', 'hidden w-12 sm:table-column', 'hidden w-32 lg:table-column', 'w-16 sm:w-24', 'w-12', 'w-12', 'hidden w-28 lg:table-column', 'hidden w-48 sm:table-column'])
    container.querySelectorAll('th[scope="rowgroup"]').forEach((th) => expect(th).toHaveAttribute('colspan', '4'))
    expect(container.querySelector('td[data-col="name"] [data-compact]')).toHaveTextContent('GK')
    unmount()
    const v2 = render(<MemoryRouter><SquadList squad={SQUAD} positionAdvice={ADVICE as never} /></MemoryRouter>)
    expect(v2.container.querySelectorAll('table').length).toBeGreaterThan(1)
    expect(v2.container.querySelector('td[data-col]')).toBeNull()
  })
})
