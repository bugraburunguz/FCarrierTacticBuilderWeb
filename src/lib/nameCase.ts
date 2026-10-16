/*
 * lang="tr" altında CSS/JS büyük harf i'yi İ'ye çevirir ("Pedri" → "PEDRİ"). Oyuncu ve kulüp adlarında dil uyruktan gelir:
 * Türkiye ve Azerbaycan için "tr" (Atik → ATİK), diğerleri için "en" (Kimmich → KIMMICH).
 */
const TURKIC = /^(t[uü]rk(iye|ey)|azerbaijan|azerbaycan)$/i

export type NameLang = 'tr' | 'en'

export function langOfNationality(nationality?: string): NameLang {
  return nationality && TURKIC.test(nationality.trim()) ? 'tr' : 'en'
}

/** JS'te büyük harf gerekirse aynı kuralla (CSS'te `lang` + `uppercase` yeterlidir). */
export function upperName(name: string, lang: NameLang = 'en'): string {
  return name.toLocaleUpperCase(lang)
}
