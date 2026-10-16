import { describe, expect, it } from 'vitest'
import { PLAYSTYLES, playStyleName } from './playstyles'

// V3-05b-c: PlayStyle adları tek sözlükten, EA'nın resmî (İngilizce) adlarıyla. Türkçe resmî ad bilinmediği için uydurulmaz.
// Anahtarlar: yerel katalogdaki tüm PlayStyle kimlikleri (player_rating.playstyles, 36 anahtar); adlar backend messages.properties `ps.*` ile aynı.
const OFFICIAL: Record<string, string> = {
  Acrobatic: 'Acrobatic', AerialFortress: 'Aerial Fortress', Anticipate: 'Anticipate', Block: 'Block', Bruiser: 'Bruiser',
  ChipShot: 'Chip Shot', CrossClaimer: 'Cross Claimer', DeadBall: 'Dead Ball', Deflector: 'Deflector', Enforcer: 'Enforcer',
  FarReach: 'Far Reach', FarThrow: 'Far Throw', FinesseShot: 'Finesse Shot', FirstTouch: 'First Touch', Footwork: 'Footwork',
  Gamechanger: 'Gamechanger', IncisivePass: 'Incisive Pass', Intercept: 'Intercept', Inventive: 'Inventive', Jockey: 'Jockey',
  LongBallPass: 'Long Ball Pass', LongThrow: 'Long Throw', LowDrivenShot: 'Low Driven Shot', PingedPass: 'Pinged Pass',
  PowerShot: 'Power Shot', PrecisionHeader: 'Precision Header', PressProven: 'Press Proven', QuickStep: 'Quick Step',
  Rapid: 'Rapid', Relentless: 'Relentless', RushOut: 'Rush Out', SlideTackle: 'Slide Tackle', Technical: 'Technical',
  TikiTaka: 'Tiki Taka', Trickster: 'Trickster', WhippedPass: 'Whipped Pass',
}

describe('PlayStyle görünen adları', () => {
  it.each(Object.entries(OFFICIAL))('%s → %s', (id, name) => {
    expect(playStyleName(id)).toBe(name)
    expect(playStyleName(id, 2)).toBe(`${name}+`)
  })

  it('sözlük katalogdaki anahtarların tamamını ve yalnız onları kapsar', () => {
    expect(Object.keys(PLAYSTYLES).sort()).toEqual(Object.keys(OFFICIAL).sort())
  })

  it('bilinmeyen anahtar uydurma adla değil, kimliğiyle gösterilir', () => {
    expect(playStyleName('BrandNewStyle')).toBe('BrandNewStyle')
  })
})
