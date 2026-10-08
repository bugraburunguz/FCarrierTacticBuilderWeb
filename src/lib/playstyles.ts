export interface PlayStyleInfo {
  name: string
  effect: string
  plus: string
  best: string
}

/** PlayStyles rehberinden (EA FC 27) özetlenmiş açıklamalar; anahtar katalogdaki PlayStyle kimliğidir. */
export const PLAYSTYLES: Record<string, PlayStyleInfo> = {
  Acrobatic: { name: 'Acrobatic', effect: 'Akrobatik vole ve vuruşlarda isabet', plus: 'Çok daha yüksek isabet, özel animasyonlar', best: 'Forvet (vole), defans (akrobatik uzaklaştırma)' },
  AerialFortress: { name: 'Aerial Fortress', effect: 'Savunma kafalarında daha yüksek sıçrama ve fiziksel üstünlük', plus: 'Daha da yüksek sıçrama, çok güçlü hava savunması', best: 'Stoper, ön libero' },
  Anticipate: { name: 'Anticipate', effect: 'Ayakta müdahalede başarı ve topu ayağında durdurma', plus: 'Başarı şansı belirgin artar', best: 'Savunma istatistiği yüksek defans oyuncuları' },
  Block: { name: 'Block', effect: 'Blok mesafesi ve başarısı', plus: 'Daha geniş menzil', best: 'Savunma istatistiği yüksek defans oyuncuları' },
  Bruiser: { name: 'Bruiser', effect: 'Fiziksel müdahalelerde güç', plus: 'Daha da güçlü', best: 'Güç ve agresifliği yüksek oyuncular' },
  ChipShot: { name: 'Chip Shot', effect: 'Aşırtma şutlarda hız ve isabet', plus: 'Çok daha isabetli, daha hızlı', best: 'Bitiricilik ve soğukkanlılığı yüksek forvetler' },
  DeadBall: { name: 'Dead Ball', effect: 'Duran top hızı, kavisi ve isabeti; yörünge çizgisi uzar', plus: 'Üst düzey hız, kavis ve isabet', best: 'Serbest vuruş statı yüksek hücum oyuncuları' },
  Enforcer: { name: 'Enforcer', effect: 'Omuz mücadelesi ve topu korumada etkinlik', plus: 'Çok daha etkili', best: 'Santrafor veya kanat, baskı altında top saklayanlar' },
  FinesseShot: { name: 'Finesse Shot', effect: 'Plase şutta hız, kavis ve isabet', plus: 'Çok daha hızlı, azami kavis, olağanüstü isabet', best: 'Bitiricilik ve falsosu yüksek hücum oyuncuları' },
  FirstTouch: { name: 'First Touch', effect: 'Topu kontrolde hata azalır, sürmeye daha hızlı geçiş', plus: 'En az hata, çok hızlı geçiş', best: 'Orta saha ve forvet, top kontrolü/dribbling yüksek' },
  Gamechanger: { name: 'Game Changer', effect: 'Trivela ve fantezi şutlarda isabet', plus: 'Çok daha isabetli', best: 'Dar açıdan veya yaratıcı bitiren forvet/kanat' },
  IncisivePass: { name: 'Incisive Pass', effect: 'Ara paslar isabetli, kavisli paslarda kavis, hassas paslar hızlı', plus: 'Çok isabetli ara pas, azami kavis, tam hız', best: 'Tüm mevkiler; pas oyunu ve kontra için' },
  Intercept: { name: 'Intercept', effect: 'Top kesmede menzil ve topu elde tutma', plus: 'Daha geniş menzil', best: 'Savunma farkındalığı ve ayakta müdahalesi yüksek defans oyuncuları' },
  Inventive: { name: 'Inventive', effect: 'Fantezi ve trivela paslarda isabet', plus: 'Çok daha isabetli', best: 'On numara, kenar orta saha, dış ayakla orta açan bekler' },
  Jockey: { name: 'Jockey', effect: 'Savunmada sprint jockey hızı ve koşuya geçiş', plus: 'Geçiş çok daha hızlı', best: 'Savunma farkındalığı ve çevikliği yüksek defans oyuncuları' },
  LongBallPass: { name: 'Long Ball Pass', effect: 'Uzun ve açılı ara paslarda isabet, hız, kesilmesi zor', plus: 'Daha isabetli ve daha düz yörünge', best: 'Orta saha; pas statları yüksek olanlar' },
  LongThrow: { name: 'Long Throw', effect: 'Taç atışı mesafesi', plus: 'Azami mesafe', best: 'Her oyuncu, ideali kısa boylular (uzunlar ceza sahasına)' },
  LowDrivenShot: { name: 'Low Driven Shot', effect: 'Alçak sert şutlarda isabet ve hız', plus: 'Çok daha isabetli ve hızlı', best: 'Santrafor ve on numara' },
  PingedPass: { name: 'Pinged Pass', effect: 'Yerden paslar daha hızlı, alıcıya zorluk çıkarmadan', plus: 'Çok daha hızlı', best: 'Orta saha ve kanat; pas statı yüksek' },
  PowerShot: { name: 'Power Shot', effect: 'Güçlü şutları daha hızlı ve sert çeker', plus: 'Çok daha hızlı ve sert', best: 'Şut statı yüksek hücum oyuncuları' },
  PrecisionHeader: { name: 'Precision Header', effect: 'Kafa vuruşunda isabet ve güç', plus: 'Çok daha isabetli', best: 'Santrafor ve on numara (orta ve duran top)' },
  PressProven: { name: 'Press Proven', effect: 'Baskı altında topu korur, jog hızında yakın kontrol', plus: 'Çok yakın kontrol, güçlü rakiplere karşı korumada daha iyi', best: 'Tüm oyuncular; soğukkanlılığı yüksek olanlar' },
  QuickStep: { name: 'Quick Step', effect: 'Patlayıcı sprintte hızlanma', plus: 'Belirgin biçimde daha hızlı hızlanma', best: 'Forvet ve kanat; hızlı ve çevik oyuncular' },
  Rapid: { name: 'Rapid', effect: 'Top sürerken daha yüksek sprint hızı, sprintte hata azalır', plus: 'Daha da yüksek hız, çok az hata', best: 'Kanat ve bekler; dribbling yüksek' },
  Relentless: { name: 'Relentless', effect: 'Yorgunluk kaybı azalır, devre arası toparlanma artar', plus: 'Uzun dönem yorgunluğun özelliklere etkisi çok azalır', best: 'Box-to-box orta saha ve çok koşan roller' },
  SlideTackle: { name: 'Slide Tackle', effect: 'Kayarak müdahalede topu ayağında durdurma', plus: 'Kayma kapsamı çok daha iyi', best: 'Kayarak müdahale ve savunma statı yüksek oyuncular' },
  Technical: { name: 'Technical', effect: 'Kontrollü sprintte hız ve geniş dönüşlerde hassasiyet', plus: 'Daha da yüksek hız ve hassasiyet', best: 'Beceri hareketinden çok dribbling ile geçenler' },
  TikiTaka: { name: 'Tiki Taka', effect: 'İlk dokunuş zor yer pasları isabetli, kısa paslar çok isabetli', plus: 'Daha da isabetli', best: 'Orta saha ve forvet; pas statı yüksek' },
  Trickster: { name: 'Trickster', effect: 'Özel flick beceri hareketleri', plus: 'Daha fazla hareket, yan adımda çok daha çevik', best: 'Kanat ve forvet; dribbling yüksek' },
  WhippedPass: { name: 'Whipped Pass', effect: 'Ortalar isabetli, hızlı ve kavisli', plus: 'Sert sürüş ortaları da çok güçlü', best: 'Kanat ve bekler; pas statı yüksek' },
  FarThrow: { name: 'Far Throw', effect: 'Kaleci el atışında hız ve mesafe', plus: 'Daha hızlı ve uzak', best: 'Kaleci (kontra başlatmak için)' },
  Footwork: { name: 'Footwork', effect: 'Ayakla kurtarışlar daha hızlı ve geniş menzilli', plus: 'Daha da geniş menzil', best: 'Kaleci (birebirde refleks de artar)' },
  CrossClaimer: { name: 'Cross Claimer', effect: 'Ortalara çıkışta hız ve top yörüngesi algısı', plus: 'Daha hızlı çıkış, daha güçlü yumruk', best: 'Kaleci' },
  RushOut: { name: 'Rush Out', effect: 'Kalesinden çıkış hızı ve şuta tepki', plus: 'Çok daha hızlı çıkış', best: 'Kaleci (yüksek hatta oynayan takımlarda)' },
  FarReach: { name: 'Far Reach', effect: 'Uçarak kurtarışlarda menzil', plus: 'Daha geniş menzil', best: 'Kaleci (uzaktan şut kurtarma)' },
  Deflector: { name: 'Deflector', effect: 'Şutu güvenli bölgeye çevirme', plus: 'Gerekirse boştaki takım arkadaşına yönlendirir', best: 'Kaleci (sert şutlarda dönen toplar azalır)' },
}

