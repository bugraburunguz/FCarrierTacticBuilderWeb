---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.css"
  - "**/vite.config.*"
---

# Web (React + TypeScript + Vite) kuralları

Projenin kendi CLAUDE.md'si bu dosyayla çelişirse proje kazanır.

## TypeScript
- `tsconfig`'te `strict: true`; `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` açık.
- Tip-only import `import type` ile (`verbatimModuleSyntax`/`isolatedModules` uyumu).
- API yanıt tipleri `src/api/` altında, çağrıyı yapan modülün yanında tanımlanır.
- Bileşen prop'ları için ayrı `interface`/`type`; dışa açılan türler export edilir.

## Bileşen ve hook
- Bileşen dosyası `PascalCase.tsx`; hook `useXxx.ts`; saf mantık `camelCase.ts` ve yanında `*.test.ts`.
- Bir dosyada tek ana bileşen; bileşenin stili yanındaki `.css` ya da Tailwind sınıflarıyla.
- Bileşen içinde iş mantığı ve ağ çağrısı yok: mantık hook'a ya da saf modüle, ağ çağrısı `src/api/` altına.
- Metot/hook/fonksiyon adı fiille başlar (`loadPages`, `buildLayout`); boolean `is`/`has`/`can`/`should`.

## State ve veri çekme
- Sunucu verisi tek yerden (`src/api/client`) ve projenin veri katmanıyla (TanStack Query varsa `useQuery`/`useMutation`) çekilir.
- Sunucudan türetilebilen değer state'e kopyalanmaz.
- Büyük kullanıcı verisi (kart, görsel, capture) IndexedDB'de; localStorage yalnız küçük tercih.
- Ağır hesap Web Worker'da; ana iş parçacığı bloklanmaz.

## URL
- Mutlak URL yok. Kaynaklar `import.meta.env.BASE_URL`, gezinme `<Link>`/router ile.
- API kök yolu `client` modülünde tek yerde; dev'de Vite `server.proxy` kullanılır.

## Token ve tema
- Renk, ölçü, gölge için yalnız projenin token dosyası (`tokens.css`); bileşene hex ya da rastgele px/renk gömülmez.
- Yeni değer gerekiyorsa önce token dosyasına eklenir, sonra kullanılır.
- Koyu ve açık tema birlikte düşünülür; yeni stil iki temada da kontrol edilir.

## Erişilebilirlik
- İkon-only düğmede `aria-label`; görsellerde `alt`.
- Yalnız renkle durum gösterilmez; metin en az 12 px.
- UI işinde sayfada axe çalıştırılır.

## Animasyon
- Süre ≤ 240 ms (panel/sheet ≤ 300 ms).
- Yalnız `transform` ve `opacity` animasyonlanır; `backdrop-filter`, `width/height`, `top/left` animasyonlanmaz.
- `prefers-reduced-motion`'da animasyon yok (CSS medya sorgusu ya da `useReducedMotion`).
- Liste öğelerinde stagger ≤ 30 ms ve en fazla 8 öğe.

## Metin
- Kullanıcıya görünen metin Türkçe ve kısa; uzun açıklama yerine yardım balonu/popover.
- Durum göstermek için emoji yok; ikon seti kullanılır.
- Koda açıklayıcı yorum yazılmaz; gerekçe sohbette ya da PR'da anlatılır.

## Test ve teslim
- Önce kırmızı test, sonra kod (vitest; testler dosyanın yanında).
- Her PR öncesi `npm test`, `npm run build` (`tsc -b && vite build`) ve projede lint betiği varsa `npm run lint` yeşil.
- UI değişikliğinde ekran görüntüsü matrisi işin büyüklüğüne göre seçilir:
  - Küçük düzeltme: 375 + 1280, yalnız koyu.
  - Token ya da tema değişikliği: koyu + açık.
  - Tam matris (375/768/1280 × koyu/açık) yalnız yeni sayfa ya da ortak bileşende.
- Ekran görüntüleri repo dışına (`Claude outputs/screens/<GÖREV-ID>/`) konur, commit'lenmez; PR açıklamasına yol yazılır.
- Node sürümü projenin `engines` alanına uyar; farklı sürümde test koşturulmaz.
