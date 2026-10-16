import { useMemo } from 'react'
import { useUtCapture } from '../../../state/utCaptureStore'
import { utCardStore } from '../../../state/utCardStore'

/**
 * Kulüp kartları (V3-07c; UtClubPage'den): yerel kütüphanedeki kulüp kartları, aktif kadronun ilk 11'i (örnek kimliği) ve eski kayıt uyarısı
 * (yığın bilgisi yok). v2 ve v3 aynı hook.
 */
export function useUtClub() {
  const library = useMemo(() => utCardStore.get(), [])
  const capture = useUtCapture()
  const owned = useMemo(() => (library?.cards ?? []).filter((c) => c.source === 'club'), [library])
  const starters = useMemo(() => new Set((capture?.activeSquad?.slots ?? []).filter((s) => s.card).map((s) => s.card!.instanceId)), [capture])
  const missingPile = owned.length > 0 && owned.every((c) => c.pile === undefined)
  return { owned, starters, missingPile }
}
