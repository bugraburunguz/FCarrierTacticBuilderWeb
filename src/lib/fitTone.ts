import type { WeaponState } from '../api/types'
import type { FitState } from '../components/card/FitBadge'

/** v3'te levelFit "seviyesinde" bandında (AT_LEVEL) sunucu `badge` göndermez: renk yok, etiket var. */
export type FitTone = WeaponState | 'NEUTRAL'

export function toneOf(badge: WeaponState | null | undefined): FitTone {
  return badge ?? 'NEUTRAL'
}

export const FIT_STATE_OF: Record<FitTone, FitState> = { GREEN: 'good', YELLOW: 'ok', RED: 'bad', NEUTRAL: 'neutral' }
