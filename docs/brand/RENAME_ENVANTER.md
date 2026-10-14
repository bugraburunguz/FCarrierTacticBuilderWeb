# "FC Kariyer" / "FCareer" → "FC Assist": envanter

**Değişti**
| Yer | Not |
|---|---|
| `index.html` `<title>`, meta description, og:*, manifest, ikonlar | `FC Assist — Taktik Zekâ` |
| `src/design/components/AppShell.tsx` üst bar | `LogoLockup` (< 640 px yalnız işaret) |
| `src/components/Layout.tsx` (eski kabuk) | metin "FC Assist" |
| Giriş / kayıt / e-posta doğrulama sayfaları | 56 px lockup |
| Footer + yeni `/about` sayfası | yasal not |
| `src/api/client.ts` konsol uyarısı, `ExtensionSync.tsx` hata metni (+ test) | `[FC Assist]`, "FC Assist uzantısı" |
| Live Editor Lua penceresi "FC Assist dışa aktarım bitti" (backend `tools/live-editor` ve web `public/`; `leExport.ts`, `LeExportScriptTest`) | özet (`leScript.hash.json`) yenilendi |
| Backend `SmtpVerificationMailer` e-posta konusu | "FC Assist — e-postanı doğrula" |
| Tüm `*.md` dokümanlar (README, CLAUDE.md, docs/review, docs/spec, DATA_POLICY, standart) | ürün adı olarak "FC Kariyer"/"FCareer" (26 dosya) |

**Bilerek kaldı (neden)**
| Yer | Neden |
|---|---|
| `localStorage` / `sessionStorage` anahtarları (`fc.*`), IndexedDB adı `fcareer`, `BroadcastChannel('fcareer-store')` | kullanıcı tercihleri ve büyük veri (kulüp kartları) kaybolmasın |
| Çerez adları, JWT issuer, Redis anahtar önekleri (`fc:ratelimit:*`) | oturumlar ve sayaçlar geçerli kalsın |
| API yolları `/api/v1/…` | sözleşme |
| Java paketi `com.fcareer.*`, `pom.xml` artifact, repo adları (`FCarrierTacticBuilder*`), docker servis/proje adı, DB adı/kullanıcısı `fcareer` | altyapı kimliği; yeniden adlandırma veri/dağıtım riski |
| `IngestionProperties.userAgent = "FCareerIngestion/1.0"` | EA ratings sitesine giden ağ kimliği; ürün adı değil, değişmesi dış davranışı etkiler |
| Dosya adı `docs/fcareer-standard.md`, `docs/review/07_CLAUDE_MD_FCAREER.md` | bağlantılar (içerik başlığı değişti) |
| `fcareer-captures.json`, `FCAREER_*` ortam değişkenleri, `fcareer.*` yapılandırma anahtarları | yapılandırma sözleşmesi |
| Kök dizindeki Chrome uzantısı (`extension/`, repo dışı) | görünen adı ayrı pakette; **yapılacak:** uzantı manifest adı "FC Assist" yapılmalı |
| `docs/review/v2/data/*.py` açıklama satırları | arşiv/referans kodu |
| Geçmiş commit mesajları ve progress kayıtlarındaki eski adlar | tarihçe |
