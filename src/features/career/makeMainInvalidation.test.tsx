import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useMakeMainTactic } from './activeTactic'

vi.mock('../../api/endpoints', () => ({
  endpoints: { saveUserTactic: vi.fn(() => Promise.resolve({})), setMainTactic: vi.fn(() => Promise.resolve({})) },
}))

const stale = (client: QueryClient, key: unknown[]) => client.getQueryState(key)?.isInvalidated === true

/** FCA-35 W7: "Ana taktiğim yap" yalnız o kariyerin diziliş uyumunu tazeler; oyuncu/rol uyumu ve başka kariyerler dokunulmaz. */
describe('useMakeMainTactic tazeleme kapsamı', () => {
  it('slot-fit yalnız bu kariyerin lineup anahtarlarında', async () => {
    const client = new QueryClient()
    const keys = [['slot-fit', 'lineup', 7, 'x'], ['slot-fit', 'lineup', 8, 'x'], ['slot-fit', 'v3', 120, 'r', 'CM', ''], ['slot-fit', 'v3-batch', '1,2', 'r', 'CM', '']]
    keys.forEach((k) => client.setQueryData(k, { ok: true }))
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useMakeMainTactic(7), { wrapper })
    await act(() => result.current.mutateAsync({ slot: 1, name: 'A', tactic: { formation: '4-3-3', slots: {} } as never, lineup: {} }))
    expect(stale(client, keys[0])).toBe(true)
    expect(stale(client, keys[1])).toBe(false)
    expect(stale(client, keys[2])).toBe(false)
    expect(stale(client, keys[3])).toBe(false)
  })
})
