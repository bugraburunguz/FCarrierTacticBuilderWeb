# PROD-PREP — prod öncesi hazırlık (rapor)

Kararlar: ücretsiz beta (A); Railway, EU West (Amsterdam); e-posta Brevo; adres `*.up.railway.app`; iletişim adresi aydınlatma metnindekiyle aynı (`CONTACT_EMAIL`, /about).

## Özet

| Madde | Durum |
|---|---|
| 0 SBC yemi kuralı | Tek yerde `sbcFodder` + `SBC_FODDER_RULES` (candidates.ts); HelpPopover dört satırı listeler; test önce kırmızı |
| 1 v3 varsayılan | Prod build yalnız v3 (`v2SwitchEnabled`: `VITE_UI_V2=on` ya da geliştirme); v2 kodu duruyor |
| 2 Ücretsiz beta | `FCAREER_FREE_BETA` (kodda false) → herkese PREMIUM hakkı; günlük kredi 30'a tamamlanır (Europe/Istanbul, birikmez); arayüz "Beta: tüm özellikler ücretsiz"; ödeme kodu kapalı duruyor |
| 3 Gizlilik | `/privacy` v3 metinden (`docs/legal/gizlilik-aydinlatma.md`, sürüm/tarih `privacyVersion.ts`); kayıtta zorunlu işaretsiz kutu; V38 onay zamanı + sürümü; tek seferlik bant; altbilgide Gizlilik |
| 4 Hesap silme | `POST /me/delete` (şifre + e-posta yazma onayı, son admin korunur, tek transaction); katkılar anonim (V39) |
| 5 Temizlik | Onaylı; 101 ve 107 silindi, katkılar kullanıcı 1'e aktarıldı |
| 6 Prod ayarları | IP (X-Real-IP + `FCAREER_TRUST_PROXY`), `application-prod.yml`, `ProdConfigGuard`, nginx güvenlik başlıkları, `.env.example`, uzantı prod paketi |
| 7 /about | v3: bağımsızlık, beta, iletişim, Gizlilik |
| 8 Dal | v3 → main merge commit (onaylı yöntem) |
| 9 Kapılar | aşağıda |

## 3. Aydınlatma metni: iddia → kod kanıtı

**Metin değiştirilmedi** (yalnız `<!-- -->` bloğu çıkarıldı, sürüm/tarih satırı `{{SURUM}}`/`{{TARIH}}` yer tutucusu oldu). Tutmayan ya da kısmen tutan iddialar kararını bekliyor.

