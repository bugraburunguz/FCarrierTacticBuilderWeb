import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, ErrorCodes } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import type { CareerRecommendation, CareerRecommendationItem, CareerRecommendationRequest, Credited, RecommendProfile } from '../../api/types'
import { bigStore } from '../../state/bigStore'
import { useAuth } from '../../auth/AuthContext'
import { MoneyInput } from '../../components/MoneyInput'
import { ErrorBox, Select } from '../../components/ui'
import { Button, EmptyState, Segmented, Skeleton } from '../../design/components/primitives'
import { useAppConfig } from '../../state/appConfig'
import { RecommendationRow } from './RecommendationRow'

const PROFILES: { id: RecommendProfile; label: string }[] = [
  { id: 'BALANCED', label: 'Dengeli' },
  { id: 'NOW', label: 'Hemen şimdi' },
  { id: 'FUTURE', label: 'Gelecek' },
]
const AGE_CHOICES = [28, 30, 32, 34, 36]
const LIMIT = 10
const MAX_LONG_SHOTS = 3

type BudgetMode = 'career' | 'unknown' | 'custom'

/** FAZ 6a-J: son öneri sonucu (kariyer + ihtiyaç başına) IndexedDB'de; sayfa açılışında ücretli çağrı yapılmadan gösterilir. */
export const lastRecommendationsKey = (careerId: number, position: string, slotId?: string) => `last-recommendations.${careerId}.${position}.${slotId ?? ''}`
interface SavedRecommendation {
  at: string
  response: Credited<CareerRecommendation>
  /** İsteğin gövdesi: şimdiki rol/filtrelerden farklıysa sonuç bayat diye işaretlenir. */
  request?: CareerRecommendationRequest
}
const SAVED_DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

interface Props {
  careerId?: number
  position: string
  slotId?: string
  /** Verilirse yalnız bu rol/focus için puanlanır (slotun rolü); verilmezse sunucu taktik → kadro → varsayılan sırasını izler. */
  roleId?: string
  /** Satır sonu eylemi (örn. kısa liste). */
  rowAction?: (item: CareerRecommendationItem) => ReactNode
  /** V3-06c: satır altı ek bilgi (alım sonrası bütçe, değer çubuğu, lig seviyesi). */
  rowExtra?: (item: CareerRecommendationItem) => ReactNode
  /** V3-06c: satır kartı genişliği (px); verilmezse küçük resim. */
  cardWidth?: number
  /** V3-06c: uzak ihtimaller (HAYAL) anahtarı dışarıdan (adres çubuğu); verilmezse panel içi durum. */
  longShots?: boolean
  onLongShotsChange?: (value: boolean) => void
  longShotsLabel?: string
  /** FAZ 6a-J: kariyer bütçesi; verilirse (ya da elle bütçe girilirse) bütçeyi aşan adaylar ayrı ve kapalı listelenir. */
  budgetEur?: number
  /** FCA-4: gelen sonucu tarayıcıda süzer (sayfanın ayrıntılı filtresi); yeni istek atılmaz, kredi düşmez. */
  resultFilter?: (item: CareerRecommendationItem) => boolean
  /** FCA-5: isteğe giden sunucu süzgeci (lig, uyruk); değişince sonuç bayat sayılır, yeniden getirmek gerekir (ücretli). */
  requestFilters?: { leagueId?: number; nationalityId?: number }
}

// Oturum içi "tekrar sorma" tercihi (kalıcı değil; kredi harcamasını açık tutar).
let skipConfirm = false

/**
 * Kariyer öneri paneli (E3-10): `POST /careers/{id}/recommendations`. Ücretli olduğu için açılışta istek atmaz; düğme kaç kredi düşeceğini yazar,
 * ücretsiz üyelerde bir onay adımı vardır, PREMIUM'da yoktur. Filtre değişince sonuç bayatlar ve yeniden getirmek gerekir.
 */
