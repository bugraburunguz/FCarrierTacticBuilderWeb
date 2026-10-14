import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Formation, ReplicaSummary } from '../../api/types'
import { Chip } from '../../design/components/primitives'
import { CopyCodeButton } from './CopyCodeButton'
import { APPROACH_LABEL, BUILD_UP_LABEL, CATEGORY_LABEL } from './labels'
import { MiniPitch } from './MiniPitch'

/** Liste kartı (Katalog şablonu): blur yok (`.glass-3`); takım + sezon, hoca, mini saha, build-up/hat rozetleri, kod kopyala, dikkat noktası sayısı. */
export function ReplicaCard({ replica, formation }: { replica: ReplicaSummary; formation?: Formation }) {
  const attention = replica.attentionCount
  return (
    <li className="glass-3 relative flex gap-3 p-3 transition-transform hover:-translate-y-0.5">
      {formation ? (
        <MiniPitch slots={formation.slots} label={`Formasyon ${replica.eaFormation}`} className="h-[112px] w-[72px] shrink-0" />
      ) : (
        <div aria-hidden="true" className="glass-3 h-[112px] w-[72px] shrink-0 animate-pulse" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-6">
            <Link to={`/replicas/${replica.id}`} className="text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent">
              {replica.club} <span className="font-[var(--font-num)] text-sm font-medium text-ink-2">{replica.season}</span>
            </Link>
          </h3>
          <p className="truncate text-sm text-ink-2">{replica.coach}</p>
          <p className="text-xs text-muted">{CATEGORY_LABEL[replica.category]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{replica.eaFormation}</Chip>
          <Chip>{BUILD_UP_LABEL[replica.buildUp]}</Chip>
          <Chip title={`Hat yüksekliği ${replica.lineHeight}`}>{APPROACH_LABEL[replica.defensiveApproach]} · {replica.lineHeight}</Chip>
        </div>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2">
          <CopyCodeButton code={replica.tacticCode} />
          {attention > 0 && (
            <Chip title="Bu taktikte dikkat edilecek yerler">
              <Info size={12} aria-hidden="true" />
              {attention} dikkat noktası
            </Chip>
          )}
        </div>
      </div>
    </li>
  )
}
