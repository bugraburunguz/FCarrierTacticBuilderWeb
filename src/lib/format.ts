const euro = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export function formatEur(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return '—'
  }
  if (Math.abs(value) >= 1_000_000) {
    return `€${(value / 1_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mn`
  }
  return euro.format(value)
}

export function formatScore(value: number | undefined | null): string {
  return value === undefined || value === null ? '—' : `%${Math.round(value)}`
}

export const ATTR_LABELS: Record<string, string> = {
  Acceleration: 'Hızlanma',
  SprintSpeed: 'Sprint hızı',
  Agility: 'Çeviklik',
  Balance: 'Denge',
  Reactions: 'Reaksiyon',
  BallControl: 'Top kontrolü',
  Dribbling: 'Dribbling',
  Composure: 'Soğukkanlılık',
  Vision: 'Vizyon',
  ShortPassing: 'Kısa pas',
  LongPassing: 'Uzun pas',
  Crossing: 'Orta',
  Curve: 'Falso',
  FKAccuracy: 'Serbest vuruş',
  Finishing: 'Bitiricilik',
  ShotPower: 'Şut gücü',
  LongShots: 'Uzaktan şut',
  Volleys: 'Vole',
  Penalties: 'Penaltı',
  Positioning: 'Pozisyon alma',
  Heading: 'Kafa isabeti',
  DefAwareness: 'Savunma farkındalığı',
  StandingTackle: 'Ayakta müdahale',
  SlidingTackle: 'Kayarak müdahale',
  Interceptions: 'Top kesme',
  Jumping: 'Sıçrama',
  Stamina: 'Dayanıklılık',
  Strength: 'Güç',
  Aggression: 'Agresiflik',
  GKDiving: 'Kaleci uçma',
  GKHandling: 'Kaleci top tutma',
  GKKicking: 'Kaleci vuruş',
  GKPositioning: 'Kaleci pozisyon',
  GKReflexes: 'Refleks',
}

export const ATTR_GROUPS: { title: string; attrs: string[] }[] = [
  { title: 'Hız', attrs: ['Acceleration', 'SprintSpeed'] },
  { title: 'Şut', attrs: ['Positioning', 'Finishing', 'ShotPower', 'LongShots', 'Volleys', 'Penalties'] },
  { title: 'Pas', attrs: ['Vision', 'Crossing', 'FKAccuracy', 'ShortPassing', 'LongPassing', 'Curve'] },
  { title: 'Top sürme', attrs: ['Agility', 'Balance', 'Reactions', 'BallControl', 'Dribbling', 'Composure'] },
  { title: 'Savunma', attrs: ['Interceptions', 'Heading', 'DefAwareness', 'StandingTackle', 'SlidingTackle'] },
  { title: 'Fizik', attrs: ['Jumping', 'Stamina', 'Strength', 'Aggression'] },
  { title: 'Kaleci', attrs: ['GKDiving', 'GKHandling', 'GKKicking', 'GKPositioning', 'GKReflexes'] },
]

export const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST']

