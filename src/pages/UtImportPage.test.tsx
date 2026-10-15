import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UtImportPage } from './UtImportPage'

// V3-05c-b: EA, FC 27 Web App'te uzantıları ve geliştirici araçlarını engelliyor; yakalama yöntemleri bayrakla gizli (kod duruyor).
const flags = vi.hoisted(() => ({ capture: false }))
vi.mock('../lib/features', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/features')>()), captureImportEnabled: () => flags.capture }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../api/endpoints', () => ({ endpoints: { captureRules: vi.fn(() => Promise.reject(new Error('yok'))), utCapture: vi.fn(), contribCapture: vi.fn(), formations: vi.fn() } }))

const NOTE = "EA, FC 27 Web App'te uzantıları ve geliştirici araçlarını engelliyor; kulüp ve SBC yakalama şu an kullanılamıyor."

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><UtImportPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  flags.capture = false
})

describe('Kulüp içe aktar (yakalama bayrağı)', () => {
  it('bayrak kapalı (varsayılan): yalnız durum notu; HAR, DevTools talimatı ve uzantı yöntemi görünmez', () => {
    renderPage()
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'HAR dosyasından içe aktar' })).toBeNull()
    expect(screen.queryByLabelText('HAR dosyası')).toBeNull()
    expect(screen.queryByText(/eski yöntem/)).toBeNull()
    expect(document.body.textContent).not.toMatch(/DevTools|Preserve log|Export HAR|Uzantı kimliği/)
  })

  it('bayrak açık: HAR ve uzantı yöntemleri (mevcut akış) görünür', () => {
    flags.capture = true
    renderPage()
    expect(screen.getByRole('heading', { name: 'HAR dosyasından içe aktar' })).toBeInTheDocument()
    expect(screen.getByText(/eski yöntem/)).toBeInTheDocument()
    expect(screen.queryByText(NOTE)).toBeNull()
  })
})
