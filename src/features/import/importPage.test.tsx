import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import type { ImportSummary } from '../../api/types'
import { careerStore } from '../../state/careerStore'
import { formatBytes, importChecks } from './importChecks'
import { CareerImportPage } from './CareerImportPage'

let premium = true
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true, me: { subscriptionType: premium ? 'PREMIUM' : 'FREE' } }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { importCareer: vi.fn(), careerTeams: vi.fn(() => Promise.resolve([])), syncSquad: vi.fn(), careers: vi.fn(() => Promise.resolve([{ id: 3, clubName: 'Crewe', clubId: 9, squadSize: 27, gameVersionId: 27 }])) } }))

const summary = (over: Partial<ImportSummary> = {}): ImportSummary => ({ players: 21620, teams: 841, unmatchedPlayers: 12, freeAgents: 310, guessedTeamId: 121, guessedTeamName: 'Crewe Alexandra', squadSynced: 27, ...over })

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter><CareerImportPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  premium = true
  careerStore.set(3)
  vi.mocked(endpoints.importCareer).mockReset()
})

describe('içe aktarma hesapları (V3-07a)', () => {
  it('dosya boyutu doğru birimle (KB/MB, Türkçe ondalık)', () => {
    expect(formatBytes(820 * 1024)).toBe('820 KB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(42 * 1024 * 1024)).toBe('42 MB')
  })

  it('tablo bazlı doğrulama: oyuncular/takımlar ✓, kariyer algılanmadı ✗ (NOT_IN_CAREER), kadro', () => {
    const rows = importChecks(summary({ warnings: ['NOT_IN_CAREER'] }))
    expect(rows.map((r) => [r.label, r.value, r.ok])).toEqual([
      ['players', '21.620', true],
      ['teams', '841', true],
      ['Kariyer', 'kariyer algılanmadı', false],
      ['Kadro', 'Crewe Alexandra · 27 oyuncu', true],
    ])
    expect(importChecks(summary()).find((r) => r.label === 'Kariyer')).toMatchObject({ ok: true, value: 'kariyer verisi' })
    expect(importChecks(summary({ squadSynced: undefined })).find((r) => r.label === 'Kadro')).toMatchObject({ ok: false, value: 'takım seçilmedi' })
  })

  it('FAZ 6a-A: sunucu söylüyorsa oyun tarihi ve maaş/sözleşme satırları; eksikse ✗ ve "yok"', () => {
    const full = importChecks(summary({ gameDate: '2026-09-12', contracts: 30 }))
    expect(full.find((r) => r.label === 'Oyun tarihi')).toMatchObject({ ok: true, value: '12.09.2026' })
    expect(full.find((r) => r.label === 'Maaş / sözleşme')).toMatchObject({ ok: true, value: '30 oyuncu' })
    const empty = importChecks(summary({ contracts: 0 }))
    expect(empty.find((r) => r.label === 'Oyun tarihi')).toMatchObject({ ok: false, value: 'yok' })
    expect(empty.find((r) => r.label === 'Maaş / sözleşme')).toMatchObject({ ok: false, value: 'yok' })
    expect(importChecks(summary()).map((r) => r.label)).not.toContain('Maaş / sözleşme')
  })
})

describe('Kariyer içe aktarma (v3)', () => {
  it('adım göstergesi: 1 Script indir → 2 LE\'de çalıştır → 3 Dosyayı sürükle; script tek kaynak', () => {
    renderPage()
    const steps = screen.getByRole('list', { name: 'Adımlar' })
    expect(within(steps).getAllByRole('listitem').map((li) => li.querySelector('h3')?.textContent)).toEqual(['Script indir', "LE'de çalıştır", 'Dosyayı sürükle'])
    expect(screen.getByRole('link', { name: /Script'i indir/ })).toHaveAttribute('href', '/fc27_career_export.lua')
  })

  it('sürükle-bırak: dosya adı ve doğru boyut; yükleme sırasında ilerleme; sonuç tablosu', async () => {
    let resolve: (s: ImportSummary) => void = () => undefined
    vi.mocked(endpoints.importCareer).mockReturnValue(new Promise((r) => { resolve = r }) as never)
    renderPage()
    const zone = screen.getByRole('button', { name: /Live Editor log dosyasını sürükle/ })
    const file = new File(['x'.repeat(1536 * 1024)], 'live_editor_2026.log', { type: 'text/plain' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(await screen.findByText('live_editor_2026.log · 1,5 MB')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    expect(await screen.findByRole('progressbar', { name: 'Yükleniyor' })).toBeInTheDocument()
    await waitFor(() => expect(endpoints.importCareer).toHaveBeenCalledWith(3, expect.any(FormData)))
    expect((vi.mocked(endpoints.importCareer).mock.calls[0][1] as FormData).get('log')).toBe(file)
    resolve(summary({ warnings: ['NOT_IN_CAREER'] }))
    const table = await screen.findByRole('table', { name: 'Doğrulama sonucu' })
    expect(within(table).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual([
      'players21.620✓', 'teams841✓', 'Kariyerkariyer algılanmadı✗', 'KadroCrewe Alexandra · 27 oyuncu✓',
    ])
    expect(screen.queryByRole('progressbar')).toBeNull()
    // FAZ 6a-A: ana menü export'unda açık uyarı ve kariyer içinden export rehberi.
    expect(screen.getByText(/Bu export ana menüden; maaş, sözleşme ve oyun tarihi gelmez\. Kariyer içinden export al\./)).toBeInTheDocument()
    const guide = screen.getByRole('list', { name: 'Kariyer içinden export' })
    expect(within(guide).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
  })

  it('FAZ 6a-A: kariyer export\'unda maaş/sözleşme yoksa (CONTRACTS_MISSING) neyi etkilediği ve rehber', async () => {
    vi.mocked(endpoints.importCareer).mockResolvedValue(summary({ warnings: ['CONTRACTS_MISSING'], gameDate: '2026-09-12', contracts: 0 }))
    renderPage()
    fireEvent.drop(screen.getByRole('button', { name: /Live Editor log dosyasını sürükle/ }), { dataTransfer: { files: [new File(['x'], 'a.log')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Yükle' }))
    expect(await screen.findByText(/maaş ve sözleşme yok/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Kariyer içinden export' })).toBeInTheDocument()
    expect(screen.queryByText(/MISSINGTABLE/)).toBeNull()
  })

  it('PREMIUM değilse yükleme kapalı ve neden yazılı', () => {
    premium = false
    renderPage()
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeDisabled()
    expect(screen.getByText(/Bu özellik PREMIUM/)).toBeInTheDocument()
  })
})
