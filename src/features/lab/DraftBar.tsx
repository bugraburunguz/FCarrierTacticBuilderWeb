import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Field, Input, Select } from '../../components/ui'
import { AppDialog } from '../../design/components/AppDialog'
import { Button, Panel } from '../../design/components/primitives'
import { labStore, type CareerLab, type Draft } from '../../state/labStore'
import { MakeMainDialog } from '../career/MakeMainDialog'

/**
 * Taslak çubuğu (KARIYER-UX FAZ 4a, 15 §4.3): seçici (ad + kirli "•"), Yeni · Kopyala · Yeniden adlandır · Sil ve birincil "Ana taktiğim yap".
 * Sil onaylı; kirli taslakta ikinci onay. Sınır mesajı labStore'dan (FAZ 1). Panel kesik kenar (`edge="draft"`) ve SourceTag taslak durumunu söyler.
 */
export function DraftBar({ careerId, lab, draft, onNew, newDisabled }: { careerId: number; lab: CareerLab; draft: Draft; onNew: () => string | undefined; newDisabled?: boolean }) {
  const [message, setMessage] = useState<string>()
  const [renaming, setRenaming] = useState<string>()
  const [deleting, setDeleting] = useState<'ask' | 'dirty'>()
  const [makeMain, setMakeMain] = useState(false)

  const copy = () => {
    const created = labStore.create(careerId, { name: `${draft.name} (kopya)`, origin: draft.origin, tactic: draft.tactic, lineup: draft.lineup })
    setMessage(created.ok ? undefined : created.message)
  }
  const confirmDelete = () => {
    if (draft.dirty && deleting !== 'dirty') {
      setDeleting('dirty')
      return
    }
    labStore.remove(careerId, draft.id)
    setDeleting(undefined)
  }

  return (
    <Panel title="Taslak" edge="draft" source={{ kind: 'draft', savedSlot: draft.dirty ? undefined : draft.savedTo?.slot }}
      actions={<Button variant="primary" onClick={() => setMakeMain(true)}>Ana taktiğim yap</Button>}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <Field label="Taslak">
            <Select value={draft.id} onChange={(e) => labStore.setActive(careerId, e.target.value)}>
              {lab.drafts.map((d) => <option key={d.id} value={d.id}>{`${d.name}${d.dirty ? ' •' : ''}`}</option>)}
            </Select>
          </Field>
        </div>
        <Button disabled={newDisabled} onClick={() => setMessage(onNew())}><Plus size={14} aria-hidden="true" />Yeni taslak</Button>
        <Button onClick={copy}><Copy size={14} aria-hidden="true" />Kopyala</Button>
        <Button onClick={() => setRenaming(draft.name)}><Pencil size={14} aria-hidden="true" />Yeniden adlandır</Button>
        <Button variant="ghost" onClick={() => setDeleting('ask')}><Trash2 size={14} aria-hidden="true" />Sil</Button>
      </div>
      {renaming !== undefined && (
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => {
          e.preventDefault()
          if (renaming.trim()) {
            labStore.patch(careerId, draft.id, () => ({ name: renaming.trim() }))
          }
          setRenaming(undefined)
        }}>
          <div className="min-w-[200px] flex-1"><Field label="Taslak adı"><Input value={renaming} maxLength={60} onChange={(e) => setRenaming(e.target.value)} /></Field></div>
          <Button type="submit" variant="primary">Adı kaydet</Button>
          <Button type="button" variant="ghost" onClick={() => setRenaming(undefined)}>Vazgeç</Button>
        </form>
      )}
      {message && <p role="alert" className="mt-2 text-sm text-bad">{message}</p>}
      {deleting && (
        <AppDialog title="Taslağı sil" onClose={() => setDeleting(undefined)}>
          <div className="flex flex-col gap-3 text-sm">
            <p>“{draft.name}” silinir. Ana taktik ve kayıtlı slotlar etkilenmez.</p>
            {deleting === 'dirty' && <p role="status" className="text-warn">Bu taslakta kaydedilmemiş değişiklik var; silinince geri gelmez.</p>}
            <span className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={confirmDelete}>{deleting === 'dirty' ? 'Yine de sil' : 'Sil'}</Button>
              <Button variant="ghost" onClick={() => setDeleting(undefined)}>Vazgeç</Button>
            </span>
          </div>
        </AppDialog>
      )}
      {makeMain && (
        <MakeMainDialog careerId={careerId} name={draft.name} tactic={draft.tactic} lineup={draft.lineup}
          onDone={(slot) => labStore.markSaved(careerId, draft.id, slot)} onClose={() => setMakeMain(false)} />
      )}
    </Panel>
  )
}
