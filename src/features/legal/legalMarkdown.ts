/** Yasal metinler için küçük Markdown alt kümesi: başlık (#, ##), paragraf, madde listesi, tablo; satır içi **kalın**. */
export type LegalBlock =
  | { kind: 'h1' | 'h2'; text: string }
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function parseLegalMarkdown(source: string): LegalBlock[] {
  const blocks: LegalBlock[] = []
  const lines = source.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trimEnd()
    if (!line.trim()) {
      i++
    } else if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3).trim() })
      i++
    } else if (line.startsWith('# ')) {
      blocks.push({ kind: 'h1', text: line.slice(2).trim() })
      i++
    } else if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim())
        i++
      }
      blocks.push({ kind: 'ul', items })
    } else if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(cells(lines[i]))
        i++
      }
      const [head, , ...body] = rows
      blocks.push({ kind: 'table', head, rows: body })
    } else {
      const para: string[] = []
      while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i])) {
        para.push(lines[i].trim())
        i++
      }
      blocks.push({ kind: 'p', lines: para })
    }
  }
  return blocks
}

/** `**kalın**` parçalarını ayırır: tek indisler kalındır. */
export const splitBold = (text: string) => text.split('**')
