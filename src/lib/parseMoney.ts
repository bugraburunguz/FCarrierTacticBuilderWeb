const SUFFIX = /^(.*?)\s*(milyon|mn|m|bin|k)?$/

/**
 * tr-TR para metni → tam euro. Ayraçlar: nokta binlik, virgül ondalık ("1.500.000", "2,5"); ek varsa birim çarpanının yerine geçer
 * ("15m", "2,5 milyon", "750 bin"). Onaltılı, üslü, negatif ve belirsiz girdiler `undefined` döner.
 */
export function parseMoney(text: string, factor: number): number | undefined {
  const match = SUFFIX.exec(text.trim().toLowerCase())
  const suffix = match?.[2]
  const body = (match?.[1] ?? '').replace(/\s+/g, '')
  if (body === '' || !/^[\d.,]+$/.test(body)) {
    return undefined
  }
  let normalized: string
  if (body.includes(',')) {
    const parts = body.split(',')
    const integer = parts[0].replace(/\./g, '')
    if (parts.length > 2 || !/^\d+$/.test(integer) || !/^\d+$/.test(parts[1])) {
      return undefined
    }
    normalized = `${integer}.${parts[1]}`
  } else if (/^\d{1,3}(\.\d{3})+$/.test(body)) {
    normalized = body.replace(/\./g, '')
  } else if (/^\d+(\.\d+)?$/.test(body)) {
    normalized = body
  } else {
    return undefined
  }
  const unit = suffix === undefined ? factor : suffix === 'k' || suffix === 'bin' ? 1_000 : 1_000_000
  return Math.round(Number(normalized) * unit)
}
