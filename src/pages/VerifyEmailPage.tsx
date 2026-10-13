import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Card, ErrorBox, Spinner } from '../components/ui'

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
    <div className="mx-auto max-w-md">
      <Card title="E-posta doğrulama">
        {!token && <p className="text-sm text-muted">Doğrulama bağlantısı eksik. E-postandaki bağlantıyı aç.</p>}
        {verify.isPending && <Spinner />}
        {verify.isSuccess && <p className="text-sm">E-postan doğrulandı, günlük kredin yüklendi. <Link to="/" className="underline">Siteye dön</Link></p>}
        <ErrorBox error={verify.error} />
      </Card>
    </div>
  )
}
