import { modeStore } from '../state/modeStore'
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
  const sync = () => applyDesignAttributes(modeStore.get())
  sync()
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
  modeStore.subscribe(sync)
}
