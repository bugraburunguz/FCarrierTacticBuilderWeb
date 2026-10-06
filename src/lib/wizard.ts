import type { Preset } from '../api/types'

export type BuildUp = 'Short' | 'Balanced' | 'Counter'
export type Width = 'wings' | 'center' | 'mixed'
export type Striker = 'target' | 'run' | 'drop' | 'press' | 'any'
export type FormationPref = '4-3-3' | '4-2-3-1' | '4-4-2' | 'any'

export interface WizardAnswers {
  buildUp: BuildUp
  depth: number
  width: Width
  striker: Striker
  formation: FormationPref
}

export const DEFAULT_ANSWERS: WizardAnswers = { buildUp: 'Balanced', depth: 50, width: 'mixed', striker: 'any', formation: 'any' }

export function depthBand(depth: number): string {
  if (depth <= 30) {
    return 'Deep'
  }
  if (depth <= 60) {
    return 'Balanced'
  }
  return depth <= 90 ? 'High' : 'Aggressive'
}

export interface PresetProfile {
  buildUp: BuildUp
  depth: number
  wide: number
  central: number
  striker?: Exclude<Striker, 'any'>
}

const WIDE_TAGS = new Set(['w_cross', 'wm_stay_wide_cross', 'fb_overlap', 'fb_back_post', 'fb_early_cross', 'w_stay_high'])
const CENTRAL_TAGS = new Set(['cam_create', 'cm_playmake', 'fb_invert', 'wm_cut_inside', 'w_cut_inside', 'wm_create_inside', 'w_create_inside', 'cdm_deep_build'])
const STRIKER_TAGS: Record<string, Exclude<Striker, 'any'>> = { st_target: 'target', st_run_behind: 'run', st_drop_deep: 'drop', st_press: 'press', st_poacher: 'run' }

function readBuildUp(settings: Record<string, unknown>): BuildUp {
  const text = String(settings.buildUp ?? '').toLowerCase()
  if (text.startsWith('short')) {
    return 'Short'
  }
  if (text.startsWith('counter')) {
    return 'Counter'
  }
  return 'Balanced'
}

function readDepth(settings: Record<string, unknown>): number {
  if (typeof settings.depth === 'number') {
    return settings.depth
  }
  const text = `${settings.defensiveApproach ?? ''} ${settings.defensiveStyle ?? ''}`.toLowerCase()
  if (text.includes('aggressive') || text.includes('agresif')) {
    return 85
  }
  if (text.includes('high') || text.includes('yüksek')) {
    return 70
  }
  if (text.includes('deep') || text.includes('low') || text.includes('alçak')) {
    return 30
  }
  return 50
}

export function profileOf(preset: Preset): PresetProfile {
  const settings = preset.settings ?? {}
  const entries = Object.entries(preset.slotTags ?? {})
  const tags = entries.flatMap(([, ids]) => ids)
  const strikerTags = entries.filter(([slot]) => slot.includes('ST')).flatMap(([, ids]) => ids)
  const striker = strikerTags.map((t) => STRIKER_TAGS[t]).find(Boolean)
  return {
    buildUp: readBuildUp(settings),
    depth: readDepth(settings),
    wide: tags.filter((t) => WIDE_TAGS.has(t)).length,
    central: tags.filter((t) => CENTRAL_TAGS.has(t)).length,
    striker,
  }
}

export interface ScoredPreset {
  preset: Preset
  score: number
  reasons: string[]
  profile: PresetProfile
}

const BUILD_UP_LABEL: Record<BuildUp, string> = { Short: 'kısa pas', Balanced: 'dengeli', Counter: 'kontra' }
const STRIKER_LABEL: Record<Exclude<Striker, 'any'>, string> = { target: 'hedef forvet', run: 'arkaya koşan forvet', drop: 'düşen forvet', press: 'pres yapan forvet' }

export function scorePreset(preset: Preset, answers: WizardAnswers): ScoredPreset {
  const profile = profileOf(preset)
  const reasons: string[] = []
  let score = 0

  if (profile.buildUp === answers.buildUp) {
    score += 30
    reasons.push(`Oyun kurulumu ${BUILD_UP_LABEL[profile.buildUp]}`)
  } else if (profile.buildUp === 'Balanced' || answers.buildUp === 'Balanced') {
    score += 12
  }

  const depthGap = Math.abs(profile.depth - answers.depth)
  const depthScore = Math.max(0, 30 - (depthGap / 40) * 30)
  score += depthScore
  if (depthGap <= 15) {
    reasons.push(`Savunma hattı yüksekliği uyuyor (${profile.depth})`)
  }

  if (answers.width === 'mixed') {
    score += 10
  } else {
    const lean = profile.wide - profile.central
    const matches = answers.width === 'wings' ? lean > 0 : lean < 0
    const neutral = lean === 0
    score += matches ? 20 : neutral ? 8 : 0
    if (matches) {
      reasons.push(answers.width === 'wings' ? 'Kanat ağırlıklı hücum' : 'Merkez ağırlıklı hücum')
    }
  }

  if (answers.striker === 'any') {
    score += 7
  } else if (profile.striker === answers.striker) {
    score += 15
    reasons.push(`Forvet: ${STRIKER_LABEL[answers.striker]}`)
  }

  if (answers.formation === 'any') {
    score += 5
  } else if (preset.formation.startsWith(answers.formation)) {
    score += 10
    reasons.push(`Formasyon ${preset.formation}`)
  }

  return { preset, score: Math.round(score), reasons, profile }
}

export function recommend(presets: Preset[], answers: WizardAnswers, limit = 3): ScoredPreset[] {
  return presets
    .map((p) => scorePreset(p, answers))
    .sort((a, b) => b.score - a.score || a.preset.name.localeCompare(b.preset.name, 'tr'))
    .slice(0, limit)
}
