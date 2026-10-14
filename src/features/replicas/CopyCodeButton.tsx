import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

const COPIED_MS = 1500

/** Taktik kodunu panoya kopyalar; sonuç ekran okuyucuya ve gözle "Kopyalandı" olarak bildirilir. Pano yoksa kodu elle seçtirir. */
export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), COPIED_MS)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Taktik kodunu kopyala: ${code}`}
      className={`glass-3 inline-flex min-h-8 items-center gap-1.5 px-2.5 text-xs font-semibold text-ink hover:bg-[var(--glass-hover)] max-sm:min-h-11 ${className ?? ''}`}
    >
      {state === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span className="font-[var(--font-num)] tabular-nums tracking-wider">{code}</span>
      <span role="status" className="text-muted">{state === 'copied' ? 'Kopyalandı' : state === 'failed' ? 'Kopyalanamadı' : ''}</span>
    </button>
  )
}
