import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { parseMoney } from '../lib/parseMoney'
import { MoneyInput } from './MoneyInput'

describe('parseMoney (WEB-BUG-09)', () => {
  it.each([
    ['2', 1_000_000, 2_000_000],
    ['2,5', 1_000_000, 2_500_000],
    ['2.5', 1_000_000, 2_500_000],
    ['1.500.000', 1, 1_500_000],
    ['1 500', 1, 1_500],
    ['1.500,75', 1, 1501],
    ['15m', 1, 15_000_000],
    ['15 M', 1, 15_000_000],
    ['2,5 milyon', 1, 2_500_000],
    ['750k', 1, 750_000],
    ['750 bin', 1, 750_000],
    ['0', 1_000, 0],
  ])('%s (çarpan %i) → %i', (text, factor, expected) => {
    expect(parseMoney(text, factor)).toBe(expected)
  })

  it.each(['', '  ', 'abc', '0x10', '1e3', '-5', '1,2,3', '1..5', '15mm', 'm', '∞', 'NaN'])('"%s" reddedilir', (text) => {
    expect(parseMoney(text, 1)).toBeUndefined()
  })
})

describe('MoneyInput', () => {
  it('birim değişiminde onCommit çağrılmaz, metin alanından çıkınca çağrılır', async () => {
    const user = userEvent.setup()
    const commit = vi.fn()
    render(<MoneyInput value={5_000_000} onChange={() => undefined} onCommit={commit} />)

    await user.selectOptions(screen.getByLabelText('Birim'), 'K')
    expect(commit).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText('Tutar'))
    await user.tab()
    expect(commit).toHaveBeenCalledWith(5_000)
  })

  it('REVIEW O1: geçersiz tutarla alandan çıkınca kayıtlı değer silinmez (onCommit çağrılmaz)', async () => {
    const user = userEvent.setup()
    const commit = vi.fn()
    render(<MoneyInput value={5_000_000} onChange={() => undefined} onCommit={commit} />)
    const input = screen.getByLabelText('Tutar')
    await user.clear(input)
    await user.type(input, '1,2,3')
    await user.tab()
    expect(screen.getByText('Geçersiz tutar')).toBeInTheDocument()
    expect(commit).not.toHaveBeenCalled()
  })

  it('odakta değilken prop değişince metni ve birimi yeniden eşler', () => {
    const { rerender } = render(<MoneyInput value={5_000_000} onChange={() => undefined} />)
    expect(screen.getByLabelText('Tutar')).toHaveValue('5')

    rerender(<MoneyInput value={750_000} onChange={() => undefined} />)
    expect(screen.getByLabelText('Tutar')).toHaveValue('750')
    expect(screen.getByLabelText('Birim')).toHaveValue('K')
  })

  it('değer yokken alan boş, placeholder "0" değil (ENG-02: sıfır yazılmaz); boş bırakılınca tutar yok döner', async () => {
    const user = userEvent.setup()
    const commit = vi.fn()
    render(<MoneyInput value={undefined} onChange={() => undefined} onCommit={commit} ariaLabel="Pazarlık tavanı" />)
    const input = screen.getByLabelText('Pazarlık tavanı')
    expect(input).toHaveValue('')
    expect(input.getAttribute('placeholder')).not.toMatch(/^0$/)
    expect(input.getAttribute('placeholder')).toBe('Örn. 2,5')
    await user.click(input)
    await user.tab()
    expect(commit).toHaveBeenCalledWith(undefined)
  })

  it('yazarken gelen prop güncellemesi girilen metni ezmez', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MoneyInput value={5_000_000} onChange={() => undefined} />)
    const input = screen.getByLabelText('Tutar')
    await user.click(input)
    await user.clear(input)
    await user.type(input, '2,')

    rerender(<MoneyInput value={2_000_000} onChange={() => undefined} />)
    expect(input).toHaveValue('2,')
  })
})