/**
 * Topluluk rehberinden gelen stat eşikleri. Oyun bu eşikleri açıklamaz; "tune" etiketli referanstır.
 * `plus` düzeyi zaten varsa ipucu gösterilmez.
 */
export interface TriggerHint {
  playstyle: string
  needs: { attr: string; min: number }[]
}

export const TRIGGER_HINTS: TriggerHint[] = [
  { playstyle: 'LongBallPass', needs: [{ attr: 'LongPassing', min: 85 }, { attr: 'Vision', min: 83 }] },
  { playstyle: 'FinesseShot', needs: [{ attr: 'Finishing', min: 85 }, { attr: 'Curve', min: 82 }] },
]

export type TriggerState = 'met' | 'close' | 'far'

export interface TriggerResult {
  playstyle: string
  state: TriggerState
  missing: { attr: string; min: number; value: number }[]
}

const CLOSE_GAP = 3

export function triggerResults(attrs: Record<string, number>, playstyles: Record<string, number>): TriggerResult[] {
  return TRIGGER_HINTS.filter((hint) => (playstyles[hint.playstyle] ?? 0) < 2).map((hint) => {
    const missing = hint.needs
      .map((n) => ({ attr: n.attr, min: n.min, value: attrs[n.attr] ?? 0 }))
      .filter((n) => n.value < n.min)
    const state: TriggerState = missing.length === 0 ? 'met' : missing.every((m) => m.min - m.value <= CLOSE_GAP) ? 'close' : 'far'
    return { playstyle: hint.playstyle, state, missing }
  })
}
