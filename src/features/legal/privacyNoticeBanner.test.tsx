import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '../../api/endpoints'
import { PrivacyNoticeBanner } from './PrivacyNoticeBanner'
import { PRIVACY_VERSION } from './privacyVersion'

const refreshMe = vi.fn()
let me: object | undefined
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ authenticated: Boolean(me), me, refreshMe }) }))
vi.mock('../../api/endpoints', () => ({ endpoints: { acknowledgePrivacy: vi.fn() } }))

function renderBanner() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter><PrivacyNoticeBanner /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  refreshMe.mockReset().mockResolvedValue(undefined)
  vi.mocked(endpoints.acknowledgePrivacy).mockReset().mockResolvedValue(undefined as never)
})

describe('aydınlatma bilgilendirme bandı (PROD-PREP 3)', () => {
  it('onayı olmayan mevcut kullanıcıya bir kez gösterilir; "Okudum" sürümü gönderir', async () => {
    me = { id: 1, email: 'a@example.test' }
    renderBanner()
    const banner = screen.getByRole('region', { name: 'Aydınlatma metni' })
    expect(banner).toHaveTextContent(/Aydınlatma metni/)
    expect(screen.getByRole('link', { name: 'Metni oku' })).toHaveAttribute('href', '/privacy')
    fireEvent.click(screen.getByRole('button', { name: 'Okudum' }))
    await waitFor(() => expect(endpoints.acknowledgePrivacy).toHaveBeenCalledWith(PRIVACY_VERSION))
    await waitFor(() => expect(refreshMe).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Aydınlatma metni' })).toBeNull()
  })

  it('eski sürümü onaylayana gösterilir; güncel sürümde ve oturumsuzken gösterilmez', () => {
    me = { id: 1, email: 'a@example.test', privacyAckVersion: PRIVACY_VERSION - 1 }
    const old = renderBanner()
    expect(screen.getByRole('region', { name: 'Aydınlatma metni' })).toBeInTheDocument()
    old.unmount()
    me = { id: 1, email: 'a@example.test', privacyAckVersion: PRIVACY_VERSION }
    const current = renderBanner()
    expect(screen.queryByRole('region', { name: 'Aydınlatma metni' })).toBeNull()
    current.unmount()
    me = undefined
    renderBanner()
    expect(screen.queryByRole('region', { name: 'Aydınlatma metni' })).toBeNull()
  })
})
