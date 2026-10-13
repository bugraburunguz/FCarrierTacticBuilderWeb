import { useMutation } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorBox } from './ui'

/** E-posta doğrulaması açıkken doğrulanmamış hesaba: kredi doğrulamadan sonra gelir; yeniden gönder (BE-SEC-06). */
export function VerifyEmailBanner() {
  const { me } = useAuth()
  const resend = useMutation({ mutationFn: endpoints.resendVerification })
  if (!me || !me.emailVerificationRequired || me.emailVerified) {
    return null
  }
  return (
    <div role="status" className="border-t border-line bg-code-soft px-4 py-2 text-sm text-code">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <span>E-postanı doğrula: <b>{me.email}</b> adresine bağlantı gönderdik. Kredi doğrulamadan sonra yüklenir.</span>
        <Button variant="secondary" disabled={resend.isPending || resend.isSuccess} onClick={() => resend.mutate()}>
          {resend.isSuccess ? 'Gönderildi' : 'Yeniden gönder'}
        </Button>
        <ErrorBox error={resend.error} />
      </div>
    </div>
  )
}
