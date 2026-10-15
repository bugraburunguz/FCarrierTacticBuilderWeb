import type { AppMode } from '../state/modeStore'

/** Gezinme yapılandırması (Layout ve v3 AppShell ortak kullanır). */
export interface NavGroup {
  to: string
  label: string
  match: string[]
  tabs?: { to: string; label: string }[]
  /** Tek veri kaynağı Web App yakalaması: yakalama bayrağı kapalıyken menüde (masaüstü + mobil) görünmez (V3-06a). */
  captureOnly?: boolean
}

export const NAV: NavGroup[] = [
  {
    to: '/career/desk',
    label: 'Menajer masası',
    match: ['/career/desk', '/career/transfer', '/career/growth', '/career/new'],
    tabs: [
      { to: '/career/desk', label: 'Masa' },
      { to: '/career/transfer', label: 'Transfer' },
      { to: '/career/growth', label: 'Gelişim' },
      { to: '/career/new', label: 'Yeni kariyer' },
    ],
  },
  {
    to: '/players',
    label: 'Oyuncular',
    match: ['/players', '/compare', '/wonderkids'],
    tabs: [
      { to: '/players', label: 'Oyuncu ara' },
      { to: '/wonderkids', label: 'Wonderkids' },
      { to: '/compare', label: 'Karşılaştır' },
    ],
  },
  {
    to: '/squad/builder',
    label: 'Taktik & Kadro',
    match: ['/tactics', '/squad', '/recommend', '/scouting', '/replicas'],
    tabs: [
      { to: '/squad/builder', label: 'Kadro kurucu' },
      { to: '/tactics/wizard', label: 'Taktik sihirbazı' },
      { to: '/replicas', label: 'Replikalar' },
      { to: '/squad', label: 'Kadro' },
    ],
  },
  { to: '/teams', label: 'Takımlar', match: ['/teams'] },
  { to: '/career/import', label: 'İçe aktar', match: ['/career/import'] },
]

/**
 * UT menüsü. Veri kaynağı (V3-06a): Kart veritabanı = katalog (/players), Kadro kurucu = katalog + kural seed'i, Meta = ut-meta seed'i +
 * katalog, Replikalar = replika seed'i. Kadrom / SBC / Objective / Evolution / Kulüp içe aktar yalnız Web App yakalamasıyla (yerel
 * yakalama depoları + yakalamadan dolan bilgi tabanı) beslenir → `captureOnly`.
 */
export const UT_NAV: NavGroup[] = [
  { to: '/players', label: 'Kart veritabanı', match: ['/players', '/compare'] },
  { to: '/ut/squad', label: 'Kadro kurucu', match: ['/ut/squad'] },
  { to: '/ut/club', label: 'Kadrom', match: ['/ut/club'], captureOnly: true },
  { to: '/ut/meta', label: 'Meta', match: ['/ut/meta'] },
  { to: '/replicas', label: 'Replikalar', match: ['/replicas'] },
  { to: '/ut/sbc', label: 'SBC çözücü', match: ['/ut/sbc'], captureOnly: true },
  { to: '/ut/objectives', label: 'Objective planı', match: ['/ut/objectives'], captureOnly: true },
  { to: '/ut/evo', label: 'Evolution', match: ['/ut/evo'], captureOnly: true },
  { to: '/ut/import', label: 'Kulüp içe aktar', match: ['/ut/import'], captureOnly: true },
]

/** Modun menüsü; yakalama kapalıyken yalnız yakalamaya bağlı UT öğeleri çıkar (kariyer etkilenmez). */
export function navFor(mode: AppMode, captureEnabled: boolean): NavGroup[] {
  if (mode !== 'ut') {
    return NAV
  }
  return captureEnabled ? UT_NAV : UT_NAV.filter((g) => !g.captureOnly)
}

export const MODES: { id: AppMode; label: string; home: string }[] = [
  { id: 'career', label: 'FC Career', home: '/' },
  { id: 'ut', label: 'Ultimate Team', home: '/ut/squad' },
]

