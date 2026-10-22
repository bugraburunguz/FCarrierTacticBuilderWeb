import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Panel, SourceTag } from './primitives'

/** KARIYER-UX FAZ 1 (D-28): veri katmanı her panelde görünür; renk tek başına anlam taşımaz (metin + ikon). */
describe('SourceTag ve Panel kaynak/kenar', () => {
  it.each([
    [{ kind: 'record', at: '2026-10-18' } as const, 'Kayıt verisi · 18 Eki'],
    [{ kind: 'decision' } as const, 'Kararın'],
    [{ kind: 'decision', label: 'Ana taktik' } as const, 'Ana taktik'],
    [{ kind: 'draft' } as const, 'Taslak · kaydedilmedi'],
    [{ kind: 'draft', savedSlot: 2 } as const, 'Taslak · Slot 2'],
    [{ kind: 'auto' } as const, 'Otomatik öneri · ana taktik değil'],
  ])('%o → %s', (source, text) => {
    render(<SourceTag source={source} />)
    const tag = screen.getByText(text)
    expect(tag.closest('[data-source]')).toHaveAttribute('data-source', source.kind)
    expect(tag.closest('[data-source]')!.querySelector('svg')).not.toBeNull()
  })

  it('Panel başlık satırında kaynağı ve kenar varyantını taşır; varsayılan değişmez', () => {
    const { container, rerender } = render(<Panel title="Saha">içerik</Panel>)
    expect(container.querySelector('section')).toHaveAttribute('data-edge', 'default')
    expect(container.querySelector('[data-source]')).toBeNull()

    rerender(<Panel title="Saha" edge="draft" source={{ kind: 'draft' }}>içerik</Panel>)
    expect(container.querySelector('section')).toHaveAttribute('data-edge', 'draft')
    expect(container.querySelector('section')!.className).toContain('panel-edge-draft')
    expect(screen.getByText('Taslak · kaydedilmedi')).toBeInTheDocument()

    rerender(<Panel title="Saha" edge="glow" source={{ kind: 'auto' }}>içerik</Panel>)
    expect(container.querySelector('section')!.className).toContain('panel-edge-glow')
  })
})
