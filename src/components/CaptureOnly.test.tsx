import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureOnly } from './CaptureOnly'

// V3-06a: yakalamaya bağlı UT sayfaları yalnız VITE_EXTENSION_CAPTURE kapalıyken nota döner (varsayılan açık).
const flags = vi.hoisted(() => ({ extension: true }))
vi.mock('../lib/features', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/features')>()), extensionCaptureEnabled: () => flags.extension }))

const NOTE = 'Kulüp ve SBC yakalama bu sürümde kapalı.'

beforeEach(() => {
  flags.extension = true
})

describe('yakalamaya bağlı sayfalar (doğrudan URL)', () => {
  it('uzantı yakalaması açık (varsayılan): sayfanın kendisi', () => {
    render(<CaptureOnly title="SBC çözücü"><p>sayfa</p></CaptureOnly>)
    expect(screen.getByText('sayfa')).toBeInTheDocument()
    expect(screen.queryByText(NOTE)).toBeNull()
  })

  it('uzantı yakalaması kapalı: sayfa yerine tek kısa not; EA engeli iddiası yok', () => {
    flags.extension = false
    render(<CaptureOnly title="SBC çözücü"><p>sayfa</p></CaptureOnly>)
    expect(screen.getByRole('heading', { level: 1, name: 'SBC çözücü' })).toBeInTheDocument()
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.queryByText('sayfa')).toBeNull()
    expect(document.body.textContent).not.toMatch(/engelliyor/)
  })
})
