import { AlertTriangle } from 'lucide-react'

/** EA kodu dışa/içe aktarmada tam eşleşmeyen slotlar (TAC-03): küçük gri metin değil, görünür uyarı bandı. */
export function ExportWarnings({ warnings, title = 'Kod tam eşleşmedi' }: { warnings?: string[]; title?: string }) {
  if (!warnings || warnings.length === 0) {
    return null
  }
  return (
    <div role="alert" className="mt-2 rounded-md border border-line bg-code-soft px-3 py-2 text-xs text-code">
      <p className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide">
        <AlertTriangle size={14} aria-hidden="true" /> {title} ({warnings.length})
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {warnings.map((w) => <li key={w}>{w}</li>)}
      </ul>
    </div>
  )
}
