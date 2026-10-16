import { Link } from 'react-router-dom'
import { Button, Chip, StatTile } from '../../design/components/primitives'
import { MAX_SQUAD_CHEM } from '../../lib/chemistry'
import { shortCoins } from '../../lib/coins'
import { utCardStore } from '../../state/utCardStore'
import { SquadRoleDialog, SquadWorkspaceView } from './SquadWorkspaceView'
import { TacticCodeCard } from './TacticCodeCard'
import { PickBody } from './ut/PickBody'
import { useUtSquadBuilder } from './useUtSquadBuilder'

/** v3 UT kadro kurucusu (/ut/squad): ortak kadro çekirdeği (08 §3 + §14-16). Mantık useUtSquadBuilder'da; kart seçimi yan panelde (mobilde sheet). */
export function UtSquadBuilderPage() {
  const { ws, setup, setSetup, capture, captureOn, pickedSlots, evaluation, chem, roleFitAverage, price, rating, views, loadActiveSquad, pickDialog, pickProps } = useUtSquadBuilder()
  const { formation, formations } = ws

  return (
    <>
      <SquadWorkspaceView
        title="UT Kadro Kurucu"
        slots={views}
        selectedSlotId={pickDialog?.slotId}
        onPickPlayer={(slotId) => ws.select(slotId, 'card')}
        onPickRole={(slotId) => ws.select(slotId, 'role')}
        onRemove={(slotId) => ws.assign(slotId, null)}
        onSwap={ws.swap}
        slotPanel={pickProps && pickDialog ? { title: `${pickDialog.position} — Kart seç`, onClose: ws.clearSelection, body: <PickBody {...pickProps} /> } : undefined}
        formations={(formations.data ?? []).map((f) => ({ id: f.id, label: f.label ?? f.id }))}
        formationsLoading={formations.isLoading}
        formationsError={formations.error ? 'Formasyonlar yüklenemedi.' : undefined}
        formationId={formation?.id}
        onFormation={(id) => ws.changeFormation(id)}
        setup={setup}
        onSetup={(next) => setSetup(next)}
        squadNameKey="fc.squadName.ut"
        ratingStars={rating}
        allAverages={[{ label: 'Ort. OVR', value: evaluation.data?.averageOverall }, { label: 'Rol uyumu', value: roleFitAverage === undefined ? undefined : `%${roleFitAverage}` }, { label: 'Dolu', value: `${pickedSlots.length}/11` }]}
        stats={[{ label: 'Rating', value: rating }, { label: 'Dolu', value: pickedSlots.length, suffix: '/ 11' }]}
        averages={ws.averages}
        chem={{ value: chem.total, max: MAX_SQUAD_CHEM }}
        sections={
          <>
            <section aria-label="Meta" className="space-y-2">
              <Chip tone="info">Rol uyumu {roleFitAverage === undefined ? '–' : `%${roleFitAverage}`}</Chip>
            </section>
            {captureOn && (
              <section aria-label="Fiyat" className="space-y-2">
                <h3 className="font-display text-lg font-semibold">Fiyat</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Toplam" value={price.known > 0 ? shortCoins(price.total) : undefined} />
                  <StatTile label="Ortalama" value={price.average !== undefined ? shortCoins(price.average) : undefined} />
                </div>
                <p className="text-xs text-muted">{price.known}/{price.count} kartın fiyatı biliniyor</p>
                <p className="text-xs text-muted">Fiyat grafiği: henüz veri yok.</p>
              </section>
            )}
          </>
        }
        tacticCode={<TacticCodeCard mode="ut" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={ws.applyImportedCode} />}
        onClear={ws.clearAssigned}
        clearDisabled={pickedSlots.length === 0}
        note={ws.note}
        actions={captureOn && capture?.activeSquad ? <Button onClick={loadActiveSquad}>Kulüp aktif kadrosunu yükle</Button> : undefined}
        notice={(utCardStore.get()?.cards ?? []).length === 0 && pickedSlots.length === 0 ? { id: 'ut-no-cards', text: captureOn
          ? <>Kulüp kartların yok: mevkiye tıkla, katalogdan seç ya da <Link to="/ut/import" className="text-accent underline">kulüp içe aktar</Link>.</>
          : <>Mevkiye tıkla ve katalogdan seç.</> } : undefined}
      />
      <SquadRoleDialog ws={ws} />
    </>
  )
}
