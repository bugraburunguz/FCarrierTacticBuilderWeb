/** 1–99 derece kademesi (FCA-3, Stitch): 1–49 düşük, 50–69 orta, 70–79 iyi, 80–99 elit. */
export type RatingTier = 'low' | 'avg' | 'good' | 'elite'

export function ratingTier(value: number): RatingTier {
  return value >= 80 ? 'elite' : value >= 70 ? 'good' : value >= 50 ? 'avg' : 'low'
}
