import { useEffect, useState } from 'react'

/** CSS medya sorgusunun anlık sonucu (matchMedia yoksa — test, SSR — false). Düzenin DOM sırası değişen yerler için; salt görsel farkta CSS kullan. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined
    }
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}
