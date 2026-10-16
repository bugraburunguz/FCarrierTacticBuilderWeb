import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppDialog } from './AppDialog'

/** V3-07b: Modal.tsx yerine v3 diyalog (Radix): aynı arayüz (title, hint, wide, onClose), opak yüzey, Esc ve Kapat, odak içeride. */
describe('AppDialog', () => {
  it('başlık ve ipucuyla erişilebilir diyalog; Kapat ve Esc onClose çağırır', () => {
    const onClose = vi.fn()
    render(<AppDialog title="Taktik kodu" hint="EA kodunu yapıştır" onClose={onClose}><input aria-label="Kod" /></AppDialog>)
    const dialog = screen.getByRole('dialog', { name: 'Taktik kodu' })
    expect(dialog).toHaveTextContent('EA kodunu yapıştır')
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('opak yüzey token\'ı (--sheet-bg; v2 temasında --surface yedeği) ve geniş/dar ölçü', () => {
    const { rerender } = render(<AppDialog title="Dar" onClose={() => undefined}>x</AppDialog>)
    expect(screen.getByRole('dialog').className).toContain('bg-[var(--sheet-bg,var(--surface))]')
    expect(screen.getByRole('dialog').className).toContain('border-[var(--glass-border,var(--line))]')
    expect(screen.getByRole('dialog').className).toContain('max-w-[420px]')
    rerender(<AppDialog title="Geniş" wide onClose={() => undefined}>x</AppDialog>)
    expect(screen.getByRole('dialog').className).toContain('max-w-[720px]')
  })
})
