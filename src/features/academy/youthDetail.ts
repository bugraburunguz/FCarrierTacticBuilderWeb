import { endpoints } from '../../api/endpoints'
import type { YouthDetail } from '../../api/types'

/** 404 (kapsam dışı oyuncu) kalıcıdır: yeniden denenmez. */
export const youthDetailQuery = (careerId: number, playerId: number) => ({
  queryKey: ['youth-detail', careerId, playerId],
  queryFn: () => endpoints.youthDetail(careerId, playerId),
  retry: (count: number, error: unknown) => (error as { status?: number }).status !== 404 && count < 2,
})

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)

/** "Takımdaki yeri" cümlesi: yedeği ve ilk 11'i kaçıncı sezonda geçer (tahmin; 3 sezona kadar). */
export function teamText(team: YouthDetail['team']): string {
  const backup = team.backupName ? `yedeği (${team.backupName})` : undefined
  const starter = team.starterName ? `ilk 11'i (${team.starterName})` : undefined
  if (!backup && !starter) {
    return `${team.position} slotunda boş yer var; ilk sezonda yer bulur`
  }
  if (!backup) {
    return team.passStarterSeason ? `Bu mevkide yedek yok; ${starter} ${team.passStarterSeason}. sezonda geçer` : `Bu mevkide yedek yok; ${starter} 3 sezonda geçemez`
  }
  if (team.passBackupSeason && starter && team.passStarterSeason) {
    return `${capitalize(backup)} ${team.passBackupSeason}. sezonda, ${starter} ${team.passStarterSeason}. sezonda geçer`
  }
  if (team.passBackupSeason) {
    return `${capitalize(backup)} ${team.passBackupSeason}. sezonda geçer${starter ? `; ${starter} 3 sezonda geçemez` : ''}`
  }
  return `3 sezonda ${backup} geçemez`
}
