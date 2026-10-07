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

## GitHub Pages'e yayın

Adres: `https://<kullanici>.github.io/FCarrierTacticBuilderWeb/` (proje sayfası, alt yol).

1. **Bir kerelik repo ayarı:** GitHub > repo > Settings > Pages > Build and deployment > Source = **GitHub Actions** (branch değil). Bu yapılmadan sayfa 404 verir.
2. `main`'e push et. `.github/workflows/deploy-pages.yml` testleri çalıştırır, `dist`'i derler ve yayınlar (Actions sekmesinde "Deploy Pages" yeşil olmalı).
3. **Veri için backend gerekir.** Pages yalnızca statik dosya sunar. Backend'i HTTPS bir adreste yayınla, ardından:
   - Repo > Settings > Secrets and variables > Actions > **Variables** > `API_BASE_URL` = backend adresi (sonda `/` olmadan).
   - Backend'e `CORS_ALLOWED_ORIGINS=https://<kullanici>.github.io` ortam değişkenini ver (virgülle birden çok kaynak olabilir; boşsa çapraz kaynak isteği kapalıdır).
   - Değişkeni ekledikten sonra Actions'tan "Deploy Pages"i yeniden çalıştır.
   API adresi tanımsızken site açılır ama üstte bir uyarı bandı çıkar ve veri yüklenmez.

Yerel deneme: `VITE_BASE=/FCarrierTacticBuilderWeb/ npm run build && VITE_BASE=/FCarrierTacticBuilderWeb/ npx vite preview` (preview de aynı `VITE_BASE` ile başlatılmalı).

Notlar: `VITE_BASE` verilmezse `/` kullanılır (Docker/nginx yayını bu şekilde çalışır). Özel (private) repoda Pages ücretsiz planda çalışmaz; repo public olmalı ya da plan yükseltilmeli.
