import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { endpoints } from '../../api/endpoints'
import type { WeaponState } from '../../api/types'
import type { FitState } from '../../components/card/FitBadge'
import type { PitchSlot } from '../../components/pitch/Pitch'
import { mapActiveSquad } from '../../lib/activeSquad'
import { cardPlayerOf } from '../../lib/cardPlayer'
import { squadChemistry } from '../../lib/chemistry'
import { shortCoins } from '../../lib/coins'
import { extensionCaptureEnabled } from '../../lib/features'
import { teamRating } from '../../lib/sbcTraditional'
import { roleBaseName } from '../../lib/squadBuilder'
import { personKey, priceSummary, type UtCard } from '../../lib/utCard'
import { useUtRules } from '../../state/rulesStore'
import { useUtCapture } from '../../state/utCaptureStore'
import { DEFAULT_UT_SETUP } from '../../state/utSquadStore'
import type { TacticSetup } from './types'
import { useSquadWorkspace } from './useSquadWorkspace'
import { useUtBinding } from './useUtBinding'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']
const FIT_STATE: Record<WeaponState, FitState> = { GREEN: 'good', YELLOW: 'ok', RED: 'bad' }

/**
 * UT kadro kurucusunun ortak mantığı (V3-07b; UtSquadPage'den çıkarıldı): çalışma alanı (tek çözüm sorgusu), kart değerlendirmesi, kimya, fiyat,
 * saha slotları, kulüp aktif kadrosunun otomatik/elle yüklenmesi ve kart seçim paneli props'u. v2 ve v3 sayfası bunu kullanır.
 */
