import type { ReactNode } from 'react'
import type { FormationSlot, WeaponState } from '../../api/types'
import type { FitState } from '../../components/card/FitBadge'
import type { FaceCard } from '../../lib/faceAverages'

/** Kadro çekirdeği iki modda da aynıdır; modlar yalnız veri kaynağında ve bağlayıcıda (binding) ayrışır (Q16). */
export type SquadMode = 'ut' | 'career'

/** Slot seçilince yan panelde açılan içerik: kart/oyuncu seçimi, rol-odak, davranışlar (kariyer), öneriler (kariyer). */
export type SlotPanel = 'card' | 'role' | 'behaviors' | 'suggest'

/** Kariyer sahasındaki bir slotun görünümü (oyuncu, rol etiketi, uyum); pitchSlotsOf ile ortak sahaya çevrilir. */
export interface SlotView {
  slotId: string
  position: string
  x: number
  y: number
  player?: { id: number; name: string; overall: number; faceUrl?: string; club?: string; league?: string; nationality?: string; faceStats?: number[]; faceLabels?: string[]; faceStatsApproximate?: boolean }
  roleLabel: string
  /** pct ve state aynı RoleFit'ten (fitDisplay: levelFit + sunucu fitLabel); band yalnız v2 PositionCard'ın rengi için. */
  fit?: { pct: number; state: FitState; band?: WeaponState | null }
  placeholder?: string
  sub?: string
  selected?: boolean
}

/** Slot panelinin bir sekmesi (kariyer: Oyuncu · Rol & odak · Davranışlar · Öneriler). */
export interface SlotTab {
  id: string
  label: string
  node: ReactNode
}

export interface TacticSetup {
  buildUp: 'Short' | 'Balanced' | 'Counter'
  depth: number
}

/** Moddan bağımsız kadro durumu. `assigned` değeri UT'de kart, kariyerde oyuncu kimliğidir (T). */
export interface SquadState<T> {
  formationId?: string
  presetId?: string
  setup?: TacticSetup
  roleOverride: Record<string, string>
  tags: Record<string, string[]>
  assigned: Record<string, T>
}

export type SquadPatch<T> = Partial<SquadState<T>> | ((cur: SquadState<T>) => Partial<SquadState<T>>)

/** Modun durum kaynağı: UT yerel state + utSquadStore, kariyer tacticStore + lineupStore. Çekirdek yalnız bunu görür. */
export interface SquadBinding<T> {
  state: SquadState<T>
  patch: (change: SquadPatch<T>) => void
  /** Formasyon değişince atamaları yeni slotlara taşır (UT: mevki eşleşmesi, kariyer: oyuncu mevki uyumu). */
  carry: (oldSlots: FormationSlot[], assigned: Record<string, T>, newSlots: FormationSlot[]) => Record<string, T>
  keyOf: (item: T) => string
  faceOf: (item: T) => FaceCard | undefined
  defaultFormation: string
  /** Taktik kodu yüklenince atamalar korunur mu (kariyer) yoksa temizlenir mi (UT)? */
  keepAssignedOnImport: boolean
}
