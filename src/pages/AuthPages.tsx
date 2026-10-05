import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, ErrorBox, Field, Input } from '../components/ui'

const MIN_PASSWORD = 8

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const target = (location.state as { from?: string } | null)?.from ?? '/'
  const isLogin = mode === 'login'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await (isLogin ? login : register)(email, password)
      navigate(target, { replace: true })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card title={isLogin ? 'Giriş yap' : 'Hesap oluştur'}>
        <form onSubmit={submit} className="space-y-3">
          <Field label="E-posta">
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={`Şifre${isLogin ? '' : ` (en az ${MIN_PASSWORD} karakter)`}`}>
            <Input
              type="password"
              required
              minLength={isLogin ? undefined : MIN_PASSWORD}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Bekleyin…' : isLogin ? 'Giriş yap' : 'Kayıt ol'}
          </Button>
        </form>
        <p className="mt-3 text-sm text-slate-500">
          {isLogin ? (
            <>
              Hesabın yok mu? <Link to="/register" className="text-emerald-700 hover:underline">Kayıt ol</Link>
            </>
          ) : (
            <>
              Zaten hesabın var mı? <Link to="/login" className="text-emerald-700 hover:underline">Giriş yap</Link>
            </>
          )}
        </p>
      </Card>
    </div>
  )
}

export const LoginPage = () => <AuthForm mode="login" />
export const RegisterPage = () => <AuthForm mode="register" />
