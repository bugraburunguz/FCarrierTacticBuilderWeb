import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import type { CaptureResult } from '../../../api/types'
import { mapActiveSquad } from '../../../lib/activeSquad'
import { toPlannerObjectives, toSbcPool } from '../../../lib/capture'
import { mergeCards } from '../../../lib/captureMerge'
import { cardPrice, fromCapture, type UtCard } from '../../../lib/utCard'
import { objectiveStore } from '../../../state/objectiveStore'
import { sbcPoolStore } from '../../../state/sbcPoolStore'
import { utCaptureStore } from '../../../state/utCaptureStore'
import { utCardStore } from '../../../state/utCardStore'
import { DEFAULT_UT_SETUP, utSquadStore } from '../../../state/utSquadStore'

function toLibrary(result: CaptureResult): UtCard[] {
  const own = result.cards.map((c) => fromCapture(c, 'club', cardPrice(c)))
  const listings = result.prices.flatMap((p, i) => (p.card ? [fromCapture(p.card, 'market', p.buyNow ?? p.currentBid ?? p.startingBid, `-${i}`)] : []))
  return [...own, ...listings]
}

/**
 * UT kulüp içe aktarma (V3-07c; UtImportPage'den): yakalamalar sunucuda işlenir, kartlar ve market ilanları yerel kütüphaneye birleşir, aktif kadro
 * kadro kurucuya yerleşir; sonuçtan SBC havuzuna ve objective planlayıcıya aktarım. v2 ve v3 aynı hook.
 */
export function useUtImport() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string>()
  const upload = useMutation({
    mutationFn: (captures: unknown[]) => endpoints.utCapture(captures),
    onSuccess: async (data) => {
      const saved = utCardStore.set(mergeCards(utCardStore.get()?.cards, toLibrary(data)))
      utCaptureStore.set(data)
      let placed = ''
      if (data.activeSquad) {
        try {
          const formations = await queryClient.fetchQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
          const loaded = mapActiveSquad(data.activeSquad, formations)
          if (loaded.formationId) {
            utSquadStore.set({ formationId: loaded.formationId, setup: DEFAULT_UT_SETUP, picked: loaded.picked, roleOverride: {}, origin: 'active-squad' })
            placed = ` Aktif kadron kadro kurucuya yerleştirildi (${Object.keys(loaded.picked).length} kart${data.activeSquad.tactic?.tacticName ? ` · taktik: ${data.activeSquad.tactic.tacticName}` : ''}).`
          }
        } catch {
          placed = ' Aktif kadro yerleştirilemedi; kadro kurucudan "Kulüp aktif kadrosunu yükle" ile dene.'
        }
      }
      setNotice((saved ? 'Kulüp kartların ve gördüğün market ilanları kadro kurucuda kullanılabilir.' : 'Kartlar tarayıcıda saklanamadı (alan dolu).') + placed)
    },
  })
  const result = upload.data
  const modes = useMemo(() => [...new Set((result?.objectives ?? []).map((g) => g.gameMode).filter(Boolean))] as string[], [result])
  const [mode, setMode] = useState('CLUB')
  const process = (captures: unknown[]) => {
    setNotice(undefined)
    upload.mutate(captures)
  }
  const toPool = () => {
    if (result) {
      sbcPoolStore.set(toSbcPool(result.cards))
      navigate('/ut/sbc')
    }
  }
  const importObjectives = () => {
    if (result) {
      const objectives = toPlannerObjectives(result.objectives, { gameModes: mode ? [mode] : undefined })
      objectiveStore.replaceImported(objectives)
      setNotice(`${objectives.length} objective planlayıcıya eklendi.`)
    }
  }
  return { upload, notice, result, modes, mode, setMode, process, toPool, importObjectives }
}
