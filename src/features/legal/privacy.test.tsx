import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import source from '../../../docs/legal/gizlilik-aydinlatma.md?raw'
import { parseLegalMarkdown } from './legalMarkdown'
import { PrivacyPage } from './PrivacyPage'
import { PRIVACY_DATE, PRIVACY_VERSION } from './privacyVersion'

describe('aydınlatma metni (PROD-PREP 3)', () => {
  it('kaynakta taslak yorumu yok; sürüm ve tarih yer tutucudan gelir', () => {
    expect(source).not.toContain('<!--')
    expect(source).not.toContain('[YAYIN TARİHİ]')
    expect(source).toContain('{{SURUM}}')
    expect(source).toContain('{{TARIH}}')
  })

  it('metin onayı "açık rıza" diye adlandırmaz', () => {
    expect(source.toLocaleLowerCase('tr')).not.toContain('açık rıza')
  })

  it('başlık, paragraf, liste ve tabloyu ayrıştırır', () => {
    const blocks = parseLegalMarkdown('# Başlık\n\n**Kalın** metin\nikinci satır\n\n## Alt\n\n- bir\n- iki\n\n| A | B |\n|---|---|\n| x | y |\n')
    expect(blocks.map((b) => b.kind)).toEqual(['h1', 'p', 'h2', 'ul', 'table'])
    expect(blocks[1]).toEqual({ kind: 'p', lines: ['**Kalın** metin', 'ikinci satır'] })
    expect(blocks[3]).toEqual({ kind: 'ul', items: ['bir', 'iki'] })
    expect(blocks[4]).toEqual({ kind: 'table', head: ['A', 'B'], rows: [['x', 'y']] })
  })

  it('sayfa metni sürüm sabitiyle gösterir; tablolar ve bölümler görünür', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: /Aydınlatma Metni/ })).toBeInTheDocument()
    expect(screen.getByText(`Sürüm ${PRIVACY_VERSION} · Son güncelleme: ${PRIVACY_DATE}`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '7. Verileri ne kadar süre saklıyoruz?' })).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'Railway Corporation' })).toBeInTheDocument()
    expect(screen.queryByText(/\{\{/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Çerez kullanılmaz.').length).toBeGreaterThan(0)
  })
})
