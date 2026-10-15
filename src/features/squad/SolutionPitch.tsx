import type { FormationSlot } from '../../api/types'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import { cardPlayerOf } from '../../lib/cardPlayer'
import { squadChemistry } from '../../lib/chemistry'
import type { SbcCandidate } from '../../lib/sbcTraditional'

/**
 * Kart üstü rozet kısa tutulur (isim şeridini kapatmasın, Q18): kulüp kartı "✓", alınacak kartta bilgi tabanı fiyatı kısaltılmış ("1,2K");
 * fiyatı bilinmeyen kartta rozet yok — "fiyat yok" alışveriş listesinde yazar.
 */
export type SolutionCard = SbcCandidate & { tier?: number; knownPrice?: number }

const short = (value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M` : value >= 1000 ? `${(value / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}K` : String(value))
const label = (card: SolutionCard) => (card.tier !== undefined && card.tier <= 1 ? '✓' : card.knownPrice !== undefined ? short(card.knownPrice) : undefined)

/**
 * Çözüm sahası (Q16: kadro çekirdeğindeki saha bileşeni, salt okunur): 11 kart, slot kimyası, kulüpten gelen kartta ✓.
 * Q17/Q18 ölçümleri (`scripts/q17.mjs`, `scripts/sbc-solve-shots.mjs`) bu sahada da aynı `[data-slot-group]` düzeniyle çalışır.
 */
export function SolutionPitch({ slots, picks }: { slots: FormationSlot[]; picks: (SolutionCard | undefined)[] }) {
  const chem = squadChemistry(slots.map((s, i) => ({ position: s.position, card: picks[i] })))
  const views: PitchSlot[] = slots.map((s, i) => {
    const card = picks[i]
    return {
      slotId: s.slotId, position: s.position, x: s.x, y: s.y,
      player: card && cardPlayerOf(card, s.position),
      chem: card ? (chem.perSlot[i] as 0 | 1 | 2 | 3) : undefined,
      price: card ? label(card) : undefined,
      outOfPosition: card ? !card.positions.includes(s.position) : undefined,
    }
  })
  return <Pitch slots={views} onPickPlayer={() => undefined} readOnly />
}