export function RecommendationPanel({ careerId, position, slotId, roleId, rowAction, rowExtra, cardWidth, longShots: controlledLongShots, onLongShotsChange, longShotsLabel = 'Hayal transferlerini göster', budgetEur, resultFilter, requestFilters }: Props) {
  const { me } = useAuth()
  const queryClient = useQueryClient()
  const ids = { age: useId(), budget: useId() }
  const [profile, setProfile] = useState<RecommendProfile>('BALANCED')
  const [ageMax, setAgeMax] = useState<number | undefined>()
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('career')
  const [customBudget, setCustomBudget] = useState<number | undefined>()
  const [alternatives, setAlternatives] = useState(false)
  const [ownLongShots, setOwnLongShots] = useState(false)
  const longShots = controlledLongShots ?? ownLongShots
  const setLongShots = (value: boolean) => (onLongShotsChange ? onLongShotsChange(value) : setOwnLongShots(value))
  const [confirming, setConfirming] = useState(false)
  const [dontAsk, setDontAsk] = useState(false)
  const [stale, setStale] = useState(false)

  const costs = useQuery({ queryKey: ['credit-costs'], queryFn: endpoints.creditCosts, staleTime: 600_000, retry: false })
  const premium = me?.subscriptionType === 'PREMIUM'
  const { freeBeta } = useAppConfig()
  const cost = costs.data?.recommend

  const [showOver, setShowOver] = useState(false)
  const savedKey = careerId === undefined ? undefined : lastRecommendationsKey(careerId, position, slotId)
  // FAZ 6a-J: son sonuç yerelde; açılışta ücretli çağrı yapılmaz (D-01, kredi), kayıtlıysa tarihiyle gösterilir.
  const saved = useQuery({ queryKey: ['last-recommendations', savedKey], queryFn: async () => (await bigStore.load<SavedRecommendation>(savedKey!)) ?? null, enabled: savedKey !== undefined, staleTime: Infinity })
  const run = useMutation({
    mutationFn: (body: CareerRecommendationRequest) => endpoints.careerRecommendations(careerId!, body),
    onSuccess: (data, request) => {
      if (savedKey) {
        const entry: SavedRecommendation = { at: new Date().toISOString(), response: data, request }
        bigStore.set(savedKey, entry)
        queryClient.setQueryData(['last-recommendations', savedKey], entry)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })

  // FCA-5: sayfanın sunucu süzgeci (lig, uyruk) son istekten farklıysa sonuç bayattır; ücretli olduğu için kendiliğinden yeniden istenmez.
  const filterKey = `${requestFilters?.leagueId ?? ''}|${requestFilters?.nationalityId ?? ''}`
  const [fetchedKey, setFetchedKey] = useState(filterKey)

  if (careerId === undefined) {
    return <EmptyState>Öneri almak için bir kariyer seç.</EmptyState>
  }

  const body = (): CareerRecommendationRequest => ({
    position,
    slotId,
    roleId,
    forceRole: roleId !== undefined,
    alternativeRoles: alternatives,
    profile,
    limit: LIMIT,
    ageMax,
    budgetUnknown: budgetMode === 'unknown',
    budgetEur: budgetMode === 'custom' ? customBudget : undefined,
    includeLongShots: longShots,
    leagueId: requestFilters?.leagueId,
    nationalityId: requestFilters?.nationalityId,
  })
  const fetchNow = () => {
    setConfirming(false)
    setStale(false)
    setFetchedKey(filterKey)
    skipConfirm = skipConfirm || dontAsk
    run.mutate(body())
  }
  const onStart = () => (premium || skipConfirm ? fetchNow() : setConfirming(true))
  const changed = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setStale(run.data !== undefined)
  }

  const fromSaved = !run.data && saved.data ? saved.data : undefined
  const result = run.data?.result ?? fromSaved?.response.result
  // FCA-5: gösterilen sonucun hangi lig/uyrukla alındığı (yeni istek ya da kayıtlı sonuç); şimdiki süzgeçten farklıysa bayat.
  const shownKey = run.data ? fetchedKey : fromSaved ? `${fromSaved.request?.leagueId ?? ''}|${fromSaved.request?.nationalityId ?? ''}` : filterKey
  // FAZ 6a-J: bütçeye uyanlar önce; aşanlar ayrı başlıkta, anahtarla açılır (değeri bilinmeyen aday uyanlarda kalır).
  const budget = budgetMode === 'custom' ? customBudget : budgetMode === 'career' ? budgetEur : undefined
  const overBudget = (i: CareerRecommendationItem) => budget !== undefined && i.player.valueEur !== undefined && i.player.valueEur > budget
  // FCA-4: sayfanın ayrıntılı filtresi (en düşük OVR/POT, en yüksek değer) sonucu tarayıcıda süzer; yeni istek ve kredi yok.
  const all = result?.items ?? []
  const shown = resultFilter ? all.filter(resultFilter) : all
  // Uzak ihtimaller de aynı süzgeçten geçer (en düşük OVR 80'ken 70'lik "hayal" görünmesin).
  const allLong = result?.longShots ?? []
  const longShown = resultFilter ? allLong.filter(resultFilter) : allLong
  const filteredOut = all.length - shown.length + allLong.length - longShown.length
  const allFiltered = all.length > 0 && shown.length === 0
  const fitting = shown.filter((i) => !overBudget(i))
  const over = shown.filter(overBudget)
  const outOfCredit = run.error instanceof ApiError && run.error.code === ErrorCodes.insufficientCredit
  const priceLabel = freeBeta ? "Beta'da ücretsiz" : premium ? "PREMIUM'da ücretsiz" : cost !== undefined ? `${cost} kredi` : 'kredi'

  return (
    <div className="space-y-3">
      {/* Canlı bölge hep var (sonradan eklenen bölgeyi ekran okuyucu duyurmayabilir); yalnız metin değişir. */}
      {resultFilter && <p role="status" aria-label="Filtre sonucu" className="text-xs text-ink-2 empty:hidden">{filteredOut > 0 ? `${filteredOut} aday filtreye takıldı` : ''}</p>}
      <div className="space-y-2">
        <Segmented label="Profil" value={profile} options={PROFILES} onChange={changed(setProfile)} />
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={ids.age} className="flex flex-col gap-1 text-xs font-medium text-muted">
            Maks. yaş
            <Select id={ids.age} value={ageMax ?? ''} onChange={(e) => changed(setAgeMax)(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Otomatik (34)</option>
              {AGE_CHOICES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </label>
          <label htmlFor={ids.budget} className="flex flex-col gap-1 text-xs font-medium text-muted">
            Bütçe
            <Select id={ids.budget} value={budgetMode} onChange={(e) => changed(setBudgetMode)(e.target.value as BudgetMode)}>
              <option value="career">Kariyer bütçem</option>
              <option value="unknown">Bilinmiyor</option>
              <option value="custom">Elle gir…</option>
            </Select>
          </label>
        </div>
        {budgetMode === 'custom' && <MoneyInput ariaLabel="Bütçe tutarı" value={customBudget} onChange={changed(setCustomBudget)} />}
        <div className="flex flex-col gap-1 text-sm">
          <label className="flex min-h-8 items-center gap-2 max-sm:min-h-11">
            <input type="checkbox" checked={alternatives} onChange={(e) => changed(setAlternatives)(e.target.checked)} />
            Alternatif roller
          </label>
          <label className="flex min-h-8 items-center gap-2 max-sm:min-h-11">
            <input type="checkbox" checked={longShots} onChange={(e) => changed(setLongShots)(e.target.checked)} />
            {longShotsLabel}
          </label>
        </div>
      </div>

      {confirming ? (
        <div role="alertdialog" aria-label="Kredi onayı" className="glass-3 space-y-2 p-3 text-sm">
          <p>
            Bu öneri <b>{cost} kredi düşecek</b>. Bakiye {me?.creditBalance ?? '—'}, günlük {me?.dailyCreditLimit ?? '—'}. PREMIUM'da sınırsız.
          </p>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
            Bu oturumda tekrar sorma
          </label>
          <div className="flex gap-2">
            <Button variant="primary" onClick={fetchNow}>{`Onayla (${cost} kredi)`}</Button>
            <Button onClick={() => setConfirming(false)}>Vazgeç</Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" disabled={run.isPending} onClick={onStart}>
          {run.isPending ? 'Aranıyor…' : `Önerileri getir · ${priceLabel}`}
        </Button>
      )}
      {(stale || (result !== undefined && shownKey !== filterKey)) && <p className="text-xs text-warn">Filtreler değişti; sonuçlar eski. Yeniden getir.</p>}
      <ErrorBox error={outOfCredit ? undefined : run.error} />
      {outOfCredit && (
        <p className="text-sm">
          Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-accent underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
        </p>
      )}

      {run.isPending && (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {result && !run.isPending && (
        <section aria-label="Öneriler" className="space-y-2">
          {fromSaved && <p className="text-xs font-semibold text-ink-2">Son öneriler · {SAVED_DATE.format(new Date(fromSaved.at))}</p>}
          {fromSaved && JSON.stringify(fromSaved.request) !== JSON.stringify(body()) && (
            <p className="text-xs text-warn">Bu sonuç farklı rol ya da filtrelerle alındı; güncel hâli için yeniden getir.</p>
          )}
          <p className="text-xs text-muted">
            {result.roleName ? `Rol: ${result.roleName}` : 'Tüm roller'}
            {result.userClubStrength !== undefined ? ` · kulüp gücün ${result.userClubStrength}` : ''}
            {result.userFirstElevenAverage !== undefined ? ` · ilk 11 ort. ${result.userFirstElevenAverage}` : ''}
          </p>
          {result.items.length === 0 ? (
            <EmptyState>Bu filtrelerle uygun oyuncu bulunamadı. Yaşı ya da bütçeyi{shownKey !== '|' ? ', lig ya da uyruk süzgecini' : ''} gevşetmeyi dene.</EmptyState>
          ) : (
            <ul className="space-y-1.5">
              {fitting.map((item) => (
                <RecommendationRow key={item.player.id} item={item} showRole={alternatives} action={rowAction?.(item)} extra={rowExtra?.(item)} cardWidth={cardWidth} />
              ))}
            </ul>
          )}
          {fitting.length === 0 && over.length > 0 && <p className="text-sm text-ink-2">Bütçeye uyan aday yok.</p>}
          {allFiltered && <p className="text-sm text-ink-2">Filtreye uyan aday yok; filtreyi gevşet.</p>}
          {over.length > 0 && (
            <>
              <button type="button" aria-expanded={showOver} onClick={() => setShowOver((v) => !v)}
                className="inline-flex min-h-8 items-center text-xs font-semibold text-accent underline-offset-2 hover:underline max-sm:min-h-11">
                {showOver ? 'Bütçeyi aşanları gizle' : `Bütçeyi aşanları göster (${over.length})`}
              </button>
              {showOver && (
                <section aria-label="Bütçeyi aşanlar" className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-ink-2">Bütçeyi aşanlar</h3>
                  <ul className="space-y-1.5">
                    {over.map((item) => (
                      <RecommendationRow key={item.player.id} item={item} showRole={alternatives} action={rowAction?.(item)} extra={rowExtra?.(item)} cardWidth={cardWidth} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
          {longShown.length > 0 && (
            <section aria-label="Hayal transferler" className="space-y-1.5 pt-2">
              <h3 className="text-xs font-semibold text-ink-2">Hayal transferler (ana listede değil)</h3>
              <ul className="space-y-1.5">
                {longShown.slice(0, MAX_LONG_SHOTS).map((item) => (
                  <RecommendationRow key={item.player.id} item={item} showRole={alternatives} action={rowAction?.(item)} extra={rowExtra?.(item)} cardWidth={cardWidth} />
                ))}
              </ul>
            </section>
          )}
          {run.data && run.data.charged > 0 && (
            <p className="text-xs text-muted">{run.data.charged} kredi harcandı{run.data.balance !== undefined ? ` · kalan ${run.data.balance}` : ''}.</p>
          )}
          {/* FCA-7: gösterilecek aday yoksa sunucu krediyi iade eder (charged 0); PREMIUM/beta zaten ücretsiz, onlarda yazılmaz. */}
          {run.data && run.data.charged === 0 && !premium && !freeBeta && result.items.length === 0 && longShown.length === 0 && (
            <p role="status" className="text-xs text-muted">Aday çıkmadı; kredi iade edildi{run.data.balance !== undefined && run.data.balance !== null ? ` · kalan ${run.data.balance}` : ''}.</p>
          )}
        </section>
      )}
    </div>
  )
}
