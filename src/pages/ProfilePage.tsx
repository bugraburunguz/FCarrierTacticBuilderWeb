import { useMutation } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorBox, Pill, Spinner } from '../components/ui'

export function ProfilePage() {
  const { me, refreshMe } = useAuth()
  const subscribe = useMutation({ mutationFn: endpoints.subscribe, onSuccess: () => refreshMe() })

  if (!me) {
    return <Spinner />
  }
  const premium = me.subscriptionType === 'PREMIUM'

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card title="Profil">
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">E-posta</dt>
          <dd>{me.email}</dd>
          <dt className="text-muted">Plan</dt>
          <dd>{premium ? <Pill tone="emerald">PREMIUM</Pill> : <Pill>FREE</Pill>}</dd>
          <dt className="text-muted">Günlük kredi</dt>
          <dd>{premium ? 'Sınırsız' : `${me.creditBalance ?? 0} / ${me.dailyCreditLimit}`}</dd>
          <dt className="text-muted">Reklam</dt>
          <dd>{me.showAds ? 'Gösterilir' : 'Kapalı'}</dd>
        </dl>
      </Card>
      <Card title="Abonelik">
        {premium ? (
          <p className="text-sm text-accent">PREMIUM aktif: sınırsız analiz, reklamsız deneyim.</p>
        ) : (
          <>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Sınırsız kadro analizi ve slot önerisi</li>
              <li>Reklamsız kullanım</li>
              <li>Kariyer dosyası içe aktarma (hazır olduğunda)</li>
            </ul>
            {import.meta.env.DEV ? (
              <>
                <p className="mt-3 rounded-md bg-code-soft p-2 text-xs text-code">
                  Geliştirme modu: bu buton aboneliği ödeme almadan etkinleştirir (yalnız sunucuda sahte ödeme açıksa çalışır).
                </p>
                <Button className="mt-3" disabled={subscribe.isPending} onClick={() => subscribe.mutate()}>
                  PREMIUM’u etkinleştir (test)
                </Button>
                <div className="mt-2"><ErrorBox error={subscribe.error} /></div>
              </>
            ) : (
              <p className="mt-3 text-xs text-muted">PREMIUM aboneliği yakında: ödeme altyapısı hazırlanıyor.</p>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
