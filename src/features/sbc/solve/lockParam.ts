import type { UtCard } from '../../../lib/utCard'

/** Çözüm sayfasında Özelleştir'e kilitli gelecek kulüp kartlarının anahtarları (V3-07c; kulüpten "Şu SBC'de kullan"). */
export const LOCK_PARAM = 'kilit'

export function solveHref(setId: number, challengeId: number, keys: string[]): string {
  const base = `/ut/sbc/${setId}/${challengeId}`
  return keys.length === 0 ? base : `${base}?${new URLSearchParams({ [LOCK_PARAM]: keys.join(',') }).toString()}`
}

export function parseLockParam(params: URLSearchParams): string[] {
  return [...new Set((params.get(LOCK_PARAM) ?? '').split(',').map((k) => k.trim()).filter(Boolean))]
}

export interface LockIssue { key: string; name?: string; reason: string }

/**
 * Kilitlenmek istenen ama uygulanamayan kartlar ve sebebi: aktif kadroda (çözücü havuzu aktif kadroyu dışarıda bırakır); kulüpte yok; ya da plan
 * hazırken çözüme girmedi. `activeSquad`: aktif kadrodaki kartların anahtarı → adı.
 */
export function lockIssues(keys: string[], club: Pick<UtCard, 'key' | 'name'>[], picks: { cardKey: string }[] | undefined, activeSquad: Map<string, string> = new Map()): LockIssue[] {
  const byKey = new Map(club.map((c) => [c.key, c]))
  const picked = new Set((picks ?? []).map((p) => p.cardKey))
  return keys.flatMap((key): LockIssue[] => {
    const card = byKey.get(key)
    if (!card && activeSquad.has(key)) {
      return [{ key, name: activeSquad.get(key), reason: 'Aktif kadronda: çözücü aktif kadroyu kullanmaz' }]
    }
    if (!card) {
      return [{ key, reason: 'Kulübünde bulunamadı' }]
    }
    return picks && !picked.has(key) ? [{ key, name: card.name, reason: 'Çözüme girmedi: mevki ya da şartlar uymuyor' }] : []
  })
}
