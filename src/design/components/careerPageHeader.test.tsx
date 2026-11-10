/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CareerPageHeader } from './CareerPageHeader'

/* FCA-3 Parça 3: Stitch sayfa başlığı — konum çizgisi (Kariyer › Sayfa), büyük harf Barlow başlık, kısa alt başlık, sağda eylemler. */
describe('CareerPageHeader', () => {
  it('konum çizgisi: Kariyer bağlantısı Masa\'ya, son öğe geçerli sayfa', () => {
    render(<MemoryRouter><CareerPageHeader crumb="Kadro" title="Kadro" subtitle="27 oyuncu kayıtlı" actions={<button type="button">Eylem</button>} /></MemoryRouter>)
    const trail = screen.getByRole('navigation', { name: 'Konum' })
    expect(within(trail).getByRole('link', { name: 'Kariyer' })).toHaveAttribute('href', '/career/dashboard')
    expect(within(trail).getByText('Kadro')).toHaveAttribute('aria-current', 'page')
    const h1 = screen.getByRole('heading', { level: 1, name: 'Kadro' })
    expect(h1).toHaveClass('page-title')
    expect(screen.getByText('27 oyuncu kayıtlı')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eylem' })).toBeInTheDocument()
  })

  it('kariyer yüzeyinde başlık büyük harf (katmansız kural, glass.css)', () => {
    const glass = readFileSync('src/design/glass.css', 'utf8')
    expect(glass).toMatch(/:root\[data-surface="career"\] \.page-title \{[^}]*text-transform: uppercase/)
  })
})
