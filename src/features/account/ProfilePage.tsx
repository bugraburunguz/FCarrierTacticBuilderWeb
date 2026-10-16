import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { tokens } from '../../api/tokens'
import { useAuth } from '../../auth/AuthContext'
import { BETA_TEXT, useAppConfig } from '../../state/appConfig'
import { Chip, Skeleton } from '../../design/components/primitives'
import { AppDialog } from '../../design/components/AppDialog'
import { ErrorAlert, PasswordField, PRIMARY_BUTTON, TextField } from './AccountParts'

const MIN_PASSWORD = 8

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={`glass-2 flex min-w-0 flex-col gap-3 p-4 ${className}`}>
      <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
      {children}
    </section>
  )
}

function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const change = useMutation({
    mutationFn: () => endpoints.changePassword(current, next),
    onSuccess: (response) => {
      // Sunucu diğer oturumları kapattı; bu oturum yeni token'larla sürer.
      tokens.set(response.accessToken, response.refreshToken)
      setCurrent('')
      setNext('')
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    change.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <PasswordField label="Mevcut şifre" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <PasswordField label={`Yeni şifre (en az ${MIN_PASSWORD} karakter)`} required minLength={MIN_PASSWORD} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      <ErrorAlert error={change.error} />
      {change.isSuccess && <p role="status" className="text-sm text-good">Şifren değişti; diğer cihazlardaki oturumlar kapatıldı.</p>}
      <button type="submit" disabled={change.isPending} className={`${PRIMARY_BUTTON} sm:w-auto sm:self-start`}>{change.isPending ? 'Değiştiriliyor…' : 'Şifreyi değiştir'}</button>
    </form>
  )
}

/**
 * PROD-PREP 4 (KVKK): kalıcı hesap silme. Mevcut şifre + e-postayı yazma onayı; e-posta eşleşmeden düğme kapalı (sunucu da doğrular).
 * Başarıda yerel oturum temizlenir ve ana sayfaya dönülür.
 */
function DeleteAccount({ email, onDeleted }: { email: string; onDeleted: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const remove = useMutation({ mutationFn: () => endpoints.deleteAccount(password, confirm), onSuccess: onDeleted })
  const matches = confirm.trim().toLocaleLowerCase('en') === email.toLocaleLowerCase('en')
  const close = () => {
    setOpen(false)
    setPassword('')
    setConfirm('')
    remove.reset()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (matches && password) {
      remove.mutate()
    }
  }
  return (
    <>
      <p className="text-sm text-ink-2">Hesabın, kariyerlerin ve tüm kişisel kayıtların kalıcı olarak silinir. Bilgi tabanı katkıların hesabınla bağı kaldırılarak kalır.</p>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center self-start rounded-[var(--radius-sm)] border border-bad px-4 text-sm font-semibold text-bad hover:bg-[var(--bad-soft)] max-sm:min-h-11">Hesabımı sil</button>
      {open && (
        <AppDialog title="Hesabımı sil" hint="Bu işlem geri alınamaz." onClose={close}>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-sm text-ink-2">Devam etmek için şifreni ve <b className="text-ink">{email}</b> adresini yaz.</p>
            <PasswordField label="Mevcut şifre" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField label="Onay için e-postanı yaz" type="email" required autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <ErrorAlert error={remove.error} />
            <button type="submit" disabled={!matches || !password || remove.isPending} className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-bad px-4 text-sm font-semibold text-on-accent hover:opacity-90 disabled:opacity-50">
              {remove.isPending ? 'Siliniyor…' : 'Hesabı kalıcı olarak sil'}
            </button>
          </form>
        </AppDialog>
      )}
    </>
  )
}

/**
 * Profil ve abonelik (v3 Pano, V3-07a): hesap, kredi, şifre değiştir, abonelik, hesap silme (PROD-PREP 4), oturumu kapat.
 * Ödeme yok (BILLING_STUB kapalıyken mevcut davranış).
 */
export function ProfilePage() {
  const { me, logout, refreshMe } = useAuth()
  const { freeBeta } = useAppConfig()
  const navigate = useNavigate()
  const subscribe = useMutation({ mutationFn: endpoints.subscribe, onSuccess: () => refreshMe() })
  if (!me) {
    return <Skeleton className="h-64" />
  }
  const premium = me.subscriptionType === 'PREMIUM'
  const planLabel = freeBeta ? 'Beta' : premium ? 'PREMIUM' : 'FREE'
  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Profil</h1>
        <button type="button" onClick={signOut} className="glass-3 inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)] max-sm:min-h-11">
          <LogOut size={16} aria-hidden="true" />Oturumu kapat
        </button>
      </header>
      <div className="grid grid-cols-1 gap-3 min-[820px]:grid-cols-2">
        <Panel title="Hesap">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            <dt className="text-ink-2">E-posta</dt>
            <dd className="min-w-0 break-words">{me.email}</dd>
            <dt className="text-ink-2">Plan</dt>
            <dd><Chip>{planLabel}</Chip></dd>
            {me.emailVerified !== undefined && (
              <>
                <dt className="text-ink-2">Doğrulama</dt>
                <dd>{me.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'}</dd>
              </>
            )}
          </dl>
        </Panel>
        <Panel title="Kredi">
          <p className="font-[var(--font-num)] text-3xl font-semibold tabular-nums">{premium ? 'Sınırsız' : `${me.creditBalance ?? 0} / ${me.dailyCreditLimit}`}</p>
          <p className="text-xs text-ink-2">{freeBeta ? 'Beta süresince analizler kredi düşmez.' : premium ? 'PREMIUM üyelikte analizler kredi düşmez.' : 'Günlük kredi her gün yenilenir; ücretli analizler (öneri, kadro analizi) kredi düşer.'}</p>
        </Panel>
        <Panel title="Şifre değiştir">
          <ChangePassword />
        </Panel>
        <Panel title="Abonelik">
          {freeBeta ? (
            <p className="text-sm text-good">{BETA_TEXT}</p>
          ) : premium ? (
            <p className="text-sm text-good">PREMIUM aktif: sınırsız analiz, reklamsız deneyim.</p>
          ) : (
            <>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Sınırsız kadro analizi ve öneri</li>
                <li>Reklamsız kullanım</li>
                <li>Kariyer dosyası içe aktarma</li>
              </ul>
              {import.meta.env.DEV ? (
                <>
                  <p className="text-xs text-ink-2">Geliştirme modu: bu düğme aboneliği ödeme almadan etkinleştirir (yalnız sunucuda sahte ödeme açıksa çalışır).</p>
                  <button type="button" disabled={subscribe.isPending} onClick={() => subscribe.mutate()} className={`${PRIMARY_BUTTON} sm:w-auto sm:self-start`}>PREMIUM'u etkinleştir (test)</button>
                  <ErrorAlert error={subscribe.error} />
                </>
              ) : (
                <p className="text-xs text-ink-2">PREMIUM yakında: ödeme altyapısı hazırlanıyor.</p>
              )}
            </>
          )}
        </Panel>
        <Panel title="Hesabı sil">
          <DeleteAccount email={me.email} onDeleted={async () => { await logout(); navigate('/', { replace: true }) }} />
        </Panel>
      </div>
    </div>
  )
}
