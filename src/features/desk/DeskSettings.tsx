import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { Career, CareerBackup } from '../../api/types'
import { DeleteCareerButton } from '../../components/DeleteCareerButton'
import { MoneyInput } from '../../components/MoneyInput'
import { Button, Card, ErrorBox, Field, Input, Select } from '../../components/ui'

/**
 * Kariyer ayarları (spoiler, maaş bütçesi, dönem, challenge) ve JSON yedek: telefonda tek elle erişilir, hiçbir şey kaybolmaz (13 İlke 3).
 * Çağıran `key={career.id}` vermeli (WEB-BUG-01: başka kariyerin ayarları yazılmasın). v2 ve v3 Masa ortak.
 */
export function DeskSettings({ career }: { career: Career }) {
  const client = useQueryClient()
  const [spoiler, setSpoiler] = useState(career.spoilerMode ?? 'SHOW')
  const [wage, setWage] = useState<number | undefined>(career.wageBudgetEur ?? undefined)
  const [windowEnds, setWindowEnds] = useState(career.windowEndsOn ?? '')
  const [challenge, setChallenge] = useState(career.challengeId ?? '')
  const [notice, setNotice] = useState<string>()
  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, { spoilerMode: spoiler, wageBudgetEur: wage, windowEndsOn: windowEnds || undefined, challengeId: challenge }),
    onSuccess: () => {
      setNotice('Kaydedildi.')
      ;['careers', 'squad', 'lineup'].forEach((k) => client.invalidateQueries({ queryKey: [k] }))
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
      client.invalidateQueries()
    },
  })
  return (
    <Card title="Kariyer ayarları ve yedek">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Potansiyel gösterimi">
          <Select value={spoiler} onChange={(e) => setSpoiler(e.target.value as 'SHOW' | 'SCOUT_RANGE')}>
            <option value="SHOW">Tam sayı (spoiler açık)</option>
            <option value="SCOUT_RANGE">Scout aralığı (ör. 80–84)</option>
          </Select>
        </Field>
        <Field label="Maaş bütçesi (haftalık)"><MoneyInput key={career.id} value={wage} onChange={setWage} /></Field>
        <Field label="Transfer dönemi bitişi"><Input type="date" value={windowEnds} onChange={(e) => setWindowEnds(e.target.value)} /></Field>
        <Field label="Challenge (isteğe bağlı)"><Input value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="Road to Glory" maxLength={40} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        <DeleteCareerButton career={career} />
        <Button variant="secondary" onClick={() => backup.mutate()} disabled={backup.isPending}>JSON yedeği indir</Button>
        <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">
          Yedekten yükle
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore.mutate(f) }} />
        </label>
        {notice && <span role="status" className="text-xs text-muted">{notice}</span>}
      </div>
      <div className="mt-2"><ErrorBox error={save.error ?? backup.error ?? restore.error} /></div>
      <p className="mt-2 text-xs text-muted">Yedek etiketlerini, kısa listeni ve sezon kayıtlarını içerir; oyuncu verisi Live Editor import'undan yeniden gelir.</p>
    </Card>
  )
}
