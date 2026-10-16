import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import { Skeleton } from '../../design/components/primitives'
import { PRIVACY_VERSION } from '../legal/privacyVersion'
import { CenteredCard, ErrorAlert, PasswordField, PRIMARY_BUTTON, TextField } from './AccountParts'

const MIN_PASSWORD = 8

/**
 * v3 giriş / kayıt (V3-07a): ortalanmış tek cam kart. Kurallar aynı: sunucu (IP başına günlük kayıt sınırı, doğrulama e-postası, hata kodları)
 * değişmedi; metinler errorMessage'tan. E-posta alanı parola yöneticileri için autocomplete="username".
 */
function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const target = (location.state as { from?: string } | null)?.from ?? '/'
  const isLogin = mode === 'login'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!isLogin && !acknowledged) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await (isLogin ? login(email, password) : register(email, password, PRIVACY_VERSION))
      navigate(target, { replace: true })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <CenteredCard title={isLogin ? 'Giriş yap' : 'Hesap oluştur'}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField label="E-posta" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label={isLogin ? 'Şifre' : `Şifre (en az ${MIN_PASSWORD} karakter)`} required minLength={isLogin ? undefined : MIN_PASSWORD}
          autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        {!isLogin && (
          // Bilgilendirme onayı (KVKK aydınlatma); açık rıza değildir. Bağlantı yeni sekmede açılır, form kaybolmaz.
          <label className="flex min-h-11 items-start gap-2 text-sm text-ink-2">
            <input type="checkbox" required checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1 size-4 shrink-0" />
            <span>
              <Link to="/privacy" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">Aydınlatma metnini</Link> okudum.
            </span>
          </label>
        )}
        <ErrorAlert error={error} />
        <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>{busy ? 'Bekleyin…' : isLogin ? 'Giriş yap' : 'Kayıt ol'}</button>
      </form>
      <p className="text-sm text-ink-2">
        {isLogin
          ? <>Hesabın yok mu? <Link to="/register" className="font-semibold text-accent underline-offset-2 hover:underline">Kayıt ol</Link></>
          : <>Zaten hesabın var mı? <Link to="/login" className="font-semibold text-accent underline-offset-2 hover:underline">Giriş yap</Link></>}
      </p>
    </CenteredCard>
  )
}

export const LoginPage = () => <AuthForm mode="login" />
export const RegisterPage = () => <AuthForm mode="register" />

/** E-posta doğrulama: bağlantıdaki token bir kez gönderilir (mevcut akış). */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { refreshMe } = useAuth()
  const verify = useMutation({ mutationFn: (value: string) => endpoints.verifyEmail(value), onSuccess: () => refreshMe() })
  const started = useRef(false)

  useEffect(() => {
    if (token && !started.current) {
      started.current = true
      verify.mutate(token)
    }
  }, [token, verify])

  return (
    <CenteredCard title="E-posta doğrulama">
      {!token && <p className="text-sm text-ink-2">Doğrulama bağlantısı eksik. E-postandaki bağlantıyı aç.</p>}
      {verify.isPending && <Skeleton className="h-6" />}
      {verify.isSuccess && <p className="text-sm">E-postan doğrulandı, günlük kredin yüklendi. <Link to="/" className="font-semibold text-accent underline-offset-2 hover:underline">Siteye dön</Link></p>}
      <ErrorAlert error={verify.error} />
    </CenteredCard>
  )
}
