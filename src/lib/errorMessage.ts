import { ApiError } from '../api/client'

const DEFAULT_MESSAGE = 'Beklenmeyen bir hata oluştu.'
const FETCH_FAILURE = /failed to fetch|networkerror|load failed|network request failed/i

/** Her hata türü için kullanıcıya gösterilecek metin (WEB-BUG-05): API, ağ, uzantı, worker, JSON/restore hataları. */
export function errorMessage(error: unknown): { message: string; network: boolean } {
  if (error instanceof ApiError) {
    return { message: error.message, network: error.code === 'client.network' }
  }
  if (error instanceof TypeError && FETCH_FAILURE.test(error.message)) {
    return { message: 'Sunucuya ulaşılamadı.', network: true }
  }
  if (error instanceof SyntaxError) {
    return { message: 'Dosya okunamadı: geçerli bir JSON değil.', network: false }
  }
  if (error instanceof Error && error.message.trim() !== '') {
    return { message: error.message, network: false }
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return { message: error, network: false }
  }
  return { message: DEFAULT_MESSAGE, network: false }
}
