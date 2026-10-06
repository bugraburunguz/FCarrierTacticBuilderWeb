import { useState } from 'react'
import { decodeTactic, encodeTactic, TacticCodeError, type TacticCatalog } from '../lib/tacticCode'
import { tacticStore, useTactic } from '../state/tacticStore'
import { Button, Card, Input } from './ui'

export function TacticCodeCard({ catalog, onLoaded }: { catalog?: TacticCatalog; onLoaded: () => void }) {
  const tactic = useTactic()
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | undefined>()

  function generate() {
    try {
      setCode(encodeTactic(tactic, catalog!))
      setMessage(undefined)
    } catch (e) {
      setMessage({ text: e instanceof TacticCodeError ? e.message : 'Kod üretilemedi.', ok: false })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage({ text: 'Kod panoya kopyalandı.', ok: true })
    } catch {
      setMessage({ text: 'Kopyalanamadı; kodu elle seç.', ok: false })
    }
  }

  function load() {
    try {
      const next = decodeTactic(input, catalog!)
      tacticStore.set(next)
      onLoaded()
      setMessage({ text: `Taktik yüklendi: ${next.formation}${next.setup ? ` · ${next.setup.buildUp} · Depth ${next.setup.depth}` : ''}.`, ok: true })
    } catch (e) {
      setMessage({ text: e instanceof TacticCodeError ? e.message : 'Kod okunamadı.', ok: false })
    }
  }

  return (
    <Card title="Taktik kodu (FC Kariyer)">
      <div className="space-y-3">
        <div>
          <Button variant="secondary" disabled={!catalog} onClick={generate}>Mevcut taktikten kod üret</Button>
          {code && (
            <div className="mt-2 flex items-center gap-2">
              <Input readOnly value={code} aria-label="Taktik kodu" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button variant="secondary" onClick={copy}>Kopyala</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="FCK1.… kodunu yapıştır" aria-label="Taktik kodunu yapıştır" className="font-mono text-xs" />
          <Button disabled={!catalog || input.trim() === ''} onClick={load}>Yükle</Button>
        </div>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Bu kod yalnızca bu sitede taktik paylaşmak/yedeklemek içindir; <b>EA'nın oyun içi 12 karakterlik kodu değildir</b> ve oyuna girilemez. Formasyon, roller, davranışlar, Build-Up ve Depth'i içerir; büyük/küçük harf önemlidir.
        </p>
      </div>
    </Card>
  )
}