| # | İddia | Sonuç | Kanıt |
|---|---|---|---|
| 1 | EA kimlik bilgisi (şifre, oturum, çerez) istenmez/saklanmaz | Tutuyor | `UtCaptureModels.java:21` yakalama yalnız url/status/ts/body; `inject.js:72-111` yalnız yanıt gövdesi; auth/sid/nucleus URL'leri iki tarafta da reddedilir (`UtCaptureService.java:59,195-198`, `rules.js`, `harCapture.ts:18`) |
| 2 | Şifre yalnız tek yönlü özet | Tutuyor | `SecurityConfig.java:89` BCrypt; `AuthService` register/changePassword `encode`; loglarda şifre yok (ProdProfileIntegrationTest log taraması) |
| 3 | Hesap bilgileri: e-posta, oluşturma tarihi, doğrulama, rol, kredi, aydınlatma onayı | **Kısmen** | `app_user` ayrıca `subscription_type`, `daily_credit_limit`, `last_credit_refresh` tutuyor; kullanıcıya bağlı `credit_transaction`, `subscription`, `email_verification_token` (özet), `contributor`/`contributor_audit` var; access JWT e-postayı claim olarak taşıyor (`JwtService.java:45`). IP/user-agent/son giriş sütunu yok |
| 4 | Oturum anahtarları tarayıcıda + sunucuda "kısa süreli" | **Kısmen** | Tarayıcı `fc.access`/`fc.refresh` (localStorage). Sunucu yalnız refresh özetini Redis'te **14 gün** tutar (`application.yml` refresh-ttl), kullanılmış özet işareti +14 gün (`RedisRefreshTokenStore.java:48`). "Kısa süreli" 14 güne kadar demek |
| 5 | "Kulübümü senkronla" verisi yalnız tarayıcıda, sunucuya kaydedilmez | **Kısmen** | `/ut/capture` kart/coin/fiyatı saklamaz, log yalnız sayı (`UtCaptureService.java:176`). **İstisna:** aynı işlem aktif katkıcıda SBC yanıtı varsa `ea_id_suggestion` (lig/ülke EA kimliği ↔ ad) satırına kullanıcı kimliğini oy olarak yazar (`UtCaptureService.java:548-549` → `EaIdRepository.java:56-71`). Uzantı ham yakalamayı (kişisel modda satıcı adları ve coin dahil) `chrome.storage.local`'da 100 MB'a kadar tutar (kullanıcının kendi tarayıcısı) |
| 6 | Katkılar hesapla ilişkili; fiyat gözlemindeki satıcı/alıcı adları gönderilmeden silinir | **Kısmen** | `price_obs` yalnız item/platform/zaman/tür/değer/katkıcı (`V13:118-125`) — sunucuda satıcı/alıcı yok. İstemci silmesi yalnız **katkı modunda** (`rules.js:39-55`, `harCapture.ts:96-104`); gövde JSON değilse metin aynen gider (`rules.js:52-54`); sunucu ayrıca silmez ama satıcı alanını hiç okumaz (`MarketPrice`, `UtCaptureModels.java:48`) |
| 7 | SBC oyları saklanır | Tutuyor | `sbc_vote(user_id, set_id, vote)` (`V12`) |
| 8 | IP hız sınırında; sayaçlar ≤ 24 saat | **Kısmen** | Redis: genel/auth 60 sn (`RateLimitFilter`), kayıt 24 sa (`RegistrationLimiter`), yönetici anahtarı denemesi 15 dk (`AdminKeyFilter`); IP DB'ye ve uygulama loguna yazılmaz. **Ancak** web nginx'in varsayılan access log'u her isteğin IP'sini stdout'a yazar (Railway log saklama süresi; 24 saat sınırı yok). Metnin "barındırma sağlayıcısının teknik kayıtları" satırı bunu kapsıyor olabilir; karar senin |
| 9 | Çerez yok; reklam/analiz takibi yok | Tutuyor | `document.cookie`/çerez kitaplığı yok; backend stateless, Set-Cookie yok; analitik betik yok; fontlar `@fontsource` ile kendi sunucumuzdan (Google Fonts isteği yok). Not: localStorage + IndexedDB kullanılıyor (metin "yerel depolama" diyor) |
| 10 | Ödeme bilgisi toplanmaz | Tutuyor | `BillingController` gövdesiz subscribe; kart alanı yok; prod'da stub kapalı (`application-prod.yml`, `ProdConfigGuard`) |
| 11 | Brevo'ya yalnız e-posta adresi ve içerik | Tutuyor | `SmtpVerificationMailer.java:24-31` from/to/konu/bağlantı |
| 12 | Çıkışta ve şifre değişiminde oturumlar geçersiz | **Kısmen** | Şifre değişimi tüm refresh + bağlantı anahtarlarını iptal eder. **Çıkış yalnız o cihazın** refresh anahtarını (+ uzantı bağlantı anahtarlarını) iptal eder; diğer cihazlar açık kalır. Verilmiş access JWT'ler iki durumda da süresi dolana kadar (≤ 15 dk) geçerli (denylist yok). Hesap silmede de aynı: `/me` 404 döner, yazma işlemleri FK ile başarısız olur |
| 13 | Veriler EA ile paylaşılmaz | Tutuyor (not) | Kullanıcı verisi EA'ya gitmez. Backend katalog için `www.ea.com` herkese açık reyting sayfalarını çeker (`EaSiteProvider.java:81,112`; kullanıcı verisi içermez) |
| 14 | Uzantı yalnız açtığın Web App oturumunun yanıtlarını okur, EA'ya istek atmaz, şifre saklamaz | Tutuyor (güvenlik bulgusu) | host_permissions yalnız Web App sayfaları; `res.clone()` ile salt okuma. **Bulgu:** geliştirme manifestinde `externally_connectable: https://*.github.io/*` → herhangi bir GitHub Pages sitesi `FC_PULL` ile yakalamaları okuyabilir, `FC_LINK` ile yükleme adresini değiştirebilir (`background.js:140-163`). Prod paketinde yok (6f) |
| 15 | Hesap silme derhal; katkılar anonimleşir | Artık tutuyor | Madde 4 (aşağıda). "Yedeklerde ≤ 30 gün" kodla doğrulanamaz: Railway yedek saklama ayarı DEPLOY-01'de |
| 16 | 16 yaş sınırı | Kodda yok | Kayıtta yaş sorusu/kontrolü yok (metin "16 yaşından küçüksen hesap oluşturma" diyor; yalnız beyan) |
| 17 | (ek) Loglarda e-posta/şifre/token yok | Tutuyor | Tüm `log.*` çağrıları yalnız userId/yol; `ProdProfileIntegrationTest` kayıt/giriş/yenileme/silme akışında log çıktısını tarar. Teorik risk: `GlobalExceptionAdvice` 400 yanıtında `ex.getMessage()` loglar (JSON ayrıştırma hatası girdi parçası içerebilir) |

