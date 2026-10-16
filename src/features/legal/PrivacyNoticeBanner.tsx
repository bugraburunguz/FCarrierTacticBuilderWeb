import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '../../design/components/primitives'
import { PRIVACY_VERSION } from './privacyVersion'

/**
 * Tek seferlik bilgilendirme bandı (PROD-PREP 3): aydınlatma onayı olmayan mevcut hesaplara ve metin sürümü değişince bir sonraki girişte.
 * "Okudum" sürümü sunucuya yazar; bilgilendirme onayıdır, açık rıza değildir.
 */
export function PrivacyNoticeBanner() {
  const { me, refreshMe } = useAuth()
  const ack = useMutation({ mutationFn: () => endpoints.acknowledgePrivacy(PRIVACY_VERSION), onSuccess: () => refreshMe() })
  if (!me || (me.privacyAckVersion ?? 0) >= PRIVACY_VERSION || ack.isSuccess) {
    return null
  }
  return (
    <section aria-label="Aydınlatma metni" className="border-b border-line bg-[var(--info-soft)] px-4 py-2 text-sm text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1">Aydınlatma metni {me.privacyAckVersion ? 'güncellendi' : 'yayında'}: kişisel verilerinin nasıl işlendiğini anlatıyor.</p>
        <Link to="/privacy" className="inline-flex min-h-10 items-center font-semibold text-accent underline underline-offset-2 max-sm:min-h-11">Metni oku</Link>
        <Button variant="primary" disabled={ack.isPending} onClick={() => ack.mutate()}>Okudum</Button>
      </div>
    </section>
  )
}
