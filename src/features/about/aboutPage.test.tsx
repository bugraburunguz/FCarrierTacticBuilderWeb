import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LEGAL_NOTE } from '../../design/brand/legal'
import { AboutPage } from './AboutPage'

describe('Hakkında (v3, PROD-PREP 7)', () => {
  it('bağımsızlık notu, beta, iletişim e-postası ve Gizlilik bağlantısı', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Hakkında' })).toBeInTheDocument()
    expect(screen.getByTestId('legal-note')).toHaveTextContent(LEGAL_NOTE)
    expect(screen.getByText(/Bağımsız bir hayran projesidir/)).toBeInTheDocument()
    expect(screen.getByText(/ücretsiz beta/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'bugraburunguz@gmail.com' })).toHaveAttribute('href', 'mailto:bugraburunguz@gmail.com')
    expect(screen.getByRole('link', { name: 'Gizlilik ve aydınlatma metni' })).toHaveAttribute('href', '/privacy')
  })
})
