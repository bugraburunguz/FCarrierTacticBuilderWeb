import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function Boom({ error }: { error?: Error }): never {
  throw error ?? new Error('çizim hatası')
}

/** REVIEW Y4: tek sayfanın çizim hatası (ya da yayın sonrası bulunamayan eski parça dosyası) uygulamayı beyaz ekrana düşürmez. */
describe('RouteErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))
  afterEach(() => vi.restoreAllMocks())

  it('çizim hatasında kısa mesaj ve yeniden yükleme; çevresi (menü) ayakta kalır', () => {
    render(<div><nav>Menü</nav><RouteErrorBoundary resetKey="/a"><Boom /></RouteErrorBoundary></div>)
    expect(screen.getByRole('alert')).toHaveTextContent('Bu sayfa gösterilemedi.')
    expect(screen.getByRole('button', { name: 'Sayfayı yenile' })).toBeInTheDocument()
    expect(screen.getByText('Menü')).toBeInTheDocument()
  })

  it('eski parça dosyası (yayın sonrası) için "yeni sürüm" mesajı', () => {
    render(<RouteErrorBoundary resetKey="/a"><Boom error={new TypeError('Failed to fetch dynamically imported module: /assets/Page-abc.js')} /></RouteErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Uygulamanın yeni sürümü yüklendi.')
  })

  it('adres değişince (resetKey) yeniden dener', () => {
    const { rerender } = render(<RouteErrorBoundary resetKey="/a"><Boom /></RouteErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(<RouteErrorBoundary resetKey="/b"><p>Diğer sayfa</p></RouteErrorBoundary>)
    expect(screen.getByText('Diğer sayfa')).toBeInTheDocument()
  })
})
