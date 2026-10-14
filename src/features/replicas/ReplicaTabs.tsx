import type { ReplicaDetail, ReplicaSummary } from '../../api/types'
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
    </div>
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
      {((detail.sources && detail.sources.length > 0) || (detail.verify && detail.verify.length > 0)) && (
        <section aria-label="Kaynak notları" className="flex flex-col gap-1.5">
          <h3 className="font-display text-xl font-semibold leading-6">Kaynak notları</h3>
          {detail.sources && detail.sources.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
              {detail.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {detail.verify && detail.verify.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted">Doğrulanması gerekenler</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {detail.verify.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
