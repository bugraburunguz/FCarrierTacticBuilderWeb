import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PickList, sortByFit, type PickRow } from './PickList'

const row = (key: string, ovr: number, fitPct?: number): PickRow => ({ key, name: `Oyuncu ${key}`, ovr, positions: ['ST'], fitPct, card: { name: `Oyuncu ${key}`, rating: ovr }, onPick: () => undefined })

describe('PickList (F3)', () => {
  it('sıra uyum %\'sine göredir; OVR yalnız eşitlikte ve bilinmeyen uyumda belirleyicidir', () => {
    const sorted = sortByFit([row('a', 90, 60), row('b', 70, 95), row('c', 99), row('d', 80, 95)])
    expect(sorted.map((r) => r.key)).toEqual(['d', 'b', 'a', 'c'])
  })

  it('V3-07c 0a: uyum yüzdesinin rengi rozetle aynı durumdan — "Seviyesinde" sarı (Sınırda) görünmez', () => {
    const rows: PickRow[] = [
      { ...row('a', 70, 70), fitState: 'good' },
      { ...row('b', 70, 50), fitState: 'neutral' },
      { ...row('c', 70, 30), fitState: 'ok' },
      { ...row('d', 70, 10), fitState: 'bad' },
    ]
    render(<PickList rows={rows} search="" onSearch={() => undefined} emptyText="boş" />)
    expect(screen.getByText('%70').className).toContain('text-good')
    expect(screen.getByText('%50').className).not.toMatch(/text-(warn|good|bad)/)
    expect(screen.getByText('%30').className).toContain('text-warn')
    expect(screen.getByText('%10').className).toContain('text-bad')
  })

  it('kaynak sekmeleri geçerli ARIA ile (tablist çocuksuz olamaz): düğmeler aria-pressed grubunda', () => {
    const onTab = vi.fn()
    render(<PickList rows={[]} search="" onSearch={() => undefined} tabs={[{ id: 'club', label: 'Kulübüm' }, { id: 'catalog', label: 'Katalog' }]} activeTab="club" onTab={onTab} emptyText="boş" />)

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Kart kaynağı' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Katalog' }))
    expect(onTab).toHaveBeenCalledWith('catalog')
  })
})
