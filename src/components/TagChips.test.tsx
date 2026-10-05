import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BehaviorTag } from '../api/types'
import { TagChips } from './TagChips'

const tag = (id: string, label: string, conflicts: string[]): BehaviorTag => ({
  id,
  position: 'W',
  label,
  weaponAttrs: ['Crossing'],
  expectedMin: 68,
  modifier: false,
  conflicts,
})

const TAGS = [tag('cross', 'Orta açsın', ['cut']), tag('cut', 'İçe kessin', ['cross']), tag('dribble', 'Dribbling', [])]

describe('TagChips', () => {
  it('disables tags that conflict with a selected one and keeps the selected one clickable', () => {
    render(<TagChips tags={TAGS} selected={['cross']} onChange={() => undefined} />)

    expect(screen.getByRole('button', { name: 'İçe kessin' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Orta açsın' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Dribbling' })).toBeEnabled()
  })

  it('toggles tags through onChange', async () => {
    const onChange = vi.fn()
    render(<TagChips tags={TAGS} selected={['cross']} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dribbling' }))
    expect(onChange).toHaveBeenLastCalledWith(['cross', 'dribble'])

    await userEvent.click(screen.getByRole('button', { name: 'Orta açsın' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('exposes the pressed state for assistive tech', () => {
    render(<TagChips tags={TAGS} selected={['dribble']} onChange={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Dribbling' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Orta açsın' })).toHaveAttribute('aria-pressed', 'false')
  })
})
