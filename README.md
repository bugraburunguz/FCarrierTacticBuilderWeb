# FC Kariyer — Web

React + TypeScript + Vite + Tailwind. Backend: `FCarrierTacticBuilderBackend` (`/api/v1`).

```bash
npm install
npm run dev      # http://localhost:5173, /api -> VITE_BACKEND_URL (varsayılan http://localhost:8080)
npm test         # vitest
npm run build
```

Ekranlar: oyuncu arama/detay, karşılaştırma, taktik kurucu (davranış seçimi, çelişki kilidi, preset/replika), kadro (kariyer + transfer), uyum (SquadFit/IntentFit, zayıf halkalar, riskler), slot önerisi, profil/abonelik.

Notlar
- Potential/değer alanları **model tahminidir**; arayüzde `*` ile işaretlenir.
- Kariyer içe aktarma (PREMIUM) ekranı kasıtlı olarak kapalı: örnek dışa aktarım dosyası gelene kadar şema sabit değil.
- Oturum token'ları `localStorage`'da tutulur; erişilemezse bellek içinde çalışır.
