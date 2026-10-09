import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { request } from '../api/client'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Select } from '../components/ui'
import { parseChallengeText } from '../lib/sbcText'

const KEY = 'fc.adminKey'
type Tab = 'queue' | 'entry' | 'contributors' | 'maintenance'
const TABS: { id: Tab; label: string }[] = [
  { id: 'queue', label: 'Onay kuyruğu' },
  { id: 'entry', label: 'Elle giriş' },
  { id: 'contributors', label: 'Katkıcılar' },
  { id: 'maintenance', label: 'Bakım' },
]
const KINDS = [
  { id: 'sbc-set', label: 'SBC seti' },
  { id: 'sbc-challenge', label: 'SBC challenge' },
  { id: 'objective-group', label: 'Objective grubu' },
  { id: 'evolution', label: 'Evolution' },
]

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

/** Yönetici CMS'i (DATA-07). Anahtar yalnız oturum belleğinde (sessionStorage) tutulur, hiçbir yere kaydedilmez. */
export function AdminUtPage() {
  const [adminKey, setAdminKey] = useState(readKey)
  const [tab, setTab] = useState<Tab>('queue')
  const call = <T,>(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown) =>
    request<T>(`/admin/ut${path}`, { method, body, headers: { 'X-Admin-Key': adminKey }, auth: false })

  return (
    <div className="space-y-4">
      <Card title="Yönetici">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Yönetici anahtarı (X-Admin-Key)">
            <Input
              type="password"
              autoComplete="off"
              value={adminKey}
              onChange={(e) => {
                setAdminKey(e.target.value)
                try {
                  sessionStorage.setItem(KEY, e.target.value)
                } catch {
                  /* oturum belleği yoksa anahtar yalnız bu sayfada kalır */
                }
              }}
            />
          </Field>
          <div role="tablist" aria-label="Bölüm" className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`rounded-md px-2.5 py-1 font-display text-sm font-semibold uppercase tracking-wide ${tab === t.id ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-ink hover:bg-line'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
      {!adminKey ? <EmptyState>Devam etmek için yönetici anahtarını gir.</EmptyState> : (
        <>
          {tab === 'queue' && <QueuePanel call={call} />}
          {tab === 'entry' && <EntryPanel call={call} />}
          {tab === 'contributors' && <ContributorPanel call={call} />}
          {tab === 'maintenance' && <MaintenancePanel call={call} />}
        </>
      )}
    </div>
  )
}

type Call = <T>(path: string, method?: 'GET' | 'POST' | 'PUT', body?: unknown) => Promise<T>

interface QueueRow {
  id: number
  kind: string
  naturalKey: string
  candidates: { hash: string; source: string; payload?: unknown }[]
}

function QueuePanel({ call }: { call: Call }) {
  const client = useQueryClient()
  const queue = useQuery({ queryKey: ['admin-queue'], queryFn: () => call<QueueRow[]>('/queue'), retry: false })
  const resolve = useMutation({
    mutationFn: ({ id, hash }: { id: number; hash: string | null }) => call(`/queue/${id}/resolve`, 'POST', { hash }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-queue'] }),
  })
  return (
    <Card title={`Onay kuyruğu (${queue.data?.length ?? 0})`}>
      <ErrorBox error={queue.error ?? resolve.error} />
      {queue.data?.length === 0 && <EmptyState>Bekleyen çelişki yok.</EmptyState>}
      <ul className="space-y-3">
        {(queue.data ?? []).map((item) => (
          <li key={item.id} className="rounded-md border border-line p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <Pill tone="amber">{item.kind}</Pill>
              <span className="num">{item.naturalKey}</span>
            </div>
            {item.candidates.filter((c) => c.payload).map((c) => (
              <div key={c.hash} className="mb-2">
                <pre className="max-h-40 overflow-auto rounded-md bg-surface-2 p-2 text-xs">{JSON.stringify(c.payload, null, 2)}</pre>
                <Button className="mt-1" onClick={() => resolve.mutate({ id: item.id, hash: c.hash })} disabled={resolve.isPending}>Bunu uygula</Button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => resolve.mutate({ id: item.id, hash: null })}>Reddet</Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function EntryPanel({ call }: { call: Call }) {
  const [kind, setKind] = useState('sbc-set')
  const [id, setId] = useState('')
  const [json, setJson] = useState('{\n  "name": "",\n  "category": "Players",\n  "repeatable": false\n}')
  const [pasted, setPasted] = useState('')
  const [notice, setNotice] = useState<string>()
  const save = useMutation({
    mutationFn: () => call<{ hash: string }>(`/${kind}/${Number(id)}`, 'PUT', JSON.parse(json)),
    onSuccess: (r) => setNotice(`Kaydedildi (${r.hash.slice(0, 8)}).`),
  })
  const promo = useMutation({
    mutationFn: (body: { code: string; name: string }) => call('/promos', 'PUT', body),
    onSuccess: () => setNotice('Promo kaydedildi.'),
  })
  const [promoCode, setPromoCode] = useState('')
  const [promoName, setPromoName] = useState('')

  function fillFromText() {
    const parsed = parseChallengeText(pasted)
    setKind('sbc-challenge')
    setJson(JSON.stringify({ setId: 0, name: '', kind: 'SQUAD', requirements: parsed.requirements }, null, 2))
    setNotice(parsed.unknown.length > 0 ? `Tanınmayan satırlar: ${parsed.unknown.join(' | ')}` : `${parsed.requirements.length} şart ayrıştırıldı; set ve challenge kimliğini gir.`)
  }

  return (
    <div className="space-y-4">
      <Card title="EA ekranı metninden challenge">
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} placeholder={'Min. Team Rating: 83\nSame Club Count: Max 3\nPlayers from League: Premier League: Min 2'}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-ink" />
        <Button className="mt-2" variant="secondary" onClick={fillFromText} disabled={!pasted.trim()}>Şartları ayrıştır ve forma aktar</Button>
      </Card>
      <Card title="Kayıt gir / düzenle">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tür"><Select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</Select></Field>
          <Field label="Kimlik (EA id)"><Input type="number" min={1} value={id} onChange={(e) => setId(e.target.value)} /></Field>
        </div>
        <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={12} spellCheck={false} aria-label="Kayıt JSON'u"
          className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink" />
        <div className="mt-2 flex items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending || !id}>Kaydet</Button>
          {notice && <span role="status" className="text-xs text-muted">{notice}</span>}
        </div>
        <div className="mt-2"><ErrorBox error={save.error} /></div>
      </Card>
      <Card title="Promo">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <Field label="Kod"><Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="TOTW" /></Field>
          <Field label="Ad"><Input value={promoName} onChange={(e) => setPromoName(e.target.value)} placeholder="Team of the Week" /></Field>
          <Button onClick={() => promo.mutate({ code: promoCode, name: promoName })} disabled={!promoCode || !promoName || promo.isPending}>Kaydet</Button>
        </div>
        <div className="mt-2"><ErrorBox error={promo.error} /></div>
      </Card>
    </div>
  )
}

function ContributorPanel({ call }: { call: Call }) {
  const [userId, setUserId] = useState('')
  const [notice, setNotice] = useState<string>()
  const change = useMutation({
    mutationFn: (action: 'grant' | 'revoke') => call<{ status: string }>(`/contributors/${Number(userId)}/${action}`, 'POST', {}),
    onSuccess: (r) => setNotice(r.status === 'GRANTED' ? 'Katkıcı yetkisi verildi (PREMIUM hakları açıldı).' : 'Katkıcı yetkisi alındı.'),
  })
  return (
    <Card title="Katkıcılar">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Kullanıcı kimliği"><Input type="number" min={1} value={userId} onChange={(e) => setUserId(e.target.value)} /></Field>
        <Button onClick={() => change.mutate('grant')} disabled={!userId || change.isPending}>Yetki ver</Button>
        <Button variant="secondary" onClick={() => change.mutate('revoke')} disabled={!userId || change.isPending}>Yetkiyi al</Button>
      </div>
      {notice && <p role="status" className="mt-2 text-xs text-muted">{notice}</p>}
      <div className="mt-2"><ErrorBox error={change.error} /></div>
      <p className="mt-3 text-xs text-muted">Katkıcılar güvenilir başlar: tek katkıları doğrulanmış sayılır, çelişki onay kuyruğuna düşer. Her değişiklik denetim kaydına yazılır.</p>
    </Card>
  )
}

interface IngestionRun { id: number; provider: string; status: string; next_offset: number; total?: number; created: number; updated: number; attempts: number; last_error?: string }

function MaintenancePanel({ call }: { call: Call }) {
  const runs = useQuery({ queryKey: ['admin-runs'], queryFn: () => call<IngestionRun[]>('/ingestion-runs'), retry: false })
  const ids = useQuery({ queryKey: ['admin-eaids'], queryFn: () => call<{ id: number; kind: string; ea_id: number; name: string; votes: number }[]>('/ea-ids'), retry: false })
  const [notice, setNotice] = useState<string>()
  const sync = useMutation({ mutationFn: () => call<{ upserted: number }>('/items/sync-base', 'POST', {}), onSuccess: (r) => setNotice(`${r.upserted} kart senkronlandı.`) })
  const aggregate = useMutation({ mutationFn: () => call<{ buckets: number }>('/prices/aggregate', 'POST', {}), onSuccess: (r) => setNotice(`${r.buckets} fiyat kovası güncellendi.`) })
  const apply = useMutation({ mutationFn: (s: { kind: string; ea_id: number; name: string }) => call('/ea-ids/apply', 'POST', { kind: s.kind, eaId: s.ea_id, name: s.name }), onSuccess: () => ids.refetch() })
  return (
    <div className="space-y-4">
      <Card title="Bakım">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>Katalogdan UT kartlarını senkronla</Button>
          <Button variant="secondary" onClick={() => aggregate.mutate()} disabled={aggregate.isPending}>Fiyat agregasyonunu çalıştır</Button>
        </div>
        {notice && <p role="status" className="mt-2 text-xs text-muted">{notice}</p>}
        <div className="mt-2"><ErrorBox error={sync.error ?? aggregate.error} /></div>
      </Card>
      <Card title="Ingestion koşuları">
        <ErrorBox error={runs.error} />
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr><th className="py-1">#</th><th>Sağlayıcı</th><th>Durum</th><th className="text-right">Offset</th><th className="text-right">Yeni/Güncel</th><th>Hata</th></tr></thead>
          <tbody>
            {(runs.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-1 num">{r.id}</td><td>{r.provider}</td><td><Pill tone={r.status === 'DONE' ? 'emerald' : r.status === 'FAILED' ? 'rose' : 'amber'}>{r.status}</Pill></td>
                <td className="num text-right">{r.next_offset}{r.total ? ` / ${r.total}` : ''}</td><td className="num text-right">{r.created}/{r.updated}</td><td className="max-w-[240px] truncate text-xs text-muted">{r.last_error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Bekleyen EA kimlik önerileri">
        {(ids.data ?? []).length === 0 ? <EmptyState>Bekleyen öneri yok.</EmptyState> : (
          <ul className="divide-y divide-line text-sm">
            {(ids.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                <span><Pill>{s.kind}</Pill> <span className="num">#{s.ea_id}</span> → {s.name} <span className="text-xs text-muted">({s.votes} oy)</span></span>
                <Button variant="secondary" onClick={() => apply.mutate(s)}>Uygula</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
