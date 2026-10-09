import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { careerStore } from '../state/careerStore'
import { Button, ErrorBox } from './ui'

export function DeleteCareerButton({ career, onDeleted }: { career: Career; onDeleted?: () => void }) {
  const client = useQueryClient()
  const remove = useMutation({
    mutationFn: () => endpoints.deleteCareer(career.id),
    onSuccess: async () => {
      careerStore.set(undefined)
      await Promise.all(['careers', 'squad', 'events', 'snapshots', 'shortlist', 'tags'].map((k) => client.invalidateQueries({ queryKey: [k] })))
      onDeleted?.()
    },
  })
  return (
    <>
      <Button
        variant="danger"
        disabled={remove.isPending}
        onClick={() => {
          if (window.confirm(`“${career.name || career.clubName}” kariyeri; kadro, hareketler, kayıtlar, kısa liste ve notlar dahil tamamen silinsin mi? Bu geri alınamaz.`)) {
            remove.mutate()
          }
        }}
      >
        {remove.isPending ? 'Siliniyor…' : 'Kariyeri sil'}
      </Button>
      <ErrorBox error={remove.error} />
    </>
  )
}
