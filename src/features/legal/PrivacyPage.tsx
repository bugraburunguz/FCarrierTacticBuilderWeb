import { Fragment, useMemo } from 'react'
import source from '../../../docs/legal/gizlilik-aydinlatma.md?raw'
import { parseLegalMarkdown, splitBold } from './legalMarkdown'
import { PRIVACY_DATE, PRIVACY_VERSION } from './privacyVersion'

const text = source.replace('{{SURUM}}', String(PRIVACY_VERSION)).replace('{{TARIH}}', PRIVACY_DATE)

function Inline({ value }: { value: string }) {
  return (
    <>
      {splitBold(value).map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-ink">{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}

/** Gizlilik ve aydınlatma metni (PROD-PREP 3): kaynak `docs/legal/gizlilik-aydinlatma.md`; sürüm ve tarih `privacyVersion`'dan. */
export function PrivacyPage() {
  const blocks = useMemo(() => parseLegalMarkdown(text), [])
  return (
    <article className="glass-2 mx-auto my-2 flex w-full max-w-3xl min-w-0 flex-col gap-3 p-4 text-sm leading-6 text-ink-2 sm:p-6">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h1':
            return <h1 key={i} className="font-display text-[26px] font-bold leading-[30px] text-ink sm:text-[32px] sm:leading-9">{block.text}</h1>
          case 'h2':
            return <h2 key={i} className="pt-3 font-display text-xl font-semibold leading-6 text-ink">{block.text}</h2>
          case 'p':
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    <Inline value={line} />
                  </Fragment>
                ))}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {block.items.map((item, j) => <li key={j}><Inline value={item} /></li>)}
              </ul>
            )
          case 'table':
            return (
              <div key={i} className="min-w-0 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr>{block.head.map((h) => <th key={h} scope="col" className="border-b border-line px-2 py-1.5 font-semibold text-ink">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>{row.map((cell, c) => <td key={c} className="border-b border-line px-2 py-1.5 align-top">{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </article>
  )
}
