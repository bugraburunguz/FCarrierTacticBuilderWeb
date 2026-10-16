import type { Preset } from '../api/types'
import type { TacticState } from '../state/tacticStore'
import { profileOf, type BuildUp, type FormationPref, type Striker, type Width, type WizardAnswers } from './wizard'

export interface WizardOption<T> {
  value: T
  label: string
  hint: string
}

/** Sihirbaz sorusu: cevap anahtarı, soru, adım göstergesindeki kısa ad ve seçenekler. v2 ve v3 sihirbazı aynı soruları sorar (V3-07b). */
export type WizardQuestion = {
  [K in keyof WizardAnswers]: { key: K; title: string; short: string; options: WizardOption<WizardAnswers[K]>[] }
}[keyof WizardAnswers]

const BUILD_UP: WizardOption<BuildUp>[] = [
  { value: 'Short', label: 'Topla oyna', hint: 'Kısa paslarla kur, topu rakibe verme.' },
  { value: 'Balanced', label: 'Dengeli', hint: 'Duruma göre hem kur hem direkt oyna.' },
  { value: 'Counter', label: 'Kontra', hint: 'Topu kazan, hızlı ve dikey çık.' },
]

const DEPTH: WizardOption<number>[] = [
  { value: 30, label: 'Geride bekle', hint: 'Alçak blok, boşluk bırakma.' },
  { value: 50, label: 'Orta blok', hint: 'Orta sahada kompakt dur.' },
  { value: 70, label: 'Yüksek hat', hint: 'Rakibi kendi yarı sahasında sıkıştır.' },
  { value: 90, label: 'Agresif pres', hint: 'Anında pres + ofsayt; hızlı stoper ister.' },
]

const WIDTH: WizardOption<Width>[] = [
  { value: 'wings', label: 'Kanatlardan', hint: 'Bindiren bekler, ortalar, genişlik.' },
  { value: 'center', label: 'Merkezden', hint: 'İçeri kat eden kanatlar, oyun kuran 10.' },
  { value: 'mixed', label: 'Karışık', hint: 'Kararsızım, ikisi de olur.' },
]

const STRIKER: WizardOption<Striker>[] = [
  { value: 'target', label: 'Hedef forvet', hint: 'Güçlü, ortaları ve uzun topları bitirir.' },
  { value: 'run', label: 'Arkaya koşan', hint: 'Hızlı, savunma arkasına sızar.' },
  { value: 'drop', label: 'Düşen / yaratıcı', hint: 'Geri iner, oyunu bağlar (false 9).' },
  { value: 'press', label: 'Pres yapan', hint: 'Savunmanın ilk adamı.' },
  { value: 'any', label: 'Fark etmez', hint: '' },
]

const FORMATION: WizardOption<FormationPref>[] = [
  { value: '4-3-3', label: '4-3-3', hint: '' },
  { value: '4-2-3-1', label: '4-2-3-1', hint: '' },
  { value: '4-4-2', label: '4-4-2', hint: '' },
  { value: 'any', label: 'Fark etmez', hint: '' },
]

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  { key: 'buildUp', title: 'Oyun kurulumu', short: 'Oyun kurulumu', options: BUILD_UP },
  { key: 'depth', title: 'Rakip topu kurarken savunman', short: 'Savunma', options: DEPTH },
  { key: 'width', title: 'Hücum yolu', short: 'Hücum yolu', options: WIDTH },
  { key: 'striker', title: 'Forvet tipi', short: 'Forvet tipi', options: STRIKER },
  { key: 'formation', title: 'Formasyon tercihi', short: 'Formasyon', options: FORMATION },
]

/** Seçilen hazır taktiği kadro kurucunun taktiğine çevirir (formasyon, davranış etiketleri, Build-Up/hat). */
export function tacticFromPreset(preset: Preset): TacticState {
  const slots: Record<string, { tags: string[] }> = {}
  Object.entries(preset.slotTags ?? {}).forEach(([slotId, ids]) => (slots[slotId] = { tags: ids }))
  const profile = profileOf(preset)
  return { formation: preset.formation, presetId: preset.id, slots, setup: { buildUp: profile.buildUp, depth: profile.depth } }
}

/** Sihirbaz sonucunun gittiği mevcut yol (→ /squad/builder yönlendirmesi). */
export const WIZARD_RESULT_PATH = '/tactics/builder'
