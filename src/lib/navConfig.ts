import type { AppMode } from '../state/modeStore'

/** Gezinme yapılandırması (Layout ve v3 AppShell ortak kullanır). */
export interface NavGroup {
  to: string
  label: string
  match: string[]
  tabs?: { to: string; label: string }[]
  /** Tek veri kaynağı Web App yakalaması: yakalama bayrağı kapalıyken menüde (masaüstü + mobil) görünmez (V3-06a). */
  captureOnly?: boolean
  /** v3 kariyer mobil alt çubuğu (V3-06d): 'more' = "Daha fazla" sheet'inde; kısa etiket alt çubuk içindir. */
  mobile?: 'more'
  mobileLabel?: string
}

/**
 * v3 kariyer menüsü (V3-06d): tek menü — masaüstünde sol ray, mobilde alt çubuk (en çok 5: dördü + "Daha fazla"). Üstte kariyer sekmeleri yok;
 * "Yeni kariyer" Masa'daki kariyer seçicinin yanında (ve mobil "Daha fazla" sheet'inde). Oyuncular ve Taktik & Kadro alt sekmeleri sayfa içi.
 */
export const CAREER_NAV: NavGroup[] = [
  { to: '/career/dashboard', label: 'Masa', match: ['/career/dashboard', '/career/desk', '/career/new'] },
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
    // KARIYER-UX FAZ 3: "Kadro" yeni Kadro Analizi sayfasına (/career/squad); kurucu/sihirbaz FAZ 4'te Taktik Lab'a taşınır.
    to: '/career/squad',
    label: 'Taktik & Kadro',
    mobileLabel: 'Kadro',
    match: ['/career/squad', '/tactics', '/squad', '/recommend', '/scouting', '/replicas'],
    tabs: [
      { to: '/career/squad', label: 'Kadro' },
      { to: '/squad/builder', label: 'Kadro kurucu' },
      { to: '/tactics/wizard', label: 'Taktik sihirbazı' },
      { to: '/replicas', label: 'Replikalar' },
    ],
  },
  { to: '/career/transfer', label: 'Transfer', match: ['/career/transfer'] },
  { to: '/career/growth', label: 'Gelişim', match: ['/career/growth'], mobile: 'more' },
  { to: '/teams', label: 'Takımlar', match: ['/teams'], mobile: 'more' },
  { to: '/career/import', label: 'İçe aktar', match: ['/career/import'], mobile: 'more' },
]

/** Yalnız mobil "Daha fazla" sheet'inde (masaüstünde Masa'daki düğme). */
export const CAREER_MORE: NavGroup[] = [{ to: '/career/new', label: 'Yeni kariyer', match: [] }]

/** Rotaya göre aktif öğe (öneki eşleşen ilk grup); /players/12 gibi alt rotalar dahil. */
export function activeNav(nav: NavGroup[], pathname: string): NavGroup | undefined {
  return nav.find((g) => g.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)))
}

/** Mobil alt çubuk: kariyerde 'more' olmayanlar + "Daha fazla" sheet'i; UT'de değişmeden ilk 5. */
export function mobileBar(mode: AppMode, nav: NavGroup[]): { items: NavGroup[]; more: NavGroup[] } {
  if (mode === 'ut') {
    return { items: nav.slice(0, 5), more: [] }
  }
  return { items: nav.filter((g) => g.mobile !== 'more'), more: [...nav.filter((g) => g.mobile === 'more'), ...CAREER_MORE] }
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

/** Modun menüsü; yakalama kapalıyken yalnız yakalamaya bağlı UT öğeleri çıkar (kariyer etkilenmez). v3 kariyerde tek menü (CAREER_NAV), v2 NAV. */
export function navFor(mode: AppMode, captureEnabled: boolean, v3 = false): NavGroup[] {
  if (mode !== 'ut') {
    return v3 ? CAREER_NAV : NAV
  }
  return captureEnabled ? UT_NAV : UT_NAV.filter((g) => !g.captureOnly)
}

export const MODES: { id: AppMode; label: string; home: string }[] = [
  { id: 'career', label: 'FC Career', home: '/' },
  { id: 'ut', label: 'Ultimate Team', home: '/ut/squad' },
]

