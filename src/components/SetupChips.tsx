import { depthBand } from '../lib/wizard'
import { Pill } from './ui'

const BUILD_UP: Record<string, string> = { Short: 'Kısa pas', Balanced: 'Dengeli', Counter: 'Kontra' }

export function SetupChips({ settings }: { settings?: Record<string, unknown> }) {
  if (!settings) {
    return null
  }
  const buildUp = typeof settings.buildUp === 'string' ? settings.buildUp : undefined
  const depth = typeof settings.depth === 'number' ? settings.depth : undefined
  const approach = typeof settings.defensiveApproach === 'string' ? settings.defensiveApproach : undefined
  if (!buildUp && depth === undefined && !approach) {
    return null
  }
  return (
    <div className="mt-2" aria-label="FC27 kurulum">
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">FC27 kurulum</p>
      <div className="flex flex-wrap gap-1.5">
        {buildUp && <Pill tone="sky">Build-Up: {BUILD_UP[buildUp] ?? buildUp}</Pill>}
        {depth !== undefined && <Pill tone="emerald">Defensive Depth: {depth} · {depthBand(depth)}</Pill>}
        {approach && <Pill>{approach}</Pill>}
      </div>
    </div>
  )
}
