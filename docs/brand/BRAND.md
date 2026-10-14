# FC Assist — marka kılavuzu

Ürün adı **FC Assist** (eski ad "FC Kariyer"/"FCareer"). Slogan: *Kariyerinde yanında · UT'de daima önde*.

## İşaret
Cam altıgen + taktik işareti (X, O ve noktalı ok). Kaynak vektörler: `docs/brand/source/mark-dark.svg`, `mark-light.svg` (Buğra'nın konsept görseli `FC Assist Marka Konseptleri.png` yalnız referans ve og-image ilhamıdır; konsept HTML'indeki camgöbeği/turuncu "FCA" SVG'si kullanılmaz).
Kodda: `src/design/brand/LogoMark.tsx` (tek bileşen, tema token'larıyla koyu/açık), `LogoLockup.tsx` (işaret + "FC" + gradyanlı "Assist", `--font-display`, ana sayfa bağlantısı, `aria-label="FC Assist"`).

## Renk token'ları (`src/design/tokens.css`)
| Token | Koyu | Açık |
|---|---|---|
| `--brand-1` | `#38bdf8` | `#0369a1` |
| `--brand-2` | `#818cf8` | `#4338ca` |
| `--brand-3` | `#c084fc` | `#7e22ce` |
| `--mark-f1 / --mark-f2` (altıgen dolgusu) | `#1e293b / #312e81` | `#e0f2fe / #ede9fe` |
| `--mark-ink` (işaret çizgisi) | `#ffffff` | `#312e81` |

Koyu temada istenen `#6366f1` ve `#a855f7` cam yüzeyin üstünde en kötü aurora rengine karşı 3,6:1 ve 4,1:1 verdi (kural ≥ 4,5:1); bu yüzden `#818cf8` ve `#c084fc` kullanıldı (`src/design/brand/brand.test.ts`). Altıgenin çerçeve gradyanı (`#38bdf8 → #6366f1 → #a855f7`) metin olmadığından iki temada da sabittir.
Marka rengi mod vurgusundan (UT mavi / Kariyer turuncu) bağımsızdır; lockup iki modda aynıdır.

## Boyutlar ve boşluk
- İşaret ≥ 16 px; lockup ≥ 96 px genişlik.
- Boşluk: işaretin çevresinde işaret yüksekliğinin %25'i.
- Üst bar: işaret 32 px; < 640 px yalnız işaret. Giriş/kayıt/doğrulama sayfalarında 56 px lockup, Hakkında'da 64 px.

## Yapılmayacaklar
- EA/EA SPORTS FC görsel dilini taklit etme (kalkan, kart çerçevesi, EA yazı tipi, resmî renkler).
- İşareti yeniden renklendirme, gölge, parıltı, eğme/bozma, çerçeve ekleme.
- Gradyanı açık temada koyu duraklarla kullanma (kontrast).
- İşareti `LogoMark` dışında kopyalama (tek kaynak).

## Çıktılar
`node tools/brand/render-icons.mjs` (mevcut Playwright; yeni paket yok): `public/favicon.svg` (koyu/açık `prefers-color-scheme`), `favicon.ico` (16/32/48), `apple-touch-icon.png` (180), `icons/icon-192.png`, `icon-512.png`, `maskable-512.png` (işaret güvenli bölgede, %56), `og-image.png` (1200×630), `site.webmanifest`. Rapor için 16/32 px önizlemeler `docs/brand/out/`.

## Yasal not (EA markası)
"FC Assist, EA SPORTS veya Electronic Arts ile bağlantılı değildir. EA SPORTS FC, Electronic Arts Inc.'in ticari markasıdır." — footer'da ve `/about` sayfasında (`src/design/brand/legal.ts`).
