# CLAUDE.md — FC Assist Web (FCarrierTacticBuilderWeb)

React 19 + TypeScript + Vite + Tailwind v4 + TanStack Query. Backend: `/api/v1` (FCarrierTacticBuilderBackend).
Tasarım dili ve token'lar: `docs/review/v2/11_GLASSMORPHISM_TASARIM_V3.md` (tek kaynak). `docs/review/02_DESIGN_SYSTEM_REDESIGN.md` tarihsel; 11 ile çelişirse 11 kazanır.

## Kurallar
- Renk/ölçü için yalnız semantik token (`text-ink`, `text-ink-2`, `glass-1..3` ...; tanımlar `src/design/tokens.css`). Yeni kodda Tailwind
  `emerald/teal/slate/sky` sınıfları ve hex yok (kart tasarım config'i hariç).
- Emoji ile durum gösterme yok; `FitBadge`, `ChemDiamonds`, ikon seti kullan.
- Oyuncu kartı yalnız `components/card/PlayerCard` ile; saha yalnız `components/pitch/Pitch` ile.
- Oyun kuralları (`ut-core`) backend'in `GET /ut/rules` config'inden; sabit gömme yok.
- Büyük kullanıcı verisi (kulüp kartları, capture) IndexedDB'de; localStorage yalnız küçük tercih.
- Ağır hesap (SBC çözücü, delta önizleme) Web Worker'da.
- Mutlak URL yok: `import.meta.env.BASE_URL` / `<Link>` (GitHub Pages alt yolu).
- Her PR: `npm test`, `npm run lint`, `npm run build` yeşil; UI değişikliğinde `scripts/*-shots.mjs` ile ekran görüntüsü (otomatik görsel snapshot karşılaştırması yok).
- Kullanıcıya görünen metin Türkçe, kısa; açıklama paragrafı yerine `HelpPopover`.

## Çalışma kuralları
- Dosya düzenlemeleri Edit aracıyla yapılır; `sed` veya heredoc ile kaynak dosya düzenlenmez.
- Önce kırmızı test, sonra kod.
- Her task sonunda: testler yeşil + push + progress güncellemesi.
- Secret'lar commit'e, loga, rapora, dokümana girmez; `.env` okunmaz.
- Veri silme protokolü: dry-run → git dışında yedek (`../backups`) → tek transaction → kullanıcı onayı.
- Ortam: macOS (Apple Silicon, arm64). Proje kökü `/Users/user/Desktop/FCarrierTacticBuilder`
  (backend `main`, web `v3`, yedekler `backups/` git dışı). Node 22 gerekir (CI ve Dockerfile ile aynı);
  Node 20'de vitest başlamaz (`markAsUncloneable is not a function`).

## Tasarım araçları
Kurulu: Playwright MCP (`.mcp.json`, `@playwright/mcp@0.0.83`, yalnız `localhost:8081`/`127.0.0.1:8081`) ve Emil Kowalski'nin `emil-design-eng` skill'i (`.claude/skills/emil-design-eng/`, `emilkowalski/skills@2d22863`, MIT). Impeccable, Taste ve Figma MCP **kurulu değil** (Impeccable: yerel ikili çalıştıran/hook yazan/yerel sunucu açan bir skill; kurulum kuralına takıldı).

**Öncelik:** Tasarım dili ve token'lar için tek kaynak `docs/review/v2/11_GLASSMORPHISM_TASARIM_V3.md`, yerleşimler için `docs/review/v2/08_TASARIM_GORUNUM.md` (§14-16 dahil). Skill önerileri bunlarla çelişirse dokümanlar kazanır. Skill'ler yeni renk, font ya da üslup getiremez; yeni değer uydurulmaz.

**Animasyon (emil-design-eng ve her animasyon):**
- Süre ≤ 240 ms (panel/sheet ≤ 300 ms).
- Yalnız `transform` ve `opacity` animasyonlanır.
- `prefers-reduced-motion`'da animasyon yok.
- `backdrop-filter` animasyonlanmaz (skill'in "blur ile maskele" önerisi geçersiz).
- Liste/ızgara öğelerinde stagger ≤ 30 ms ve en fazla 8 öğe (skill'in 30-80 ms önerisi geçersiz).
- Skill'in "ilk çağrıda yalnız şu cümleyi yaz" yönergesi bu projede uygulanmaz; doğrudan göreve geç.

**Impeccable (kurulursa):** yalnız denetim ve cila (boşluk ritmi, tipografi ölçeği, kontrast, hizalama). Bulgular 11 §3 token'larıyla uygulanır, yeni değer uydurulmaz.

**Playwright:** Yalnız `localhost`/`127.0.0.1`; başka siteye gitme, giriş formlarına gerçek şifre yazma (test hesabı yalnız yerel). Her UI görevinin sonunda şu döngü:
1. Stack'i aç (http://localhost:8081).
2. Değişen sayfanın 375/768/1280 genişlikte, koyu ve açık temada, UT ve kariyer modunda ekran görüntüsünü al; `docs/review/v2/screens/<görev-id>/` altına koy.
3. Sayfada axe çalıştır.
4. Konsol hatası ve ağ 4xx/5xx var mı bak.
5. Sorunları düzelt, döngüyü tekrarla. 11 §8 kapılarının hepsi yeşil olunca görev biter.
6. Ekran görüntülerini commit'le, PR açıklamasına ekle.
