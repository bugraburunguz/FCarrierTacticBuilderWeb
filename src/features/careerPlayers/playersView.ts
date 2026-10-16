/**
 * /players hangi sayfayı açar: UT modunda kart veritabanı (V3-05a); kariyer modunda v3 + oturum + seçili kariyer varsa kariyer listesi
 * (V3-06a, havuz kayıt dosyası); aksi halde mevcut oyuncu araması.
 */
/** /players/:id (V3-06b): kariyer modunda v3 + oturum + seçili kariyer varsa kariyer oyuncu sayfası (v3 Detay); aksi halde mevcut sayfa (v2 dahil). */
export function playerDetailView(input: { mode: 'career' | 'ut'; v3: boolean; authenticated: boolean; careerId?: number }): 'career' | 'legacy' {
  return input.mode === 'career' && playersView(input) === 'career' ? 'career' : 'legacy'
}

export function playersView({ mode, v3, authenticated, careerId }: { mode: 'career' | 'ut'; v3: boolean; authenticated: boolean; careerId?: number }): 'cards' | 'career' | 'legacy' {
  if (mode === 'ut') {
    return 'cards'
  }
  return v3 && authenticated && careerId !== undefined ? 'career' : 'legacy'
}
