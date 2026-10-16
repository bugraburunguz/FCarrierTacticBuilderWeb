import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'

/** Ücretsiz beta etiketi (PROD-PREP 2): "PREMIUM'a geç" yönlendirmeleri yerine. */
export const BETA_TEXT = 'Beta: tüm özellikler ücretsiz'

/** Sunucunun uygulama ayarları (GET /config/app; tek kaynak FCAREER_FREE_BETA). Alınamazsa beta kapalı sayılır. */
export function useAppConfig() {
  const config = useQuery({ queryKey: ['app-config'], queryFn: endpoints.appConfig, staleTime: Infinity, retry: false })
  return { freeBeta: config.data?.freeBeta ?? false, dailyCredits: config.data?.dailyCredits }
}
