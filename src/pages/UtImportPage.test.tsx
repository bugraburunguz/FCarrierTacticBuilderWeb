import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UtImportPage } from './UtImportPage'

// V3-06a: VITE_EXTENSION_CAPTURE (varsayılan açık) uzantı + yakalama dosyası; VITE_HAR_IMPORT (varsayılan kapalı) yalnız HAR bölümü.
const flags = vi.hoisted(() => ({ extension: true, har: false }))
vi.mock('../lib/features', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/features')>()),
  extensionCaptureEnabled: () => flags.extension,
  harImportEnabled: () => flags.har,
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: true }) }))
vi.mock('../api/endpoints', () => ({ endpoints: { captureRules: vi.fn(() => Promise.reject(new Error('yok'))), utCapture: vi.fn(), contribCapture: vi.fn(), formations: vi.fn() } }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><UtImportPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  flags.extension = true
  flags.har = false
})

describe('Kulüp içe aktar (bayraklar)', () => {
  it('varsayılan: uzantı senkronu ve yakalama dosyası görünür; HAR bölümü ve EA engeli notu yok', () => {
    renderPage()
    expect(screen.getByLabelText(/Uzantı kimliği/)).toBeInTheDocument()
    expect(screen.getByLabelText('Yakalama dosyası')).toBeInTheDocument()
    // V3-05c-c: yakalama dosyası HAR-01 ile aynı akışta (hedef seçimi + özet + onay), ham dosya doğrudan yüklenmez
    expect(screen.getByRole('heading', { name: 'Yakalama dosyasından içe aktar' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Bilgi tabanına katkı' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'HAR dosyasından içe aktar' })).toBeNull()
    expect(document.body.textContent).not.toMatch(/engelliyor|DevTools|Preserve log|Export HAR/)
  })

  it('HAR bayrağı açık: HAR bölümü de görünür', () => {
    flags.har = true
    renderPage()
    expect(screen.getByRole('heading', { name: 'HAR dosyasından içe aktar' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Uzantı kimliği/)).toBeInTheDocument()
  })

  it('uzantı yakalaması kapalı: yalnız kısa not', () => {
    flags.extension = false
    flags.har = true
    renderPage()
    expect(screen.getByText('Kulüp ve SBC yakalama bu sürümde kapalı.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Uzantı kimliği/)).toBeNull()
    expect(screen.queryByLabelText('HAR dosyası')).toBeNull()
  })
})
