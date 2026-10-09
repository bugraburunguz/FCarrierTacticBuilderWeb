import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { API_ORIGIN } from '../api/client'
import { endpoints } from '../api/endpoints'
import { chromeSender, pingExtension, pullAll, savedExtensionId, saveExtensionId } from '../lib/extensionBridge'
import { Button, Card, ErrorBox, Field, Input } from './ui'

/**
 * Dosyasız kulüp senkronu (EXT-01): site extension'dan yakalanan yanıtları çeker, kendi oturumuyla sunucuya işletir.
 * Extension hesap bilgisi görmez. Katkı modu (yalnız yetkili katkıcılar) kısa ömürlü bağlama anahtarıyla ayrıca bağlanır.
 */
export function ExtensionSync({ onCaptures, busy }: { onCaptures: (captures: unknown[]) => void; busy: boolean }) {
  const [extId, setExtId] = useState(savedExtensionId)
  const [progress, setProgress] = useState<string>()
  const [notice, setNotice] = useState<string>()

  const sync = useMutation({
    mutationFn: async () => {
      const send = chromeSender(extId.trim())
      if (!send) {
        throw new Error('Bu özellik Chrome ve kurulu FCareer uzantısı gerektirir; uzantı kimliğini gir.')
      }
      saveExtensionId(extId)
      const info = await pingExtension(send)
      setProgress(`Uzantı v${info.version}: ${info.count} yanıt var…`)
      const captures = await pullAll(send, (pulled, total) => setProgress(`${pulled} / ${total} yanıt alındı…`))
      if (captures.length === 0) {
        throw new Error("Uzantıda yakalanmış yanıt yok. EA Web App'te Kulüp, SBC ve Objectives sekmelerini aç, sonra tekrar dene.")
      }
      return captures
    },
    onSuccess: (captures) => {
      setProgress(undefined)
      onCaptures(captures)
    },
    onError: () => setProgress(undefined),
  })

  const link = useMutation({
    mutationFn: async () => {
      const send = chromeSender(extId.trim())
      if (!send) {
        throw new Error('Uzantı kimliğini gir ve Chrome kullan.')
      }
      const granted = await endpoints.captureLink('CONTRIB')
      const origin = API_ORIGIN || window.location.origin
      await send({ type: 'FC_LINK', token: granted.token, apiBase: origin, mode: granted.mode })
      return granted.mode
    },
    onSuccess: (mode) => setNotice(mode === 'CONTRIB' ? 'Katkı modu bağlandı: uzantı yalnız global tanımları ve fiyatı gönderir.' : 'Hesabın katkıcı yetkisine sahip değil; kişisel mod bağlandı.'),
  })

  return (
    <Card title="Kulübümü senkronla (dosyasız)">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Field label="Uzantı kimliği (uzantı penceresinde yazar, bir kez girilir)">
          <Input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="abcdefghijklmnopabcdefghijklmnop" className="font-mono" />
        </Field>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending || busy || !extId.trim()}>{sync.isPending ? 'Alınıyor…' : 'Kulübümü senkronla'}</Button>
        <Button variant="secondary" onClick={() => link.mutate()} disabled={link.isPending || !extId.trim()}>Katkı modunu bağla</Button>
      </div>
      {progress && <p role="status" className="mt-2 text-sm text-muted">{progress}</p>}
      {notice && <p role="status" className="mt-2 text-sm text-accent">{notice}</p>}
      <div className="mt-2"><ErrorBox error={sync.error ?? link.error} /></div>
    </Card>
  )
}
