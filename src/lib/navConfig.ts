import type { AppMode } from '../state/modeStore'

/** Gezinme yapılandırması (Layout ve v3 AppShell ortak kullanır). */
export interface NavGroup {
  to: string
  label: string
  match: string[]
  tabs?: { to: string; label: string }[]
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
    match: ['/tactics', '/squad', '/recommend', '/scouting'],
    tabs: [
      { to: '/squad/builder', label: 'Kadro kurucu' },
      { to: '/tactics/wizard', label: 'Taktik sihirbazı' },
      { to: '/squad', label: 'Kadro' },
      { to: '/recommend', label: 'Transfer önerisi' },
      { to: '/scouting', label: 'Scouting' },
    ],
  },
  { to: '/teams', label: 'Takımlar', match: ['/teams'] },
  { to: '/career/import', label: 'İçe aktar', match: ['/career/import'] },
]

export const UT_NAV: NavGroup[] = [
  { to: '/players', label: 'Kart veritabanı', match: ['/players', '/compare'] },
  { to: '/ut/squad', label: 'Kadro kurucu', match: ['/ut/squad'] },
  { to: '/ut/club', label: 'Kadrom', match: ['/ut/club'] },
  { to: '/ut/meta', label: 'Meta', match: ['/ut/meta'] },
  { to: '/ut/sbc', label: 'SBC çözücü', match: ['/ut/sbc'] },
  { to: '/ut/objectives', label: 'Objective planı', match: ['/ut/objectives'] },
  { to: '/ut/evo', label: 'Evolution', match: ['/ut/evo'] },
  { to: '/ut/import', label: 'Kulüp içe aktar', match: ['/ut/import'] },
]

export const MODES: { id: AppMode; label: string; home: string }[] = [
  { id: 'career', label: 'FC Career', home: '/' },
  { id: 'ut', label: 'Ultimate Team', home: '/ut/squad' },
]

