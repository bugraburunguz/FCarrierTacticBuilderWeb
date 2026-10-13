import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { endpoints } from '../api/endpoints'
import type { Me } from '../api/types'
import { VerifyEmailBanner } from './VerifyEmailBanner'

const state = vi.hoisted(() => ({ me: undefined as unknown }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ me: state.me }) }))
vi.mock('../api/endpoints', () => ({ endpoints: { resendVerification: vi.fn(() => Promise.resolve()) } }))

const me = (overrides: Partial<Me>): Me => ({ id: 1, email: 'a@b.com', subscriptionType: 'FREE', dailyCreditLimit: 20, showAds: true, ...overrides })
const renderBanner = () => render(<QueryClientProvider client={new QueryClient()}><VerifyEmailBanner /></QueryClientProvider>)

describe('VerifyEmailBanner', () => {
  it('doğrulama gerekmiyorsa ya da doğrulanmışsa görünmez', () => {
    state.me = me({ emailVerificationRequired: false, emailVerified: true })
    const { container } = renderBanner()
    expect(container).toBeEmptyDOMElement()
  })

  it('doğrulanmamış hesapta uyarı ve yeniden gönder butonu çıkar', async () => {
    state.me = me({ emailVerificationRequired: true, emailVerified: false })
    renderBanner()
    expect(screen.getByRole('status')).toHaveTextContent('a@b.com')
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden gönder' }))
    await waitFor(() => expect(endpoints.resendVerification).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'Gönderildi' })).toBeDisabled()
  })
})
