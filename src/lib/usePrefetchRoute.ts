import { useQueryClient } from '@tanstack/react-query'
import { useActiveCareerId } from '../state/careerStore'
import { prefetchRoute } from './routePrefetch'

/** Menü öğesi için üzerine gelme/odak işleyicisi: hedef sayfa ve seçili kariyerin kadrosu önceden yüklenir. */
export function usePrefetchRoute(to: string): () => void {
  const client = useQueryClient()
  const careerId = useActiveCareerId()
  return () => void prefetchRoute(to, client, careerId)
}
