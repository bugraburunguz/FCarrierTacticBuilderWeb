import { endpoints } from '../../api/endpoints'

/** Altyapı sorgusu (Altyapı sayfası ve Masa "Bu dönemin 3 işi" ortak): uç analiz kovasında (60/dk), sonuç 5 dk taze; kariyer kapsamında tazelenir. */
export const academyQuery = (careerId: number) => ({ queryKey: ['academy', careerId], queryFn: () => endpoints.academy(careerId), staleTime: 300_000 })
