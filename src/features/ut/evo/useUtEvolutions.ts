import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../../../api/endpoints'
import { useUtCapture } from '../../../state/utCaptureStore'

/** Evolution tanımları (KB) ve kullanıcının yakalanan akademi slotları (V3-07c; UtEvolutionsPage'den). v2 ve v3 aynı hook. */
export function useUtEvolutions() {
  const evolutions = useQuery({ queryKey: ['kb-evolutions'], queryFn: endpoints.kbEvolutions, staleTime: 60_000 })
  const capture = useUtCapture()
  return { evolutions, mine: capture?.evolutions ?? [] }
}

/** KB alanı sayı ya da JSON olabilir; yalnız sayıysa seviye sayısıdır. */
export const levelCount = (levels: unknown): number | undefined => (typeof levels === 'number' ? levels : Array.isArray(levels) ? levels.length : undefined)
