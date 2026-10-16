import { useEffect, useRef, useState, type ReactNode } from 'react'

const ROOT_MARGIN = '1200px 0px'

/**
 * Pencereleme parçası (yeni paket yok): görünüm alanının ±1200 px dışındaki parça DOM'dan kalkar, yerine ölçülmüş yükseklikte yer tutucu kalır;
 * yaklaşınca içerik geri basılır. Uzun listede (500+ kart) DOM sabit kalır. `IntersectionObserver` yoksa her zaman basar.
 * kind="table": `<tbody>` parçası (yer tutucu `<tr><td colSpan>`).
 */
export function VirtualChunk({ children, estimate, kind = 'block', colSpan = 1, className }: { children: ReactNode; estimate: number; kind?: 'block' | 'table'; colSpan?: number; className?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const height = useRef(estimate)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (!entry) {
        return
      }
      if (!entry.isIntersecting && ref.current) {
        height.current = ref.current.getBoundingClientRect().height || height.current
      }
      setVisible(entry.isIntersecting)
    }, { rootMargin: ROOT_MARGIN })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (kind === 'table') {
    return (
      <tbody ref={ref as React.RefObject<HTMLTableSectionElement>} data-virtual-chunk className={className}>
        {visible ? children : (
          <tr data-virtual-placeholder style={{ height: height.current }}>
            <td colSpan={colSpan} />
          </tr>
        )}
      </tbody>
    )
  }
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} data-virtual-chunk className={className} style={visible ? undefined : { height: height.current }}>
      {visible ? children : <div data-virtual-placeholder style={{ height: height.current }} />}
    </div>
  )
}
