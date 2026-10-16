import { LogoLockup } from '../design/brand/LogoLockup'
import { LEGAL_NOTE, TAGLINE } from '../design/brand/legal'
import { Panel } from '../design/components/primitives'

/** Hakkında: marka, tek cümlelik tanım ve EA markası yasal notu. */
export function AboutPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-4">
      <h1 className="sr-only">Hakkında</h1>
      <div className="flex justify-center py-4">
        <LogoLockup size={64} />
      </div>
      <Panel title="FC Assist">
        <p className="text-sm text-ink-2">{TAGLINE}</p>
        <p className="mt-3 text-sm text-ink-2">Kariyer modu ve Ultimate Team için taktik, kadro ve transfer yardımcısı.</p>
        <p data-testid="legal-note" className="mt-4 border-t border-line pt-3 text-xs text-muted">{LEGAL_NOTE}</p>
      </Panel>
    </div>
  )
}
