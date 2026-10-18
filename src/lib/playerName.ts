/** Sunucu adı çözülemeyen oyuncuyu "Oyuncu #<EA kimliği>" olarak saklar (FC27 dışa aktarımında isim tablosu yok). Arayüzde bu görünür. */
export const UNKNOWN_NAME = 'Adı bilinmiyor'

const PLACEHOLDER = /^Oyuncu #\d+$/
const NAME_KEYS = new Set(['name', 'playerName'])

export const isPlaceholderName = (name: string | undefined) => Boolean(name && (PLACEHOLDER.test(name.trim()) || name === UNKNOWN_NAME))

/**
 * API yanıtında oyuncu adı alanlarını (name, playerName) gezer; tam "Oyuncu #123" biçimini "Adı bilinmiyor" yapar. Yalnız bu iki anahtar ve
 * tam eşleşme: kulüp adı, not ya da "Oyuncu #12 Junior" gibi gerçek adlar değişmez. Tek yerde (api/client) uygulanır.
 */
export function cleanPlayerNames<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => cleanPlayerNames(v)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = NAME_KEYS.has(key) && typeof v === 'string' && PLACEHOLDER.test(v.trim()) ? UNKNOWN_NAME : cleanPlayerNames(v)
    }
    return out as T
  }
  return value
}
