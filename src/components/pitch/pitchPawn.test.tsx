import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pitch, type PitchSlot } from './Pitch'

const filled: PitchSlot = {
  slotId: 'ST', position: 'ST', x: 50, y: 20, roleLabel: 'Advanced Forward · Attack',
  player: { name: 'Mohamadou Faal', rating: 63 }, fit: { pct: 74, state: 'good' },
}
const empty: PitchSlot = { slotId: 'GK', position: 'GK', x: 50, y: 92, roleLabel: 'Goalkeeper · Defend' }

/** KARIYER-UX FAZ 1: Cyber-Pitch sahası ve piyon işareti, Pitch'in genişlemesi (ayrı saha bileşeni yok). */
describe('Pitch · Cyber-Pitch ve piyon', () => {
  it('varsayılan değişmez: çim saha, kart işareti (UT)', () => {
    const { container } = render(<Pitch slots={[filled]} onPickPlayer={() => undefined} />)
    expect(container.querySelector('[data-field="grass"]')).not.toBeNull()
    expect(container.querySelector('[data-pitch-marker="pawn"]')).toBeNull()
  })

  it('cyber saha neon çizgi token\'larıyla çizilir', () => {
    const { container } = render(<Pitch slots={[filled]} onPickPlayer={() => undefined} field="cyber" />)
    expect(container.querySelector('[data-field="cyber"]')).not.toBeNull()
    const svg = container.querySelector('svg')!.outerHTML
    expect(svg).toContain('var(--cyber-pitch-1)')
    expect(svg).toContain('var(--cyber-line)')
    expect(svg).toContain('var(--cyber-line-2)')
    expect(svg).not.toContain('--pitch-a')
  })

  it('piyon: OVR dairede, soyad opak hapta (tam ad title), uyum erişilebilir adda; kart çizilmez', () => {
    const { container } = render(<Pitch slots={[filled]} onPickPlayer={() => undefined} field="cyber" marker="pawn" readOnly />)
    const pawn = container.querySelector('[data-pitch-marker="pawn"]')!
    expect(pawn.textContent).toContain('63')
    const name = screen.getByText('Faal')
    expect(name).toHaveAttribute('title', 'Mohamadou Faal')
    expect(name.className).toContain('bg-[var(--pawn-label-bg)]')
    expect(screen.getByLabelText(/ST — Mohamadou Faal, 63, uyum %74 · Rol için uygun/)).toBeInTheDocument()
    expect(container.querySelector('[data-card-design]')).toBeNull()
    expect(screen.queryByTitle('Advanced Forward · Attack')).toBeNull()
  })

  /**
   * Renk yüzdeden değil sunucunun rol etiketinden gelir (fitDisplay: GOOD / AT_LEVEL / WEAK / WRONG_ROLE; yüzde levelFit). Yüksek yüzde kırmızı
   * olabilir: kural piyonun title ve erişilebilir adında yazılı, kullanıcı çelişki sanmasın (FAZ 1 düzeltme 3).
   */
  it('uyum rengi kuralı title ve erişilebilir adda yazılı (yüksek yüzde + eksik rol)', () => {
    render(<Pitch slots={[{ ...filled, fit: { pct: 82, state: 'bad' } }]} onPickPlayer={() => undefined} marker="pawn" readOnly />)
    const label = 'ST — Mohamadou Faal, 63, uyum %82 · Rol için eksik (renk rol etiketinden, yüzde seviye uyumu)'
    expect(screen.getByLabelText(new RegExp(label.replace(/[()]/g, '\\$&')))).toBeInTheDocument()
    expect(screen.getByTitle(/uyum %82 · Rol için eksik/)).toBeInTheDocument()
  })

  it('rol etiketi yalnız showRole ile; boş piyon salt okunurda mevki yazar', () => {
    render(<Pitch slots={[filled, empty]} onPickPlayer={() => undefined} marker="pawn" showRole readOnly />)
    expect(screen.getByTitle('Advanced Forward · Attack')).toBeInTheDocument()
    expect(screen.getAllByText('GK').length).toBeGreaterThanOrEqual(1)
  })

  it('salt okunur piyona tıklama onPickPawn çağırır, oyuncu seçimi açmaz', async () => {
    const onPickPlayer = vi.fn()
    const onPickPawn = vi.fn()
    render(<Pitch slots={[filled]} onPickPlayer={onPickPlayer} onPickPawn={onPickPawn} marker="pawn" readOnly />)
    await userEvent.click(screen.getByRole('button', { name: /Mohamadou Faal/ }))
    expect(onPickPawn).toHaveBeenCalledWith('ST')
    expect(onPickPlayer).not.toHaveBeenCalled()
  })

  it('düzenlenebilir piyonda klavye taşıma çalışır (Lab piyon modu)', async () => {
    const onSwap = vi.fn()
    render(<Pitch slots={[filled, { ...empty, player: { name: 'Joe Keeper', rating: 66 } }]} onPickPlayer={() => undefined} onSwap={onSwap} marker="pawn" />)
    const st = screen.getByRole('button', { name: /ST — Mohamadou Faal/ })
    st.focus()
    await userEvent.keyboard('m')
    screen.getByRole('button', { name: /GK — Joe Keeper/ }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onSwap).toHaveBeenCalledWith('ST', 'GK')
  })
})
