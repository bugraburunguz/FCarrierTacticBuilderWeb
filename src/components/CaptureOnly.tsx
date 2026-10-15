import { ShieldOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { CAPTURE_OFF_TEXT, extensionCaptureEnabled } from '../lib/features'

/**
 * Tek veri kaynağı Web App yakalaması olan UT sayfaları (V3-06a): yalnız `VITE_EXTENSION_CAPTURE=off` iken doğrudan URL ile gelinirse
 * sayfa yerine tek kısa not. Varsayılan açık: sayfanın kendisi çizilir. Kod silinmez.
 */
export function CaptureOnly({ title, children }: { title: string; children: ReactNode }) {
  if (extensionCaptureEnabled()) {
    return <>{children}</>
  }
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2">
      <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">{title}</h1>
      <section aria-label="Yakalama durumu" className="glass flex items-start gap-3 p-4">
        <ShieldOff size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
        <p className="text-sm text-ink">{CAPTURE_OFF_TEXT}</p>
      </section>
    </div>
  )
}
