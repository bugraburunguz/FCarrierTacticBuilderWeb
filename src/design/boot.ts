import { isCareerSurface, modeStore } from '../state/modeStore'
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
  const sync = () => syncDesign()
  sync()
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
  modeStore.subscribe(sync)
  themeStore.subscribe(sync)
}

/**
 * Mod ve temayı köke yazar. FCA-3: kariyer şimdilik yalnız koyu (Stitch tasarımı yalnız koyu); kullanıcının tema seçimi saklanır ve UT'de uygulanır.
 * Sınıf yalnız değişince yazılır; MutationObserver döngüye girmez.
 */
export function syncDesign(pathname: string = window.location.pathname) {
  const mode = modeStore.get()
  const root = document.documentElement
  const career = isCareerSurface(mode, pathname)
  if (career) {
    if (!root.classList.contains('dark')) {
      root.classList.add('dark')
    }
  } else {
    applyTheme(themeStore.get())
  }
  if (root.dataset.ui === 'v3' && career) {
    root.dataset.surface = 'career'
  } else {
    delete root.dataset.surface
  }
  applyDesignAttributes(mode)
}
