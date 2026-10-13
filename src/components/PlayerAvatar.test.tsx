import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlayerAvatar } from './PlayerAvatar'

vi.mock('../api/client', () => ({ API_ORIGIN: 'https://api.example.com' }))

describe('PlayerAvatar (WEB-BUG-12)', () => {
  it('göreli yüz adresini API kökü ile birleştirir (ayrı origin: GitHub Pages)', () => {
    const { container } = render(<PlayerAvatar name="Kylian Mbappé" faceUrl="/api/v1/img/face/231747" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://api.example.com/api/v1/img/face/231747')
  })

  it('mutlak adresi olduğu gibi bırakır', () => {
    const { container } = render(<PlayerAvatar name="Kylian Mbappé" faceUrl="https://cdn.example.com/f.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/f.png')
  })
})
