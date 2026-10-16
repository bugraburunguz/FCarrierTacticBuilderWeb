import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { errorMessage } from './errorMessage'

describe('errorMessage (WEB-BUG-05)', () => {
  it('ApiError mesajını ve ağ durumunu korur', () => {
    expect(errorMessage(new ApiError('Kredi yetersiz', 'fc.exception.0004', 402))).toEqual({ message: 'Kredi yetersiz', network: false })
    expect(errorMessage(new ApiError('Ağ hatası', 'client.network', 0)).network).toBe(true)
  })

  it('fetch hatası Türkçe ağ metnine dönüşür', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toEqual({ message: 'Sunucuya ulaşılamadı.', network: true })
  })

  it('düz Error (uzantı, worker) kendi mesajını gösterir', () => {
    expect(errorMessage(new Error('Bu özellik Chrome ve kurulu FC Assist uzantısı gerektirir.')).message).toContain('uzantısı gerektirir')
  })

  it('JSON hatası, string ve bilinmeyen değer', () => {
    expect(errorMessage(new SyntaxError('Unexpected token')).message).toContain('JSON')
    expect(errorMessage('düz metin').message).toBe('düz metin')
    expect(errorMessage({}).message).toBe('Beklenmeyen bir hata oluştu.')
  })
})
