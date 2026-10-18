import { endpoints } from '../../../api/endpoints'

/** Kayda göre hareketler sorgusu (Hareketler sekmesi ve sekme sayısı aynı önbelleği kullanır). */
export const careerMovesQuery = (careerId: number) => ({ queryKey: ['career-moves', careerId], queryFn: () => endpoints.careerMoves(careerId) })
