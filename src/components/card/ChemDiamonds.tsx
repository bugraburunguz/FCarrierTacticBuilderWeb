const FILLED = 'var(--color-flood-400)'

/** Kimya göstergesi: 3 elmas, `value` kadarı dolu. Renk tek başına anlam taşımaz: dolu/boş şekil farkı ve aria-label vardır. */
export function ChemDiamonds({ value, size = 10 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`Kimya ${value} / 3`} className="inline-flex items-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" fill={i < value ? FILLED : 'transparent'} stroke={i < value ? '#7a5d00' : 'var(--color-ink-300)'} strokeWidth="1" />
        </svg>
      ))}
    </span>
  )
}
