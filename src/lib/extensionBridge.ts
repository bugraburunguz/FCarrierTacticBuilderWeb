/** Site ↔ Chrome extension köprüsü (EXT-01): `externally_connectable` ile mesajlaşma; dosya indirme/yükleme gerekmez. */

export type Send = (message: Record<string, unknown>) => Promise<Record<string, any> | undefined>

export interface ExtensionInfo {
  version: string
  id: string
  count: number
}

const EXT_ID_KEY = 'fc.extId'

export function savedExtensionId(): string {
  try {
    return localStorage.getItem(EXT_ID_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveExtensionId(id: string) {
  try {
    localStorage.setItem(EXT_ID_KEY, id.trim())
  } catch {
    /* depolama yoksa her seferinde yeniden girilir */
  }
}

/** Tarayıcıdaki `chrome.runtime.sendMessage` ile uzantıya bağlanan gönderici; uzantı yoksa ya da Chrome değilse undefined. */
export function chromeSender(extensionId: string): Send | undefined {
  const runtime = (globalThis as { chrome?: { runtime?: { sendMessage?: (...args: any[]) => void; lastError?: unknown } } }).chrome?.runtime
  if (!extensionId || !runtime?.sendMessage) {
    return undefined
  }
  return (message) =>
    new Promise((resolve, reject) => {
      try {
        runtime.sendMessage!(extensionId, message, (response: Record<string, any> | undefined) => {
          if (runtime.lastError) {
            reject(new Error('Uzantıya ulaşılamadı. Kimliği ve uzantının yüklü olduğunu kontrol et.'))
          } else {
            resolve(response)
          }
        })
      } catch {
        reject(new Error('Uzantıya ulaşılamadı.'))
      }
    })
}

export async function pingExtension(send: Send): Promise<ExtensionInfo> {
  const response = await send({ type: 'FC_PING' })
  if (!response?.ok) {
    throw new Error('Uzantı yanıt vermedi.')
  }
  return { version: String(response.version), id: String(response.id), count: Number(response.count) }
}

/** Tamponu parça parça çeker; `onProgress(çekilen, toplam)` ilerleme için. Kaçak döngüye karşı üst sınır vardır. */
export async function pullAll(send: Send, onProgress?: (pulled: number, total: number) => void): Promise<unknown[]> {
  const captures: unknown[] = []
  let from = 0
  for (let round = 0; round < 200; round++) {
    const response = await send({ type: 'FC_PULL', from })
    if (!response?.ok) {
      throw new Error('Uzantıdan veri alınamadı.')
    }
    captures.push(...(response.captures as unknown[]))
    onProgress?.(captures.length, Number(response.total))
    if (response.done || Number(response.next) <= from) {
      return captures
    }
    from = Number(response.next)
  }
  throw new Error('Uzantı beklenenden çok parça döndürdü.')
}
