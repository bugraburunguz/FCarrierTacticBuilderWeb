# CLAUDE.md — FCareer Web (FCarrierTacticBuilderWeb)

React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query. Backend: `/api/v1` (FCarrierTacticBuilderBackend).
Tasarım sistemi kuralları: `docs/review/02_DESIGN_SYSTEM_REDESIGN.md` (varsa önce oku).

## Kurallar
- Renk/ölçü için yalnız semantik token (`bg-panel`, `text-sub`, `border-line` ...). Yeni kodda Tailwind
  `emerald/teal/slate/sky` sınıfları ve hex yok (kart tasarım config'i hariç).
- Emoji ile durum gösterme yok; `FitBadge`, `ChemDiamonds`, ikon seti kullan.
- Oyuncu kartı yalnız `components/card/PlayerCard` ile; saha yalnız `components/pitch/Pitch` ile.
- Oyun kuralları (`ut-core`) backend'in `GET /ut/rules` config'inden; sabit gömme yok.
- Büyük kullanıcı verisi (kulüp kartları, capture) IndexedDB'de; localStorage yalnız küçük tercih.
- Ağır hesap (SBC çözücü, delta önizleme) Web Worker'da.
- Mutlak URL yok: `import.meta.env.BASE_URL` / `<Link>` (GitHub Pages alt yolu).
- Her PR: `npm test`, `npm run lint`, `npm run build` yeşil; UI değişikliğinde Playwright görsel snapshot.
- Kullanıcıya görünen metin Türkçe, kısa; açıklama paragrafı yerine `HelpPopover`.
