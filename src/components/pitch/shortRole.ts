/** Dar ekranda (375px) rol etiketi tek satırlık kısa formda gösterilir; tam ad `title`'da ve seçili slotun panelinde durur (F1). */
const NAMES: Record<string, string> = {
  'Advanced Forward': 'Adv. Fwd',
  'Attacking Wingback': 'Att. WB',
  'Ball-Playing Defender': 'BP Def',
  'Ball-Playing Keeper': 'BP GK',
  'Box Crasher': 'Box Crs',
  'Box-to-Box': 'B2B',
  'Centre Half': 'Ctr Half',
  'Classic 10': 'Cls 10',
  'Deep-Lying Playmaker': 'DL Pm',
  Defender: 'Def',
  'False 9': 'False 9',
  Falseback: 'Falsebk',
  Fullback: 'FB',
  Goalkeeper: 'GK',
  'Half Winger': 'Half Wg',
  Holding: 'Hold',
  'Inside Forward': 'In. Fwd',
  'Inverted Wingback': 'Inv. WB',
  Playmaker: 'Playm.',
  Poacher: 'Poach.',
  'Shadow Striker': 'Shadow',
  Stopper: 'Stopper',
  'Sweeper Keeper': 'Sw. GK',
  'Target Forward': 'Tgt Fwd',
  'Wide Back': 'Wide Bk',
  'Wide Half': 'Wide Hf',
  'Wide Midfielder': 'Wide Mid',
  'Wide Playmaker': 'Wide Pm',
  Wingback: 'WB',
  Winger: 'Winger',
}

const FOCUS: Record<string, string> = {
  Attack: 'Atk',
  Support: 'Sup',
  Versatile: 'Vers',
  Aggressive: 'Agg',
  'Build-Up': 'Bld',
  Defend: 'Def',
  Balanced: 'Bal',
  'Ball-Winning': 'Win',
  Wide: 'Wide',
  Roaming: 'Roam',
}

const FALLBACK_LENGTH = 6

function fallback(word: string): string {
  return word.length > FALLBACK_LENGTH ? `${word.slice(0, FALLBACK_LENGTH - 1)}.` : word
}

/** "Advanced Forward · Attack" → "Adv. Fwd · Atk". Sözlükte olmayan ad/odak kısaltılarak sığdırılır, uydurulmaz. */
export function shortRoleLabel(label: string): string {
  const [name, ...rest] = label.split(' · ')
  const focus = rest.join(' · ')
  const shortName = NAMES[name] ?? fallback(name)
  if (!focus) {
    return shortName
  }
  return `${shortName} · ${FOCUS[focus] ?? fallback(focus)}`
}

/** Etiketin tek satırdaki en geniş hâli (karakter): düzen hesabı ve test için üst sınır. */
export const SHORT_ROLE_MAX_CHARS = 16
