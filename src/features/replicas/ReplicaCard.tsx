import { BadgeCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Formation, ReplicaSummary } from '../../api/types'
import { Chip } from '../../design/components/primitives'
import { CopyCodeButton } from './CopyCodeButton'
import { APPROACH_LABEL, BUILD_UP_LABEL, CATEGORY_LABEL, LEAGUE_LABEL } from './labels'
import { MiniPitch } from './MiniPitch'

/**
 * Liste kartı (Katalog şablonu): blur yok (`.glass-3`); takım + sezon, hoca, lig · kategori, doğrulama rozeti (metinli; renk tek başına anlam taşımaz),
 * mini saha, formasyon/build-up/hat rozetleri, kod kopyala, dikkat noktası sayısı. `fit`: "Kadroma uyanlar" uyum yüzdesi (REP-d).
 */
export function ReplicaCard({ replica, formation, action, fit }: { replica: ReplicaSummary; formation?: Formation; action?: ReactNode; fit?: number }) {
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
          <h2 className="font-display text-lg font-semibold leading-6">
            <Link to={`/replicas/${replica.id}`} className="text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent">
              {replica.club} <span className="font-[var(--font-num)] text-sm font-medium text-ink-2">{replica.season}</span>
            </Link>
          </h2>
          <p className="truncate text-sm text-ink-2">{replica.coach}</p>
          <p className="text-xs text-muted">
            <span>{LEAGUE_LABEL[replica.league] ?? replica.league}</span>
            <span aria-hidden="true"> · </span>
            <span>{CATEGORY_LABEL[replica.category]}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {fit !== undefined && <Chip title="Ana kadronun bu taktiğe uyumu" className="font-semibold text-ink">Uyum %{fit}</Chip>}
          {replica.verified && (
            <Chip title="Diziliş ve ilk 11 maç raporlarıyla doğrulandı">
              {/* Light temada --good-soft üstünde yeşil metin AA'yı geçmiyor: metin nötr, renk yalnız ikonda (anlam metinde). */}
              <BadgeCheck size={12} aria-hidden="true" className="text-good" />
              Doğrulandı
            </Chip>
          )}
          <Chip>{replica.eaFormation}</Chip>
          <Chip>{BUILD_UP_LABEL[replica.buildUp]}</Chip>
          <Chip title={`Hat yüksekliği ${replica.lineHeight}`}>{APPROACH_LABEL[replica.defensiveApproach]} · {replica.lineHeight}</Chip>
        </div>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2">
          {/* KARIYER-UX FAZ 4b: Lab › Replikalar "Klonla → taslak" gibi gömülü kullanımın eylemi (kartın bağlantı katmanının üstünde). */}
          {action}
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
