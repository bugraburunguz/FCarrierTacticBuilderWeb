/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { langOfNationality, upperName } from './nameCase'

// V3-04.1: lang="tr" altında uppercase i'yi İ'ye çevirir; isim öğesinin lang'ı uyruktan gelir (TR/AZ → tr, diğerleri en).
describe('isim büyük harf kuralı', () => {
  it('uyruktan dil: Türkiye ve Azerbaycan tr, diğerleri en', () => {
    expect(langOfNationality('Türkiye')).toBe('tr')
    expect(langOfNationality('Turkey')).toBe('tr')
    expect(langOfNationality('Azerbaijan')).toBe('tr')
    expect(langOfNationality('Spain')).toBe('en')
    expect(langOfNationality('Germany')).toBe('en')
    expect(langOfNationality(undefined)).toBe('en')
  })

  it.each([
    ['Pedri', 'Spain', 'PEDRI'],
    ['Atik', 'Türkiye', 'ATİK'],
    ['Kimmich', 'Germany', 'KIMMICH'],
    ['Courtois', 'Belgium', 'COURTOIS'],
  ])('%s (%s) → %s', (name, nationality, expected) => {
    expect(upperName(name, langOfNationality(nationality))).toBe(expected)
  })
})

describe('kaynak kapısı: yalın toUpperCase() yok', () => {
  it('JS büyük harf dönüşümü açık dille (toLocaleUpperCase(lang)) yapılır; sbcText kind anahtarı istisna', () => {
    const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\./.test(p) && !p.endsWith('nameCase.ts'))
    const offenders = files.filter((p) => !p.split('\\').join('/').endsWith('lib/sbcText.ts') && /\.toUpperCase\(\)/.test(readFileSync(`src/${p}`, 'utf8')))
    expect(offenders).toEqual([])
  })
})
