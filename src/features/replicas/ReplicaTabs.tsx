import type { ReplicaDetail, ReplicaSummary, ReplicaVariant } from '../../api/types'
import { Chip } from '../../design/components/primitives'
import { CopyCodeButton } from './CopyCodeButton'
import { approachText, APPROACH_LABEL, BUILD_UP_LABEL, buildUpText } from './labels'

/** Taktik sekmesi: kod + kopyala, formasyon / build-up / hat, "Oyuna aktar" talimatı (2 satır), Plan B. */
export function TacticTab({ summary, detail }: { summary: ReplicaSummary; detail: ReplicaDetail }) {
  const planB = detail.fc27.planB
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-semibold leading-6">Taktik kodu</h3>
        <CopyCodeButton code={detail.tacticCode} className="self-start" />
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-ink-2">
          <li>Kodu kopyala.</li>
          <li>Oyunda Takım Yönetimi → Taktikler → Kod Kullan bölümüne yapıştır (büyük/küçük harf önemlidir).</li>
        </ol>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <div className="glass-3 p-2">
          <dt className="text-xs font-medium text-muted">Formasyon</dt>
          <dd className="font-[var(--font-num)] text-base tabular-nums">{summary.eaFormation}</dd>
        </div>
        <div className="glass-3 p-2">
          <dt className="text-xs font-medium text-muted">Build-up</dt>
          <dd className="text-base">{BUILD_UP_LABEL[summary.buildUp]}</dd>
        </div>
        <div className="glass-3 p-2">
          <dt className="text-xs font-medium text-muted">Hat</dt>
          <dd className="text-base">
            {APPROACH_LABEL[summary.defensiveApproach]} <span className="font-[var(--font-num)] tabular-nums text-ink-2">{summary.lineHeight}</span>
          </dd>
        </div>
      </dl>
      {planB && (
        <div className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl font-semibold leading-6">Plan B</h3>
          <p className="text-sm font-medium">{planB.label}</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{planB.formation}</Chip>
            <Chip>{buildUpText(planB.buildUp)}</Chip>
            <Chip>{approachText(planB.defensiveApproach)} · {planB.lineHeight}</Chip>
          </div>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
            {planB.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {detail.fc27.variants?.map((v) => (
        <VariantSection key={v.id} variant={v} />
      ))}
    </div>
  )
}

function VariantSection({ variant }: { variant: ReplicaVariant }) {
  const headingId = `variant-${variant.id}`
  return (
    <section aria-labelledby={headingId} className="glass-3 flex flex-col gap-2 p-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-medium text-muted">Ek taktik{variant.author ? ` · ${variant.author}` : ''}</p>
        <h3 id={headingId} className="font-display text-xl font-semibold leading-6">
          {variant.label}
        </h3>
      </div>
      {variant.note && <p className="text-sm text-ink-2">{variant.note}</p>}
      <CopyCodeButton code={variant.tacticCode} className="self-start" />
      <div className="flex flex-wrap gap-1.5">
        <Chip>{variant.formation}</Chip>
        <Chip>{buildUpText(variant.buildUp)}</Chip>
        <Chip>
          {approachText(variant.defensiveApproach)} · {variant.lineHeight}
        </Chip>
      </div>
      <ul className="space-y-1 text-sm">
        {variant.slots.map((s) => (
          <li key={s.slot}>
            <span className="font-medium text-ink">
              {s.slot}: {s.role}/{s.focus}
            </span>
            {s.profile && <span className="text-ink-2"> · {s.profile}</span>}
          </li>
        ))}
      </ul>
      {variant.smartTactics && variant.smartTactics.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-2">
          {variant.smartTactics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Hikâye sekmesi: seed'deki açıklama, gerçek şekil, benzerlik sınırları ve kaynak notları. */
export function StoryTab({ detail }: { detail: ReplicaDetail }) {
  const shape = detail.realShape
  return (
    <div className="flex flex-col gap-4">
      {detail.whyIconic && (
        <section aria-label="Neden bu takım">
          <h3 className="mb-1 font-display text-xl font-semibold leading-6">Neden bu takım?</h3>
          <p className="text-sm text-ink-2">{detail.whyIconic}</p>
        </section>
      )}
      {detail.honours && detail.honours.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Kupalar">
          {detail.honours.map((h) => (
            <Chip key={h}>{h}</Chip>
          ))}
        </div>
      )}
      {shape && (
        <section aria-label="Gerçek oyun şekli" className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl font-semibold leading-6">Gerçekte nasıl oynadı?</h3>
          {shape.inPossession && (
            <p className="text-sm text-ink-2">
              <b className="text-ink">Topla: </b>
              {shape.inPossession}
            </p>
          )}
          {shape.outOfPossession && (
            <p className="text-sm text-ink-2">
              <b className="text-ink">Topsuz: </b>
              {shape.outOfPossession}
            </p>
          )}
          {shape.keyMechanisms && shape.keyMechanisms.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
              {shape.keyMechanisms.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {detail.replicaFidelity && (
        <section aria-label="Benzerlik" className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl font-semibold leading-6">
            Benzerlik <span className="font-[var(--font-num)] text-base tabular-nums text-ink-2">{detail.replicaFidelity.score}/5</span>
          </h3>
          {detail.replicaFidelity.cannotReplicate && detail.replicaFidelity.cannotReplicate.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted">Oyunda birebir karşılığı olmayanlar</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {detail.replicaFidelity.cannotReplicate.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {detail.verified === false && <p className="text-xs text-muted">Kaynak: doğrulanmadı</p>}
      {((detail.sources && detail.sources.length > 0) || (detail.verify && detail.verify.length > 0)) && (
        <details className="text-sm" aria-label="Yönetici notları">
          <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent">Yönetici notları</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-2">
            {[...(detail.sources ?? []), ...(detail.verify ?? [])].map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
