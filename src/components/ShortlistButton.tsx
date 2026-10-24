import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { endpoints } from '../api/endpoints'
import { Button } from '../design/components/primitives'

/**
 * "Kısa listeye ekle" köprüsü (KARIYER-UX FAZ 5, 15 §4.4): Transfer adayları, Oyuncular, Wonderkids ve oyuncu sayfası aynı bileşeni kullanır.
 * Tek mutation: `PUT /careers/{id}/shortlist/{pid}` (çıkarma DELETE); ardından `['shortlist', id]` tazelenir (15 §6.1).
 */
export function ShortlistButton({ careerId, playerId, note, compact = false }: { careerId: number; playerId: number; note?: string; compact?: boolean }) {
  const client = useQueryClient()
  const shortlist = useQuery({ queryKey: ['shortlist', careerId], queryFn: () => endpoints.shortlist(careerId), retry: false })
  const listed = (shortlist.data ?? []).some((s) => s.playerId === playerId)
  const toggle = useMutation({
    mutationFn: () => (listed ? endpoints.shortlistRemove(careerId, playerId) : endpoints.shortlistAdd(careerId, playerId, note === undefined ? {} : { note })),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', careerId] }),
  })
  return (
    <Button variant={listed ? 'secondary' : compact ? 'ghost' : 'primary'} aria-pressed={listed} disabled={shortlist.isLoading || toggle.isPending}
      onClick={() => toggle.mutate()} className={compact ? 'min-h-8 px-2 text-xs' : undefined}>
      <Star size={14} aria-hidden="true" fill={listed ? 'currentColor' : 'none'} /> {listed ? 'Listede' : 'Kısa listeye ekle'}
    </Button>
  )
}
