/**
 * Test yardımcısı (KARIYER-UX FAZ 4b): rol uyumu artık tek /fit/lineup isteğiyle (dizilenler kilitli) geliyor. Testlerin mevcut /fit/role
 * fikstürünü bozmadan aynı sayıları üretmek için, kilitli her oyuncu için fitRole sahtesini çağırıp /fit/lineup yanıtına çevirir.
 */
type FitRole = (body: { playerId: number; roleId?: string; position?: string; engineVersion?: string; tags?: string[] }) => Promise<{ roleFit: { roleId?: string; roleName?: string } & Record<string, unknown> }>

export function lineupFromFitRole(fitRole: FitRole, positionOf: (slotId: string) => string = () => 'CM') {
  return async (_careerId: number, _tactic: unknown, locked?: Record<string, number>) => ({
    slots: await Promise.all(Object.entries(locked ?? {}).map(async ([slotId, playerId]) => {
      const { roleFit } = await fitRole({ playerId, position: positionOf(slotId), engineVersion: 'v3' })
      return { slotId, position: positionOf(slotId), roleId: roleFit.roleId ?? 'r', roleName: roleFit.roleName ?? 'Rol', tags: [], playerId, roleFit }
    })),
  })
}
