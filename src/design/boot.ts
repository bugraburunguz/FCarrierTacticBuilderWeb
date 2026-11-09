import { modeStore } from '../state/modeStore'
import { applyTheme, themeStore } from '../state/themeStore'
import { applyDesignAttributes, resolveUiVersion } from './uiVersion'
import './tokens.css'
import './glass.css'

/** Uygulama açılışında (render'dan önce): v3 bayrağını çözer, aurora katmanlarını ekler, tema/mod değişimini `data-*` öznitelikleriyle izler. */
export function bootDesign() {
  const version = resolveUiVersion(window.location.search)
  const root = document.documentElement
  if (version !== 'v3') {
    delete root.dataset.ui
    return
  }
  root.dataset.ui = 'v3'
  if (!document.querySelector('.v3-aurora')) {
    for (const cls of ['v3-aurora', 'v3-grain']) {
      const layer = document.createElement('div')
      layer.className = cls
      layer.setAttribute('aria-hidden', 'true')
      document.body.prepend(layer)
    }
  }
  syncDesign()
  new MutationObserver(syncDesign).observe(root, { attributes: true, attributeFilter: ['class'] })
  modeStore.subscribe(syncDesign)
  themeStore.subscribe(syncDesign)
}

/**
 * Mod ve temayı köke yazar. FCA-3: kariyer şimdilik yalnız koyu (Stitch tasarımı yalnız koyu); kullanıcının tema seçimi saklanır ve UT'de uygulanır.
 * Sınıf yalnız değişince yazılır; MutationObserver döngüye girmez.
 */
export function syncDesign() {
  const mode = modeStore.get()
  if (mode === 'career') {
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark')
    }
  } else {
    applyTheme(themeStore.get())
  }
  applyDesignAttributes(mode)
}
