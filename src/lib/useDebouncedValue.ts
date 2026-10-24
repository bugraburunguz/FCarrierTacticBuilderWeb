import { useEffect, useState } from 'react'

/**
 * Değeri `ms` boyunca değişmezse geçirir; ilk değer bekletilmez (sayfa açılışı gecikmez). GUV-2: Lab'da art arda atamalar tek
 * /fit/lineup isteğine iner (analiz kovası 60/dk).
 */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}
