import type { ReactNode } from 'react'

/**
 * Çalışma alanı şablonu (11 §9): solda kahraman (saha) ≈%62, sağda 380px yan panel. Dar ekranda saha üstte, panel alttan sheet olarak açılır.
 * Cam: yalnız saha paneli (.glass) ve yan panel (.glass-2); iç içe cam yok.
 */
export function Workspace({ title, hero, side, header }: { title: string; hero: ReactNode; side: ReactNode; header?: ReactNode }) {
  return (
    <div className="space-y-3">
      <h1 className="sr-only">{title}</h1>
      {header}
      <div className="flex flex-col gap-4 min-[820px]:flex-row min-[820px]:items-start">
        <section aria-label="Saha" className="glass min-w-0 flex-1 p-3 min-[820px]:basis-[62%]">
          {hero}
        </section>
        {side}
      </div>
    </div>
  )
}
