export interface RadarAxis {
  label: string
  attrs: string[]
}

export const OUTFIELD_AXES: RadarAxis[] = [
  { label: 'Hız', attrs: ['Acceleration', 'SprintSpeed'] },
  { label: 'Şut', attrs: ['Positioning', 'Finishing', 'ShotPower', 'LongShots', 'Volleys', 'Penalties'] },
  { label: 'Pas', attrs: ['Vision', 'Crossing', 'FKAccuracy', 'ShortPassing', 'LongPassing', 'Curve'] },
  { label: 'Top sürme', attrs: ['Agility', 'Balance', 'Reactions', 'BallControl', 'Dribbling', 'Composure'] },
  { label: 'Savunma', attrs: ['Interceptions', 'DefAwareness', 'StandingTackle', 'SlidingTackle'] },
  { label: 'Fizik', attrs: ['Jumping', 'Stamina', 'Strength', 'Aggression', 'Heading'] },
]

export const GOALKEEPER_AXES: RadarAxis[] = [
  { label: 'Uçma', attrs: ['GKDiving'] },
  { label: 'Top tutma', attrs: ['GKHandling'] },
  { label: 'Vuruş', attrs: ['GKKicking'] },
  { label: 'Pozisyon', attrs: ['GKPositioning'] },
  { label: 'Refleks', attrs: ['GKReflexes'] },
]

export function radarAxes(goalkeeper: boolean): RadarAxis[] {
  return goalkeeper ? GOALKEEPER_AXES : OUTFIELD_AXES
}

export function radarValues(attrs: Record<string, number>, goalkeeper: boolean): number[] {
  return radarAxes(goalkeeper).map((axis) => {
    const values = axis.attrs.map((a) => attrs[a]).filter((v): v is number => typeof v === 'number')
    return values.length === 0 ? 0 : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
  })
}