export function useUtSquadBuilder() {
  useUtRules()
  const { binding, saved, markActiveSquad } = useUtBinding()
  const ws = useSquadWorkspace('ut', binding)
  const { state, slots, roleBySlot, formation, formations, selection, selectedSlot: dialogSlot } = ws
  const picked = state.assigned
  const setup = state.setup ?? DEFAULT_UT_SETUP
  const setSetup = (change: Partial<TacticSetup>) => ws.patch((cur) => ({ setup: { ...(cur.setup ?? DEFAULT_UT_SETUP), ...change } }))
  const capture = useUtCapture()
  // V3-06a: fiyat / kulüp aktif kadrosu / kulüp SBC'leri yalnız Web App yakalamasından gelir; VITE_EXTENSION_CAPTURE=off iken gösterilmez.
  const captureOn = extensionCaptureEnabled()

  const pickedSlots = slots.filter((s) => picked[s.slotId] && roleBySlot.get(s.slotId))
  const evaluationBody = pickedSlots.map((s) => {
    const card = picked[s.slotId]
    return {
      slotId: s.slotId,
      position: s.position,
      roleId: roleBySlot.get(s.slotId)!.roleId,
      ...(card.attrs
        ? { card: { name: card.name, overall: card.rating, positions: card.positions, attrs: card.attrs } }
        : { playerId: card.playerId }),
    }
  })
  const evaluation = useQuery({
    queryKey: ['ut-evaluate', JSON.stringify(evaluationBody), setup.buildUp, setup.depth],
    queryFn: () => endpoints.utSquadEvaluate({ slots: evaluationBody, setup }),
    enabled: evaluationBody.length > 0 && evaluationBody.every((b) => 'card' in b || b.playerId !== undefined),
    retry: false,
    staleTime: 60_000,
  })
  const evalBySlot = Object.fromEntries((evaluation.data?.slots ?? []).map((e) => [e.slotId, e]))

  const chemOf = (cardAt: (slotId: string) => UtCard | undefined) =>
    squadChemistry(
      slots.map((s, i) => {
        const p = cardAt(s.slotId)
        return {
          position: s.position,
          card: p ? { id: i, gender: p.gender, club: p.club, league: p.league, nationality: p.nationality, clubId: p.clubId, leagueId: p.leagueId, nationId: p.nationId, positions: p.positions, cardType: p.cardType } : undefined,
        }
      }),
    )
  const chem = useMemo(() => chemOf((slotId) => picked[slotId]), [slots, picked]) // eslint-disable-line react-hooks/exhaustive-deps
  const fitted = (evaluation.data?.slots ?? []).flatMap((e) => (e.roleFit === undefined ? [] : [e.roleFit]))
  const roleFitAverage = fitted.length > 0 ? Math.round(fitted.reduce((a, b) => a + b, 0) / fitted.length) : undefined
  const price = priceSummary(slots.map((s) => picked[s.slotId]))
  const rating = pickedSlots.length === 11 ? teamRating(Object.values(picked).map((card) => card.rating)) : undefined

  const roleById = new Map((ws.roles.data ?? []).map((r) => [r.id, r]))
  const views: PitchSlot[] = slots.map((s, i) => {
    const card = picked[s.slotId]
    const e = evalBySlot[s.slotId]
    const role = roleById.get(roleBySlot.get(s.slotId)?.roleId ?? s.defaultRole)
    const band = e?.roleFit !== undefined ? (e.badge ?? CHEM_BADGE[chem.perSlot[i]]) : undefined
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      player: card && cardPlayerOf(card, s.position),
      chem: card ? (chem.perSlot[i] as 0 | 1 | 2 | 3) : undefined,
      price: card?.price !== undefined ? shortCoins(card.price) : undefined,
      roleLabel: role ? `${roleBaseName(role)} · ${role.focus}` : roleBySlot.get(s.slotId)?.roleName,
      fit: card && e?.roleFit !== undefined && band ? { pct: Math.round(e.roleFit), state: FIT_STATE[band] } : undefined,
    }
  })

  // Kadro her değişimde utSquadStore'a kaydedilir (useUtBinding); kayıtlı kadro yokken yakalamada aktif kadro varsa otomatik yerleşir.
  const autoApplied = useRef(false)
  useEffect(() => {
    if (autoApplied.current || saved || !capture?.activeSquad || !formations.data) {
      return
    }
    autoApplied.current = true
    const loaded = mapActiveSquad(capture.activeSquad, formations.data)
    if (loaded.formationId) {
      markActiveSquad()
      ws.patch({ formationId: loaded.formationId, assigned: loaded.picked })
      ws.setNote(`Kulübünün aktif kadrosu otomatik yüklendi (${Object.keys(loaded.picked).length} kart${capture.activeSquad.tactic?.tacticName ? ` · taktik: ${capture.activeSquad.tactic.tacticName}` : ''}).`)
    }
  }, [saved, capture, formations.data, markActiveSquad, ws])

  function loadActiveSquad() {
    const squad = capture?.activeSquad
    if (!squad || !formations.data) {
      return
    }
    const loaded = mapActiveSquad(squad, formations.data, formation)
    ws.patch({ ...(loaded.formationId ? { formationId: loaded.formationId } : {}), roleOverride: {}, assigned: loaded.picked })
    markActiveSquad()
    ws.clearSelection()
    ws.setNote(`${Object.keys(loaded.picked).length} kart aktif kadrodan yüklendi${loaded.unplaced > 0 ? `, ${loaded.unplaced} kart yerleşemedi` : ''}${squad.tactic?.tacticName ? ` · taktik: ${squad.tactic.tacticName}` : ''}. Taktik talimatları (rol/focus) henüz çözülmediği için roller otomatik.`)
  }

  const pickDialog = selection?.panel === 'card' && dialogSlot ? dialogSlot : undefined
  const pickProps = pickDialog && {
    position: pickDialog.position,
    current: picked[pickDialog.slotId],
    roleName: roleBySlot.get(pickDialog.slotId)?.roleName,
    roleId: roleBySlot.get(pickDialog.slotId)?.roleId,
    setup,
    chemFor: (card: UtCard) => chemOf((slotId) => (slotId === pickDialog.slotId ? card : picked[slotId])).perSlot[slots.indexOf(pickDialog)] as 0 | 1 | 2 | 3,
    onClear: () => {
      ws.assign(pickDialog.slotId, null)
      ws.clearSelection()
    },
    evaluation: evalBySlot[pickDialog.slotId],
    chemLinks: chem.perSlot[slots.indexOf(pickDialog)],
    usedKeys: new Set(Object.values(picked).map(personKey)),
    onPick: (card: UtCard) => {
      ws.assign(pickDialog.slotId, card)
      ws.clearSelection()
    },
  }

  return { ws, setup, setSetup, capture, captureOn, pickedSlots, evaluation, chem, roleFitAverage, price, rating, views, loadActiveSquad, pickDialog, pickProps }
}
