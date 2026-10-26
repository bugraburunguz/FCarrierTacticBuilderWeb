import { useQuery } from '@tanstack/react-query'
import { SignalHigh, SignalLow, SignalMedium, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Club, ClubRecommendationCard, ManagerDifficulty } from '../../api/types'
import { EmptyState, ErrorState, Skeleton } from '../../design/components/primitives'
import { CLUB_RECS_KEY, useManagerProfile } from './managerQuery'
import { CATEGORY_LABEL, DIFFICULTIES, STYLES, label } from './managerRules'

const LINK = 'inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-semibold max-sm:min-h-11'
const PRIMARY = `${LINK} bg-accent text-on-accent hover:opacity-90`
const SECONDARY = `${LINK} glass-3 hover:bg-[var(--glass-hover)]`
const PROFILE_LINK = '/career/manager?sonra=yeni'
/** Öneri hesabı pahalı (önbelleksiz ilk istek ~13 sn) ve 5/dk kovasında: profil değişmedikçe yeniden istenmez. */
const RECS_STALE_MS = 600_000
const CARD_SLOTS = 6

const DIFFICULTY_ICON: Record<ManagerDifficulty, typeof SignalLow> = { EASY: SignalLow, MEDIUM: SignalMedium, HARD: SignalHigh }

function RecommendationCard({ card, onStart }: { card: ClubRecommendationCard; onStart: (club: Club) => void }) {
  const Icon = DIFFICULTY_ICON[card.difficulty]
  const title = CATEGORY_LABEL[card.category]
  return (
    <article aria-label={`${title}: ${card.clubName}`}
      className={`flex flex-col gap-3 rounded-[var(--radius-md)] p-4 ${card.dream ? 'border-2 border-dashed border-[var(--accent)] bg-[var(--glass-1)]' : 'glass-2'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.04em] text-accent">
            {card.dream && <Sparkles size={12} aria-hidden="true" />}{title}
          </p>
          <h3 className="truncate font-display text-lg font-semibold leading-6">{card.clubName}</h3>
          {card.league && <p className="truncate text-xs text-ink-2">{card.league}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-2">
          <Icon size={16} aria-hidden="true" />{label(DIFFICULTIES, card.difficulty)}
        </span>
      </div>
      <ul className="flex flex-col gap-1 text-sm">
        {card.evidence.map((line) => <li key={line} className="border-l-2 border-[var(--glass-border)] pl-2">{line}</li>)}
      </ul>
      <p className="text-sm text-ink-2">{card.expectation}</p>
      {card.dream && <p className="text-xs text-warn">İtibarın yetmeyebilir; FC'de yine de seçebilirsin.</p>}
      <button type="button" aria-label={`Bu kulüple başla: ${card.clubName}`} onClick={() => onStart({ id: card.clubId, name: card.clubName, leagueId: card.leagueId, league: card.league })}
        className={`${PRIMARY} mt-auto justify-center`}>
        Bu kulüple başla
      </button>
    </article>
  )
}

/**
 * Kulüp önerisi (MGR-b, Yeni kariyer ilk adımı): menajer profili özeti + 6 kategorili kart. "Bu kulüple başla" kariyer formunu o kulüple
 * açar (onStart); "Başka kulüp seç" takım aramasına götürür. Profil yoksa önce profil; katalogda kulüp profili yoksa ayrı durum.
 */
export function ClubRecommendations({ onStart, onPickOther }: { onStart: (club: Club) => void; onPickOther: () => void }) {
  const profile = useManagerProfile()
  const recs = useQuery({
    queryKey: [CLUB_RECS_KEY, profile.data?.profile],
    queryFn: () => endpoints.clubRecommendations({}),
    enabled: profile.data !== undefined,
    staleTime: RECS_STALE_MS,
    retry: false,
  })
  const view = profile.data
  const otherButton = <button type="button" onClick={onPickOther} className={SECONDARY}>Başka kulüp seç</button>

  return (
    <section aria-label="Kulüp önerileri" className="glass flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold leading-6">Kulüp önerileri</h2>
          {view && (
            <p className="text-sm text-ink-2">
              {view.profile.name || 'Menajer'} · itibar {view.reputation} · {view.band}
              <span className="text-muted"> · {label(STYLES, view.profile.style)} · {view.profile.formation ?? 'formasyon fark etmez'}</span>
            </p>
          )}
        </div>
        {view && <Link to={PROFILE_LINK} className={SECONDARY}>Düzenle</Link>}
      </div>

      {profile.isLoading ? <Skeleton className="h-10" /> : profile.missing ? (
        <EmptyState action={<div className="flex flex-wrap justify-center gap-2"><Link to={PROFILE_LINK} className={PRIMARY}>Menajer profilini oluştur</Link>{otherButton}</div>}>
          Geçmişini ve tarzını seç; itibarına ve tarzına uygun 6 kulüp önerelim.
        </EmptyState>
      ) : profile.failed ? (
        <ErrorState message="Menajer profili yüklenemedi." onRetry={() => profile.refetch()} />
      ) : recs.isLoading ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <p role="status" className="text-sm text-ink-2">Kulüpler kadrolarına göre hesaplanıyor; ilk seferde 15 saniye sürebilir.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: CARD_SLOTS }, (_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        </div>
      ) : recs.isError ? (
        <ErrorState message="Kulüp önerileri alınamadı." onRetry={() => recs.refetch()} />
      ) : recs.data && !recs.data.catalogReady ? (
        <EmptyState action={otherButton}>Kulüp verisi henüz yok: katalog güncel değil, öneri hesaplanamıyor. Kulübünü aramadan seçebilirsin.</EmptyState>
      ) : recs.data ? (
        <>
          {recs.data.cards.length === 0 ? (
            <EmptyState>İtibarına ve filtrelerine uyan kulüp bulunamadı.</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recs.data.cards.map((c) => <RecommendationCard key={c.clubId} card={c} onStart={onStart} />)}
            </div>
          )}
          {recs.data.missing.length > 0 && (
            <ul aria-label="Çıkmayan kartlar" className="flex flex-col gap-0.5 text-xs text-ink-2">
              {recs.data.missing.map((m) => <li key={m.category}><b className="font-semibold">{CATEGORY_LABEL[m.category]}</b>: {m.reason}</li>)}
            </ul>
          )}
          <div>{otherButton}</div>
        </>
      ) : null}
    </section>
  )
}
