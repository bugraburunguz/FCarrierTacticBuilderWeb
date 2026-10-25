import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Academy } from '../../api/types'
import { AcademyTab } from './AcademyTab'

const KYLE = {
  playerId: 41, name: 'Kyle Preston', age: 15, positions: ['CM', 'CDM'], overall: 55, potential: 73, potentialRange: null,
  monthsInSquad: 3, playerTier: 2, potentialVariance: 5, swingLowPotential: 0, youthVerified: false,
  bestPosition: 'CM', sideReason: null,
  plan: { name: 'CM Box to Box', text: 'Kyle Preston · CM Box to Box planı → 2 sezonda CM gücü 64 (Dengeli: 61)', balanced: false },
  promote: { position: 'CM', strength1: 62, backupName: 'Smith', backupStrength: 60,
    text: 'Kyle Preston · 1 sezon sonra tahmini CM gücü 62, yedek Smith 60. Bu bir tahmin; A takıma alma oyunda yapılır.' },
}
const WINGER = { ...KYLE, playerId: 42, name: 'Sol Kanat', positions: ['LW'], bestPosition: 'RW', potential: null, potentialRange: '70–74',
  sideReason: 'Orta profili baskın + sağ ayak → RW', plan: { name: 'Dengeli', text: 'Sol Kanat · Dengeli plan: Henüz net bir mevkisi yok, esnek gelişsin', balanced: true },
  promote: null, monthsInSquad: 11 }
const ACADEMY: Academy = { found: true, teamId: 112264, name: 'Port Vale Youth Academy', message: null, players: [KYLE, WINGER] }

const renderTab = (academy?: Academy, extra: Partial<Parameters<typeof AcademyTab>[0]> = {}) =>
  render(<MemoryRouter><AcademyTab academy={academy} loading={false} error={false} onRetry={() => undefined} {...extra} /></MemoryRouter>)

/** ACADEMY-b madde 4 + kararlar: Kadro › Altyapı. Yalnız "Altyapıdaki süre (ay)" gösterilir; belirsizlik alanları gizli. */
describe('AcademyTab', () => {
  it('sütunlar: oyuncu, yaş, mevkiler, en iyi mevki, OVR, POT, altyapıda, önerilen plan', () => {
    const { container } = renderTab(ACADEMY)
    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent)
    expect(headers).toEqual(['Oyuncu', 'Yaş', 'Mevkiler', 'En iyi mevki', 'OVR', 'POT', 'Altyapıda', 'Önerilen plan'])
    const row = within(screen.getByRole('link', { name: 'Kyle Preston' }).closest('tr')!)
    expect(row.getByText('15')).toBeInTheDocument()
    expect(row.getByText('CM, CDM', { selector: '[data-col="positions"]' })).toBeInTheDocument()
    expect(row.getByText('73')).toBeInTheDocument()
    expect(row.getByText('3 ay')).toBeInTheDocument()
    expect(row.getByText('CM Box to Box')).toBeInTheDocument()
  })

  it('başlık takım adını ve tahmin uyarısını taşır; satır oyuncu sayfasına gider', () => {
    renderTab(ACADEMY)
    expect(screen.getByText(/Port Vale Youth Academy/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kyle Preston' })).toHaveAttribute('href', '/players/41')
  })

  it('"A takıma al" önerisi tahmin olarak işaretli; önerisi olmayan oyuncuda çıkmaz', () => {
    renderTab(ACADEMY)
    const kyle = within(screen.getByRole('link', { name: 'Kyle Preston' }).closest('tr')!)
    expect(kyle.getByText('A takıma al: CM')).toBeInTheDocument()
    // Gerekçe dokunmatikte ve klavyede de açılır: yardım düğmesi (title değil).
    expect(kyle.getByLabelText('A takıma al gerekçesi')).toBeInTheDocument()
    expect(kyle.getByText(/1 sezon sonra tahmini CM gücü 62, yedek Smith 60\. Bu bir tahmin/)).toBeInTheDocument()
    const winger = within(screen.getByRole('link', { name: 'Sol Kanat' }).closest('tr')!)
    expect(winger.queryByText(/A takıma al/)).toBeNull()
  })

  it('karar 3: potentialRange, potentialVariance, playerTier, swingLowPotential arayüzde görünmez', () => {
    const { container } = renderTab(ACADEMY)
    expect(container.textContent).not.toContain('70–74')
    expect(container.textContent).not.toMatch(/belirsiz|varyans|tier|swing/i)
    const winger = within(screen.getByRole('link', { name: 'Sol Kanat' }).closest('tr')!)
    expect(winger.getByText('—', { selector: '[data-col="pot"]' })).toBeInTheDocument()
  })

  it('FIT-3 taraf gerekçesi en iyi mevki yanında yardım olarak', () => {
    renderTab(ACADEMY)
    const winger = within(screen.getByRole('link', { name: 'Sol Kanat' }).closest('tr')!)
    expect(winger.getByLabelText('Taraf gerekçesi')).toBeInTheDocument()
  })

  it('boş durum: "Altyapıda oyuncu yok."', () => {
    renderTab({ found: false, teamId: null, name: null, message: "Altyapıda oyuncu yok ya da export'ta görünmüyor", players: [] })
    expect(screen.getByRole('status')).toHaveTextContent('Altyapıda oyuncu yok.')
  })

  it('hata boş durum gibi görünmez', () => {
    renderTab(undefined, { error: true })
    expect(screen.getByText('Altyapı yüklenemedi.')).toBeInTheDocument()
    expect(screen.queryByText('Altyapıda oyuncu yok.')).toBeNull()
  })
})
