import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Career, CareerBackup } from '../../api/types'
import { DeleteCareerButton } from '../../components/DeleteCareerButton'
import { MoneyInput } from '../../components/MoneyInput'
import { ErrorBox, Field, Input, Select } from '../../components/ui'
import { invalidateCareerScope } from '../../lib/careerQueries'
import { Button, Chip, Panel } from '../../design/components/primitives'

const GENDER_LABEL: Record<number, string> = { 0: 'Erkek', 1: 'Kadın' }
/** Ayar değişince tazelenen sorgular (kariyer listesi, kadro, hareketler, diziliş). */

/**
 * Masa › Ayarlar (KARIYER-UX FAZ 2): eski DeskSettings (spoiler, maaş bütçesi, dönem sonu, challenge, yedek) ve Kadro › kariyer
 * (ad, transfer bütçesi, sezon, silme) tek formda, tek kayıtla. Çağıran `key={career.id}` verir (başka kariyerin değerleri taşınmaz).
 */
export function CareerSettings({ career }: { career: Career }) {
  const client = useQueryClient()
  const [name, setName] = useState(career.name ?? '')
  const [budget, setBudget] = useState<number | undefined>(career.budgetEur ?? undefined)
  const [season, setSeason] = useState(String(career.season ?? 1))
  const [wage, setWage] = useState<number | undefined>(career.wageBudgetEur ?? undefined)
  const [windowEnds, setWindowEnds] = useState(career.windowEndsOn ?? '')
  const [spoiler, setSpoiler] = useState(career.spoilerMode ?? 'SHOW')
  const [challenge, setChallenge] = useState(career.challengeId ?? '')
  const [notice, setNotice] = useState<string>()
  // REVIEW Y2/O3: ayar (bütçe, oyun tarihi, spoiler modu) kariyere bağlı her şeyi etkiler: oyuncu sayfaları ve wonderkids dahil tazelenir.
  const refresh = () => invalidateCareerScope(client, career.id)

  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, {
      name, budgetEur: budget, season: Number(season) || 1, wageBudgetEur: wage, windowEndsOn: windowEnds || undefined, spoilerMode: spoiler, challengeId: challenge,
    }),
    onSuccess: async () => {
      setNotice('Kaydedildi.')
      await refresh()
    },
  })
  const backup = useMutation({
    mutationFn: () => endpoints.careerBackup(career.id),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `fcareer-kariyer-${career.id}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setNotice('Yedek indirildi.')
    },
  })
  const restore = useMutation({
    mutationFn: async (file: File) => endpoints.careerRestore(career.id, JSON.parse(await file.text()) as CareerBackup),
    onSuccess: (data) => {
      setNotice(`Yedek yüklendi: ${data.tags.length} etiket, ${data.shortlist.length} kısa liste, ${data.seasons.length} sezon.`)
      void client.invalidateQueries()
    },
  })

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Kariyer ayarları" source={{ kind: 'decision' }} actions={career.gender !== undefined ? <Chip tone="info">{GENDER_LABEL[career.gender]} futbolu</Chip> : undefined}>
        <div className="grid gap-3 sm:grid-cols-2 min-[1024px]:grid-cols-3">
          <Field label="Ad"><Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Transfer bütçesi (€)"><MoneyInput value={budget} onChange={setBudget} ariaLabel="Transfer bütçesi (€)" /></Field>
          <Field label="Sezon"><Input type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} /></Field>
          <Field label="Maaş bütçesi (haftalık)"><MoneyInput value={wage} onChange={setWage} ariaLabel="Maaş bütçesi (haftalık)" /></Field>
          <Field label="Transfer dönemi bitişi"><Input type="date" value={windowEnds} onChange={(e) => setWindowEnds(e.target.value)} /></Field>
          <Field label="Potansiyel gösterimi">
            <Select value={spoiler} onChange={(e) => setSpoiler(e.target.value as 'SHOW' | 'SCOUT_RANGE')}>
              <option value="SHOW">Tam sayı (spoiler açık)</option>
              <option value="SCOUT_RANGE">Scout aralığı (ör. 80–84)</option>
            </Select>
          </Field>
          <Field label="Challenge (isteğe bağlı)"><Input value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="Road to Glory" maxLength={40} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
          {notice && <span role="status" className="text-xs text-muted">{notice}</span>}
        </div>
        <ErrorBox error={save.error} />
      </Panel>
      {/* MGR-b: menajer profili hesaba bağlı (tek); buradan ve Yeni kariyer'den düzenlenir. */}
      <Panel title="Menajer profili">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-2">Geçmiş, diploma ve tercihlerin bütün kariyerlerde kulüp önerilerini yönlendirir.</p>
          <Link to="/career/manager?sonra=masa" className="glass-3 inline-flex min-h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold hover:bg-[var(--glass-hover)] max-sm:min-h-11">Profili düzenle</Link>
        </div>
      </Panel>
      <Panel title="Yedek ve silme">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => backup.mutate()} disabled={backup.isPending}>JSON yedeği indir</Button>
          <label className="glass-3 inline-flex min-h-10 cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold hover:bg-[var(--glass-hover)] max-sm:min-h-11">
            Yedekten yükle
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore.mutate(f) }} />
          </label>
          <DeleteCareerButton career={career} />
        </div>
        <ErrorBox error={backup.error ?? restore.error} />
        <p className="mt-2 text-xs text-muted">Yedek etiketlerini, kısa listeni ve sezon kayıtlarını içerir; oyuncu verisi Live Editor içe aktarmasından yeniden gelir.</p>
      </Panel>
    </div>
  )
}
