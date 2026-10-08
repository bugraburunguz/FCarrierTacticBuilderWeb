export type NoteTone = 'good' | 'warn'

export interface ThresholdNote {
  id: string
  tone: NoteTone
  text: string
}

const ATTACKING = new Set(['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM'])
const PASSING = new Set(['CM', 'CAM', 'CDM', 'LM', 'RM', 'LW', 'RW'])
const RUNNING = new Set(['RB', 'LB', 'RWB', 'LWB', 'CM', 'LM', 'RM'])

const VISION_MIN = 83
const COMPOSURE_MIN = 82
const STAMINA_MIN = 70

/**
 * Rehber kaynaklı (topluluk) eşikler: Vision 83+ pas algı yarıçapı, Composure 82+ baskı altında isabet.
 * Stamina eşiği rehberde sayı olarak verilmez; 70 bizim ayarımızdır (depth.ts ile aynı). Hepsi "tune" etiketlidir
 * ve rol uyum puanını değiştirmez, yalnızca açıklama üretir.
 */
export function thresholdNotes(attrs: Record<string, number>, positions: string[]): ThresholdNote[] {
  const notes: ThresholdNote[] = []
  const has = (set: Set<string>) => positions.some((p) => set.has(p))
  if (has(PASSING)) {
    const vision = attrs.Vision ?? 0
    notes.push(
      vision >= VISION_MIN
        ? { id: 'vision', tone: 'good', text: `Vizyon ${vision}: pas açısı ve boştaki oyuncuyu fark etme yarıçapı geniş (${VISION_MIN}+ eşiği).` }
        : { id: 'vision', tone: 'warn', text: `Vizyon ${vision}: ${VISION_MIN} altında; yaratıcı rollerde boştaki oyuncuyu geç fark edebilir.` },
    )
  }
  if (has(ATTACKING)) {
    const composure = attrs.Composure ?? 0
    notes.push(
      composure >= COMPOSURE_MIN
        ? { id: 'composure', tone: 'good', text: `Soğukkanlılık ${composure}: baskı altında şut isabeti korunur (${COMPOSURE_MIN}+ eşiği).` }
        : { id: 'composure', tone: 'warn', text: `Soğukkanlılık ${composure}: ${COMPOSURE_MIN} altında; baskı altında şut isabeti düşebilir.` },
    )
  }
  if (has(RUNNING)) {
    const stamina = attrs.Stamina ?? 0
    notes.push(
      stamina >= STAMINA_MIN
        ? { id: 'stamina', tone: 'good', text: `Dayanıklılık ${stamina}: çok koşan rolde (bek, box-to-box, kanat orta saha) yorgunluğa dayanır.` }
        : { id: 'stamina', tone: 'warn', text: `Dayanıklılık ${stamina}: çok koşan rolde uzun dönem yorgunluk birikir; yüksek pres ve hücumcu bek rolünde geç dakikalarda düşer, yedek planla.` },
    )
  }
  const accel = attrs.Acceleration ?? 0
  const speed = attrs.SprintSpeed ?? 0
  if (accel > 0 && speed > 0 && Math.abs(accel - speed) >= 8) {
    notes.push({
      id: 'pace-gap',
      tone: accel > speed ? 'good' : 'warn',
      text:
        accel > speed
          ? `Hızlanma (${accel}) sprint hızını (${speed}) geçiyor: kısa patlama güçlü, uzun koşuda geride kalabilir.`
          : `Sprint hızı (${speed}) hızlanmayı (${accel}) geçiyor: ilk adım yavaş, açık alanda uzun koşuda güçlü.`,
    })
  }
  return notes
}
