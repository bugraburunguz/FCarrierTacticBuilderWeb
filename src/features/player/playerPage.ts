import { useSearchParams } from 'react-router-dom'
import type { PlayerSummary } from '../../api/types'

/** Oyuncu Detay şablonunun (UT V3-05b, kariyer V3-06b) bileşen dışı ortakları: kart ölçüleri, adres çubuğu sekmesi, kısa metinler. */

export const CARD_WIDTH = 280
/** <820px: kompakt kart (en çok 200px) — sekme çubuğu 375×812'de ilk ekranda kalsın. */
export const MOBILE_CARD_WIDTH = 180
const TAB_PARAM = 'sekme'

/** Adres çubuğu parametreleri: undefined parametreyi siler; geçmişe yeni kayıt eklemez. */
export function usePageParams() {
  const [params, setParams] = useSearchParams()
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v === undefined ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }
  return { params, set }
}

/** Seçili sekme `?sekme=`; ilk sekme varsayılandır ve adreste yazılmaz. */
export function useTabParam<T extends string>(tabs: readonly { id: T }[]) {
  const { params, set } = usePageParams()
  const tab = tabs.find((t) => t.id === params.get(TAB_PARAM))?.id ?? tabs[0].id
  const setTab = (id: T) => set({ [TAB_PARAM]: id === tabs[0].id ? undefined : id })
  return { tab, setTab, params, set }
}

export function footText(foot?: string): string {
  return foot === 'Left' ? 'Sol' : foot === 'Right' ? 'Sağ' : '–'
}

/** Potansiyel metni: kesin değer, yoksa aralık modundaki aralık (spoiler politikası); ikisi de yoksa undefined. */
export function potentialText(summary: PlayerSummary): string | undefined {
  return summary.potential !== undefined ? String(summary.potential) : summary.potentialRange
}
