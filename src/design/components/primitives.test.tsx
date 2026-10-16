import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, ChemBar, Chip, Segmented, SidePanel, StatTile } from './primitives'

describe('v3 bileşenleri', () => {
  it('devre dışı Button nedenini yanında gösterir ve opaklıkla silikleşmez (Q12)', () => {
    render(<Button disabled disabledReason="Önce kodu yapıştır">Yükle</Button>)
    const button = screen.getByRole('button', { name: 'Yükle' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Önce kodu yapıştır')
    expect(button.className).not.toMatch(/opacity-/)
    expect(screen.getByText('Önce kodu yapıştır')).toBeInTheDocument()
  })

  it('Chip etkileşimliyse ≥32px (mobilde 44px) hedef sınıfı, yazı text-xs (12px) taşır (Q13)', () => {
    render(<Chip onClick={() => undefined}>Kimya</Chip>)
    const chip = screen.getByRole('button', { name: 'Kimya' })
    expect(chip.className).toContain('min-h-8')
    expect(chip.className).toContain('max-sm:min-h-11')
    expect(chip.className).toContain('text-xs')
  })

  it('StatTile boş değeri "–" gösterir', () => {
    render(<StatTile label="Rating" />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('ChemBar 33 bölme ve X/33 yazısı üretir', () => {
    render(<ChemBar value={21} />)
    expect(screen.getByRole('progressbar', { name: 'Toplam kimya' })).toHaveAttribute('aria-valuenow', '21')
    expect(screen.getByText('21/33')).toBeInTheDocument()
  })

  it('Segmented ok tuşlarıyla seçimi değiştirir', async () => {
    const onChange = vi.fn()
    render(<Segmented label="Build-Up" value="Balanced" options={[{ id: 'Short', label: 'Short' }, { id: 'Balanced', label: 'Balanced' }, { id: 'Counter', label: 'Counter' }]} onChange={onChange} />)
    screen.getByRole('radio', { name: 'Balanced' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('Counter')
  })

  it('SidePanel Esc ile kapanır ve odağı panele alır', async () => {
    const onClose = vi.fn()
    render(<SidePanel sheet title="Kadro bilgisi" onClose={onClose}><p>içerik</p></SidePanel>)
    const panel = screen.getByLabelText('Kadro bilgisi')
    expect(panel).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