## 4. Hesap silme

- Akış: Profil → **Hesabı sil** → diyalog (mevcut şifre + e-postayı yaz; eşleşmeden düğme kapalı) → `POST /api/v1/me/delete` → yerel oturum temizlenir, ana sayfa.
- Sunucu (`AccountDeletionService`, tek transaction): şifre (bcrypt, yanlışsa 422 `fc.exception.0027`), e-posta eşleşmesi (422 `0028`), son admin (409 `0029`); kariyerler mevcut `CareerService.delete` yolundan; sonra `AccountDeletionRepository`; Redis'te refresh + bağlantı anahtarları iptal. Uç auth hız kovasında (fail-closed).
- **Silinen tablolar** (şemadan üretilen liste; test aynı sorguyla kalıntı arar):
  - Kullanıcıya bağlı: `app_user`, `career`, `user_tactic`, `sbc_vote`, `credit_transaction`, `subscription`, `email_verification_token`, `player_valuation` (IMPORT, `owner_user_id`), `contributor`, `contributor_audit`; `ea_id_suggestion.voters` dizisinden kullanıcı kimliği çıkarılır.
  - Kariyere bağlı (career silinince): `career_import`, `career_player`, `career_player_data`, `career_player_rating`, `career_player_tag`, `career_shortlist`, `career_season_record`, `career_snapshot`, `career_snapshot_player`, `career_team`, `dataset_version`, `base_player` (kariyerde üretilen oyuncular), `user_tactic` (kariyer), `roster_event`, `user_player_state`, `user_save_snapshot` (son üçü CareerService açıkça siler).
