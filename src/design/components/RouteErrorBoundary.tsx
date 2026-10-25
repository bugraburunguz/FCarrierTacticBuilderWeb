import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './primitives'

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i

interface State {
  error?: Error
  key?: string
}

/**
 * Sayfa hata sınırı (REVIEW Y4): bir sayfanın çizim hatası ya da yayın sonrası bulunamayan eski parça dosyası uygulamayı beyaz ekrana
 * düşürmez; menü ayakta kalır, kısa mesaj ve "Sayfayı yenile" görünür. `resetKey` (adres) değişince sınır kendini sıfırlar.
 */
export class RouteErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: State): Partial<State> | null {
    if (state.key !== props.resetKey) {
      return { key: props.resetKey, error: undefined }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FC Assist] sayfa hatası', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }
    const stale = CHUNK_ERROR.test(error.message)
    return (
      <div role="alert" className="glass mx-auto flex max-w-md flex-col items-center gap-3 p-6 text-center">
        <p className="text-base font-semibold text-ink">{stale ? 'Uygulamanın yeni sürümü yüklendi.' : 'Bu sayfa gösterilemedi.'}</p>
        <p className="text-sm text-ink-2">{stale ? 'Devam etmek için sayfayı yenile.' : 'Sayfayı yenilemek çoğu zaman yeter; sorun sürerse başka bir sayfaya geç.'}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Sayfayı yenile</Button>
      </div>
    )
  }
}
