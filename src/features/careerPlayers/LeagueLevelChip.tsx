import { ArrowDown, ArrowUp, Equal } from 'lucide-react'
import { Chip } from '../../design/components/primitives'
import { leagueLevel } from '../../lib/leagueLevel'

const ICON = { above: ArrowUp, at: Equal, below: ArrowDown } as const

/** Lig seviyesi çipi: nötr çip + simge (anlam metinde, renk tek başına anlam taşımaz); lig gücü bilinmiyorsa hiçbir şey çizilmez. */
export function LeagueLevelChip({ overall, leagueOvr }: { overall: number; leagueOvr?: number }) {
  const level = leagueLevel(overall, leagueOvr)
  if (!level) {
    return null
  }
  const Icon = ICON[level.kind]
  return (
    <Chip>
      <Icon size={12} aria-hidden="true" />
      {level.text}
    </Chip>
  )
}
