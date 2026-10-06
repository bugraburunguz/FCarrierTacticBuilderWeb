import type { BehaviorTag, Formation, Role } from '../api/types'
import type { TacticState, TeamSetupState } from '../state/tacticStore'

/**
 * FC Kariyer taktik kodu — bit-packed, sürümlü, sağlama toplamlı paylaşım kodu.
 * DİKKAT: EA'nın oyun içi 12 karakterlik kodu DEĞİLDİR (o formatın yapısı bilinmiyor); yalnızca bu sitede
 * taktik paylaşmak/yedeklemek içindir. Kod, katalogdaki (formasyon / rol / etiket) sıralamasına bağlıdır;
 * sağlama toplamı ve sürüm biti uyumsuz kodları reddeder.
 */
export interface TacticCatalog {
  formations: Formation[]
  roles: Role[]
  tags: BehaviorTag[]
}

const PREFIX = 'FCK1.'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const VERSION = 1
const VERSION_BITS = 4
const FORMATION_BITS = 6
const BUILD_UP_BITS = 2
const DEPTH_BITS = 7
const ROLE_BITS = 7
const CRC_BITS = 8
const BUILD_UPS: TeamSetupState['buildUp'][] = ['Short', 'Balanced', 'Counter']

export class TacticCodeError extends Error {}

class BitWriter {
  bits: number[] = []

  write(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) {
      this.bits.push((value >> i) & 1)
    }
  }
}

class BitReader {
  private pos = 0

  constructor(private readonly bits: number[]) {}

  read(width: number): number {
    if (this.pos + width > this.bits.length) {
      throw new TacticCodeError('Kod eksik veya bozuk.')
    }
    let value = 0
    for (let i = 0; i < width; i++) {
      value = (value << 1) | this.bits[this.pos++]
    }
    return value
  }

  get position() {
    return this.pos
  }
}

function crc8(bits: number[]): number {
  let crc = 0
  for (const bit of bits) {
    const top = (crc >> 7) & 1
    crc = (crc << 1) & 0xff
    if (top ^ bit) {
      crc ^= 0x07
    }
  }
  return crc
}

const sortedIds = <T extends { id: string }>(items: T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id)).map((i) => i.id)

function groupTags(catalog: TacticCatalog, group: string): string[] {
  return sortedIds(catalog.tags.filter((t) => t.position === group))
}

export function encodeTactic(state: TacticState, catalog: TacticCatalog): string {
  const formations = sortedIds(catalog.formations)
  const roles = sortedIds(catalog.roles)
  const formationIndex = formations.indexOf(state.formation)
  const formation = catalog.formations.find((f) => f.id === state.formation)
  if (formationIndex < 0 || !formation) {
    throw new TacticCodeError('Formasyon katalogda yok.')
  }
  const w = new BitWriter()
  w.write(VERSION, VERSION_BITS)
  w.write(formationIndex, FORMATION_BITS)
  const buildUpIndex = state.setup ? BUILD_UPS.indexOf(state.setup.buildUp) + 1 : 0
  w.write(buildUpIndex, BUILD_UP_BITS)
  w.write(state.setup ? Math.max(0, Math.min(100, Math.round(state.setup.depth))) : 0, DEPTH_BITS)
  for (const slot of formation.slots) {
    const selection = state.slots[slot.slotId]
    const roleIndex = selection?.roleId ? roles.indexOf(selection.roleId) + 1 : 0
    w.write(Math.max(0, roleIndex), ROLE_BITS)
    for (const tagId of groupTags(catalog, slot.group)) {
      w.write(selection?.tags.includes(tagId) ? 1 : 0, 1)
    }
  }
  w.write(crc8(w.bits), CRC_BITS)
  while (w.bits.length % 6 !== 0) {
    w.bits.push(0)
  }
  let text = ''
  for (let i = 0; i < w.bits.length; i += 6) {
    text += ALPHABET[w.bits.slice(i, i + 6).reduce((acc, b) => (acc << 1) | b, 0)]
  }
  return PREFIX + text
}

export function decodeTactic(code: string, catalog: TacticCatalog): TacticState {
  const trimmed = code.trim()
  if (!trimmed.startsWith(PREFIX)) {
    throw new TacticCodeError('Bu bir FC Kariyer taktik kodu değil (FCK1. ile başlamalı). EA oyun içi kodları desteklenmiyor.')
  }
  const bits: number[] = []
  for (const ch of trimmed.slice(PREFIX.length)) {
    const value = ALPHABET.indexOf(ch)
    if (value < 0) {
      throw new TacticCodeError(`Kodda geçersiz karakter var: "${ch}". Büyük/küçük harfe dikkat et.`)
    }
    for (let i = 5; i >= 0; i--) {
      bits.push((value >> i) & 1)
    }
  }
  const r = new BitReader(bits)
  if (r.read(VERSION_BITS) !== VERSION) {
    throw new TacticCodeError('Kod farklı bir sürümden; bu sürümle okunamıyor.')
  }
  const formations = sortedIds(catalog.formations)
  const formationId = formations[r.read(FORMATION_BITS)]
  const formation = catalog.formations.find((f) => f.id === formationId)
  if (!formation) {
    throw new TacticCodeError('Kodun formasyonu katalogda yok.')
  }
  const buildUpIndex = r.read(BUILD_UP_BITS)
  const depth = r.read(DEPTH_BITS)
  const roles = sortedIds(catalog.roles)
  const slots: TacticState['slots'] = {}
  for (const slot of formation.slots) {
    const roleIndex = r.read(ROLE_BITS)
    const tags = groupTags(catalog, slot.group).filter(() => r.read(1) === 1)
    if (roleIndex > roles.length) {
      throw new TacticCodeError('Kodun rolü katalogda yok.')
    }
    if (roleIndex > 0 || tags.length > 0) {
      slots[slot.slotId] = { tags, ...(roleIndex > 0 ? { roleId: roles[roleIndex - 1] } : {}) }
    }
  }
  const payloadEnd = r.position
  const checksum = r.read(CRC_BITS)
  if (crc8(bits.slice(0, payloadEnd)) !== checksum) {
    throw new TacticCodeError('Sağlama toplamı tutmuyor: kod yanlış yazılmış ya da katalog değişmiş.')
  }
  const setup: TeamSetupState | undefined = buildUpIndex > 0 && buildUpIndex <= BUILD_UPS.length ? { buildUp: BUILD_UPS[buildUpIndex - 1], depth } : undefined
  return { formation: formation.id, slots, ...(setup ? { setup } : {}) }
}
