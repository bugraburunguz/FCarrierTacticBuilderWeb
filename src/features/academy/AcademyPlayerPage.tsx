import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { EmptyState, Skeleton } from '../../design/components/primitives'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'
import { useActiveCareerId } from '../../state/careerStore'
import { OvrPotBar } from './YouthRow'
import { YouthDetailBody } from './YouthDetailBody'
import { youthDetailQuery } from './youthDetail'

/** Mobil oyuncu paneli (/career/academy/:playerId): masaüstündeki sağ panelin üç bölümü ayrı sayfada. `?geri=gelisim` Gelişim'den gelindiyse. */
export function AcademyPlayerPage() {
  const { playerId } = useParams()
  const [params] = useSearchParams()
  const activeId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const careerId = (careers.data?.find((c) => c.id === activeId) ?? careers.data?.[0])?.id
  const id = Number(playerId)
  const detail = useQuery({ ...youthDetailQuery(careerId ?? 0, id), enabled: careerId !== undefined && Number.isFinite(id) })
  const fromGrowth = params.get('geri') === 'gelisim'
  const back = fromGrowth ? { to: '/career/growth', label: 'Gelişim' } : { to: '/career/academy', label: 'Altyapı' }

  return (
    <div className={`mx-auto flex w-full ${CAREER_PAGE_WIDTH} flex-col gap-3 py-2`}>
      <Link to={back.to} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-accent"><ChevronLeft size={16} aria-hidden="true" />{back.label}</Link>
      {careers.isLoading ? <Skeleton className="h-64" /> : careerId === undefined ? <EmptyState>Önce bir kariyer başlat.</EmptyState> : (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] font-bold leading-[30px]">{detail.data?.name ?? 'Oyuncu'}</h1>
            {detail.data && (
              <span className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
                <span>{detail.data.age ?? '—'} yaş · {detail.data.positions.join(', ')}</span>
                <OvrPotBar overall={detail.data.overall} potential={detail.data.potential} potentialRange={detail.data.potentialRange} />
              </span>
            )}
          </header>
          <section className="glass-2 p-4"><YouthDetailBody careerId={careerId} playerId={id} /></section>
        </>
      )}
    </div>
  )
}
