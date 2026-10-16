import type { SbcRequirement } from '../api/types'
import { describeRequirement } from '../lib/sbcChallenge'

/** SBC şart satırı (liste öğesi). Tanınmayan tip (kind UNKNOWN) sessizce düşmez: "Bilinmeyen şart" çipi + EA tip adı ve ham değer. */
export function RequirementItem({ requirement }: { requirement: SbcRequirement }) {
  const unknown = requirement.kind === 'UNKNOWN'
  return (
    <li className="inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5">
      {unknown && <span className="rounded-full border border-line px-1.5 text-[11px] font-semibold text-ink">Bilinmeyen şart</span>}
      <span>{describeRequirement(requirement)}</span>
    </li>
  )
}