- **Anonimleştirilen:** `contrib_event` ve `price_obs` satırları kalır, `contributor_id` NULL olur (V39 NOT NULL'u kaldırır; veri silmez). Konsensüs sayımı NULL'u saymaz; `contributorsOf` NULL'u dışlar.
- Testler (`AccountDeletionIntegrationTest`): yanlış şifre/e-posta/oturumsuz reddedilir ve hiçbir şey silinmez; dolu hesap (kariyer + içe aktarma, etiket, kısa liste, sezon kaydı, oy, taktik, katkıcı + katkılar, EA oyu) silinince şemadaki tüm user/career sütunlarında kalıntı 0, katkılar anonim, refresh ve giriş 401; son admin 409.

## 5. Yerel test verisi temizliği (onaylı)

- Dry-run: yalnız 2 hesap kaldı — 101 ve 107 (kb-import-*). gate-*/q17-* yok (kapı betikleri kendi hesabını siliyor). Kullanıcı 1'e dokunulmadı.
- Yedek: `../backups/prodprep_cleanup_before_20261016-1005.sql` (11 tablo, yalnız veri).
- Tek transaction: katkılar ve EA oyları kullanıcı 1'in katkıcı kaydına (id 2) aktarıldı, sonra iki hesap madde 4'ün adımlarıyla silindi.

| | Önce | Sonra |
|---|---|---|
| app_user | 3 | 1 |
| contributor | 3 | 1 |
| contrib_event (toplam / kullanıcı 1) | 368 / 0 | 368 / 368 |
| price_obs (toplam / kullanıcı 1) | 745 / 0 | 745 / 745 |
| ea_id_suggestion (101/107 oylu) | 120 | 0 (120 satırda oy veren {1}, votes = 1) |
| 101/107 için şemadaki user sütunlarında kalıntı | — | 0 (9 tablo) |

- Not: 282 katkı olayı iki test hesabının birbirini onaylamasıyla CONFIRMED olmuştu; durumları korundu (artık tek katkıcıya ait).
- Redis'te bu iki hesabın süresi dolmamış refresh özetleri olabilir; kullanıcı satırı olmadığı için yenileme 401 döner, 14 günde düşer.
- Scratchpad'deki test hesabı kimlik dosyaları (`kb-session.json`, `kb-session.json.login`) silindi.

## 6a. İstemci IP'si

- **Kaynak:** Railway dokümanı, *Public Networking → Specs & Limits*, Request Headers: "`X-Real-IP` for identifying client's remote IP" (https://docs.railway.com/networking/public-networking/specs-and-limits). Aynı sayfa `X-Forwarded-For`'dan hiç söz etmiyor ve Railway'in gelen `X-Real-IP`'yi **ezip ezmediğini belirtmiyor**.
- **Karar:** tek güvenilen başlık `X-Real-IP`, yalnız `FCAREER_TRUST_PROXY=true` iken (`ClientIp`); `X-Forwarded-For` hiçbir yerde okunmaz (`server.forward-headers-strategy: none`; nginx XFF'yi boşaltır). Geçersiz değer (virgüllü liste, IP olmayan) bağlantı adresine düşer. RateLimitFilter, kayıt sınırı ve yönetici anahtarı sayacı aynı çözümleyiciyi kullanır.
- Zincir: istemci → Railway edge (`X-Real-IP`) → web nginx (`map`: gelen `X-Real-IP` yoksa `$remote_addr`) → backend.
- Testler: `ClientIpTest` (güven kapalıyken başlıklar yok sayılır, açıkken yalnız X-Real-IP, bozuk değer); `RateLimitFilterTest.spoofedForwardingHeadersCannotBypassTheLimit` (güven açık/kapalı, her istekte farklı sahte XFF → 4. istek 429; güven kapalıyken sahte X-Real-IP de 429).
- **Kalan risk (DEPLOY-01'de doğrulanmalı):** edge istemcinin gönderdiği `X-Real-IP`'yi ezmiyorsa sahte başlıkla sınır aşılabilir. Doğrulama: yayına alınca farklı `X-Real-IP` değerleriyle 11 giriş denemesi → 429 gelmeli. Ayrıca backend servisine Railway'de **herkese açık alan adı verilmemeli** (yalnız özel ağ; aksi halde başlık doğrudan gönderilebilir).

## 6b–6f. Prod ayarları

- `application-prod.yml`: CORS yalnız `WEB_BASE_URL`; Actuator yalnız `health`, ayrıntı/bileşen yok; `server.error.include-*` never; e-posta doğrulaması zorunlu; stub kapalı; Swagger kapalı.
- `ProdConfigGuard` (`@Profile("prod")`): MAIL_HOST/USERNAME/PASSWORD, `@localhost` olmayan MAIL_FROM, https WEB_BASE_URL yoksa ya da BILLING_STUB_ENABLED=true ise açılmaz (mesajda yalnız değişken adı).
- E-posta: `AppUserEntity.emailVerified` varsayılanı true kalıyor; prod profilinde kayıtta false (test). Brevo SMTP 587 STARTTLS (`spring.mail.properties` zaten auth + starttls). Testte sahte SMTP (mock `JavaMailSender`): alıcı, gönderici, https doğrulama bağlantısı doğrulandı; gerçek gönderim yok.
- nginx (`nginx-security-headers.conf`, her location'a include): CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY, HSTS 1 yıl. **Google Fonts izni eklenmedi:** fontlar `@fontsource` ile kendi sunucumuzdan geliyor, izin gereksiz yüzey olurdu. Tema betiği satır içinden `public/theme-init.js`'e taşındı (`script-src 'self'`). `style-src 'unsafe-inline'`: Radix çalışma anında `<style>` ekliyor.
- **Yeni / güncellenen env değişkenleri** (`.env.example`, değersiz, açıklamalı): `FCAREER_FREE_BETA`, `FCAREER_DAILY_CREDITS`, `FCAREER_TRUST_PROXY`, `CORS_ALLOWED_ORIGINS`, `SPRING_PROFILES_ACTIVE=prod`, Brevo için `MAIL_HOST`/`MAIL_PORT`/`MAIL_USERNAME`/`MAIL_PASSWORD`/`MAIL_FROM`, `WEB_BASE_URL`, `BILLING_STUB_ENABLED`. Web: `VITE_UI_V2` (yalnız `on` ise prod'da v2 geçişi). docker-compose yerelde `FCAREER_TRUST_PROXY=true` (backend portu yayınlanmıyor).
- Uzantı (git dışı, `../extension`): `node extension/build.mjs --web-origin https://<servis>.up.railway.app` → `extension/dist/`, `externally_connectable` yalnız o köken (localhost ve `*.github.io` yok); backend adresi gömülmez (site `FC_LINK` ile kendi kökünü verir; web ve API aynı köken). Test `extension/build.test.mjs`; README'de "Prod paketi" bölümü.

## 8. Dal

- origin/main'de v3'te olmayan tek commit `2daf2f9 Merge pull request #1 from bugraburunguz/v3` (içerik farkı yok). Onaylanan yöntem: main'e `--no-ff` merge commit, force yok.

## 9. Kapılar

- Ekranlar (`screens/PROD-PREP/`, `gates.json`): Gizlilik, kayıt (onay kutusu), bant (fikstür: `/me` yanıtından `privacyAckVersion` yalnız bu tarayıcıda kaldırıldı), profil, profil hesap silme diyaloğu, /about × 375/768/1280 × koyu/açık = **36 çekim, taşma 0, axe serious/critical 0, konsol/ağ hatası 0 (CSP ihlali dahil), minFont ≥ 11**. Beta etiketi yığın `FCAREER_FREE_BETA=true` ile açılarak gerçek uçtan (başlık çipi, profil). Güvenlik başlıkları sayfa ve API yanıtında doğrulandı.
- Kulübüm regresyonu (madde 0, `screens/PROD-PREP/kulubum/`): **46 çekim 0 sorun**, minFont 11.
- Backend: 602 test (5 atlandı) yeşil; ters sıra (`reversealphabetical`) 602 yeşil. Eski `ApiFlowIntegrationTest` kredi beklentisi 20 → 30'a güncellendi (madde 2'nin onaylı davranış değişikliği).
- Web: 1083 test, lint (0 hata), build yeşil. Uzantı: build 2 + rules 4 test.

## Açık noktalar / kararın

1. Metin iddiaları 3, 4, 5, 6, 8, 12, 16 (yukarıdaki tablo) — metni değiştirmedim.
2. Edge'in `X-Real-IP` davranışı DEPLOY-01'de doğrulanmalı; backend'e herkese açık adres verilmemeli.
3. Geliştirme uzantı manifestindeki `https://*.github.io/*` (GitHub Pages yayını hâlâ kullanılıyorsa daraltılmalı).
4. `PRIVACY_DATE` şimdilik 16 Ekim 2026; yayın günü güncellenmeli (taslak notu 4).
5. Açık oturum JWT'leri (çıkış, şifre değişimi, silme sonrası ≤ 15 dk): denylist eklemek istersen ayrı görev.
6. Süreç notu: `ProdConfigGuard` testi ve sınıfı aynı adımda yazıldı (kırmızı ayrıca görülmedi); nginx.conf Edit yerine Write ile yeniden yazıldı (yapılandırma dosyası).
