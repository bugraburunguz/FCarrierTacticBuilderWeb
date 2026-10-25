import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../design/components/MobileSheet'
import { usePageParams } from '../player/playerPage'

/** Satır açma (Altyapı ve Gelişim): masaüstünde ?oyuncu= ile sağ panel, mobilde ayrı sayfa (/career/academy/:id; Gelişim'den gelindiyse ?geri=gelisim). */
export function useYouthOpener(back: 'altyapi' | 'gelisim') {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const { params, set } = usePageParams()
  const selectedId = Number(params.get('oyuncu')) || undefined
  const pagePath = (id: number) => `/career/academy/${id}${back === 'gelisim' ? '?geri=gelisim' : ''}`
  const open = (id: number) => (mobile ? navigate(pagePath(id)) : set({ oyuncu: String(id) }))
  // Masa ya da paylaşılan bağlantı ?oyuncu= ile gelir; mobilde panel yok, oyuncu sayfasına geçilir.
  useEffect(() => {
    if (mobile && selectedId) {
      navigate(`/career/academy/${selectedId}${back === 'gelisim' ? '?geri=gelisim' : ''}`, { replace: true })
    }
  }, [mobile, selectedId, navigate, back])
  return { open, close: () => set({ oyuncu: undefined }), selectedId: mobile ? undefined : selectedId }
}
