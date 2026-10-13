import { API_ORIGIN } from '../api/client'

/** Göreli adresleri (proxy) API kökü ile birleştirir; GitHub Pages gibi ayrı API alanında da çalışır. */
export function assetUrl(url?: string): string | undefined {
  return url && url.startsWith('/') ? API_ORIGIN + url : url
}
