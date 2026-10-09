import { describe, expect, it } from 'vitest'
import { pingExtension, pullAll, type Send } from './extensionBridge'

describe('extensionBridge', () => {
  it('ping sürüm ve sayıyı döner, yanıt yoksa hata fırlatır', async () => {
    const ok: Send = async () => ({ ok: true, version: '0.3.0', id: 'abc', count: 12 })
    expect(await pingExtension(ok)).toEqual({ version: '0.3.0', id: 'abc', count: 12 })
    await expect(pingExtension(async () => undefined)).rejects.toThrow()
  })

  it('pull parçaları birleştirir ve ilerlemeyi bildirir', async () => {
    const pages = [
      { ok: true, captures: [1, 2], next: 2, total: 3, done: false },
      { ok: true, captures: [3], next: 3, total: 3, done: true },
    ]
    const calls: number[] = []
    const send: Send = async (m) => {
      calls.push(Number(m.from))
      return pages[calls.length - 1]
    }
    const seen: [number, number][] = []
    expect(await pullAll(send, (a, b) => seen.push([a, b]))).toEqual([1, 2, 3])
    expect(calls).toEqual([0, 2])
    expect(seen).toEqual([[2, 3], [3, 3]])
  })

  it('ilerlemeyen uzantı sonsuz döngüye sokamaz', async () => {
    const stuck: Send = async () => ({ ok: true, captures: [], next: 0, total: 5, done: false })
    expect(await pullAll(stuck)).toEqual([])
  })
})
