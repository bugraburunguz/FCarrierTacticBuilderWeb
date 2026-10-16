import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import { PlayerCard, type CardPlayer } from '../../src/components/card/PlayerCard'

/**
 * Ölçüm sayfası (scripts/card-width-probe.mjs): kart 100–240px arası 2px adımla, eşikler kapalı (`probe`) çizilir;
 * betik her genişlikte 6 stat ve çiplerin ≥ 11px ile sığıp sığmadığını gerçek tarayıcıda ölçer.
 * En geniş metinler: "≈" işaretli iki haneli değerler, saha ve kaleci etiketleri, üç harfli çipler.
 */
const OUTFIELD: CardPlayer = {
  name: 'Kylian Mbappé', rating: 91, position: 'ST', nationality: 'Wales', club: 'Wolverhampton', league: 'MLS',
  faceStats: [99, 99, 99, 99, 99, 99], faceLabels: ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'], faceStatsApproximate: true,
}
const KEEPER: CardPlayer = { ...OUTFIELD, name: 'Gianluigi Donnarumma', position: 'GK', faceLabels: ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS'] }
const WIDTHS = Array.from({ length: 71 }, (_, i) => 100 + i * 2)

createRoot(document.getElementById('root')!).render(
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, background: '#0b1020' }}>
    {WIDTHS.flatMap((w) => [OUTFIELD, KEEPER].map((p) => (
      <div key={`${w}-${p.position}`} data-probe-width={w} data-probe-kind={p.position}>
        <PlayerCard player={p} width={w} probe />
      </div>
    )))}
  </div>,
)
