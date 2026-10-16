# DEPLOY-01 — Railway'e çıkış hazırlığı (rapor)

Runbook: backend repo `docs/deploy/RAILWAY.md` (sıralı adımlar, servis başına ayar ve değişken tablosu, doğrulama, geri dönüş, kaynaklar).
Railway hesabına, paneline, CLI'ına erişilmedi. Railway iddiaları docs.railway.com'dan, erişim tarihi 16.10.2026.

## Sapma: Config as Code yeni serviste kullanılamıyor

İstenen `railway.json`/`railway.toml` yazılmadı. Doküman: "Config as Code is deprecated", "New services cannot opt into Config as Code", mevcut dosyalar 2026-12-01'e kadar ([config-as-code](https://docs.railway.com/config-as-code)). Yerini alan Infrastructure as Code (`.railway/railway.ts`, CLI `railway config plan/apply`) referansında Dockerfile yolu, watch paths, restart policy yok; dosyada olmayan değişkenlerin akıbeti yazmıyor ([IaC reference](https://docs.railway.com/infrastructure-as-code/reference)). Doğrulanamayan bir IaC dosyası panel değerlerini ezebileceği için yazmadım; ayarlar runbook'ta servis başına tablo (Root Directory, Dockerfile, healthcheck, restart, watch paths, bölge, Wait for CI). İstersen IaC'ye geçiş ayrı görev.

## Mimari kararlar

| Karar | Dayanak |
|---|---|
| Yalnız web'e public domain; backend, ml, Postgres, Redis private | Servisler domainsiz gelir ([domains](https://docs.railway.com/networking/domains/working-with-domains)); veritabanları "private by default" ([postgres](https://docs.railway.com/databases/postgresql)). Domainsiz servisin hiç trafik almadığı açık değil → duman testi `--backend-public` ölçer |
| web nginx `/api` → `BACKEND_URL` = `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}` | `SERVİS.railway.internal`, örnekte port açık ([private networking](https://docs.railway.com/networking/private-networking)) |
| IPv4/IPv6: yeni ortam çift yığın | "both internal IPv4 and IPv6" (16.10.2025 sonrası ortamlar) ([how it works](https://docs.railway.com/networking/private-networking/how-it-works)) |
| Spring joker adres (değişiklik yok), uvicorn `0.0.0.0` (env `ML_BIND_HOST`), nginx `listen PORT` + `[::]:PORT` | Yerelde ölçüldü: backend `[::1]` ve `127.0.0.1` 200; **uvicorn `::` yalnız IPv6 dinliyor** (IPv4 bağlantı reddedildi) → varsayılan yapılmadı. Railway'in framework'e özel rehberi yok |
| nginx resolver resolv.conf'tan (`NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1`), değişkenli `proxy_pass` | Railway DNS adresi dokümanda yok; resmi nginx imajının betiği IPv6'yı köşeli parantezle verir (yerelde denendi) |
| PORT: backend `${PORT:${SERVER_PORT:8080}}`, ml `$PORT` (varsayılan 8000), nginx envsubst şablonu (`listen ${PORT}`) | PORT enjekte edilir, domain hedef portu algılanır ([troubleshooting](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond)); private servislerde değer değişken olarak sabitlenir |
| DB: `PG*` değişkenlerinden JDBC (`DATABASE_URL` JDBC değil); Redis `REDIS_URL` | Değişken listeleri ([postgres](https://docs.railway.com/databases/postgresql), [redis](https://docs.railway.com/databases/redis)); compose değişkenleri öncelikli (`RailwayConfigResolutionTest`) |
| Edge `X-Real-IP`; web `TRUST_EDGE_REAL_IP=1` (yerel 0) | [specs & limits](https://docs.railway.com/networking/public-networking/specs-and-limits); ezme davranışı yazmıyor → duman testi kesinleştirir |
| Wait for CI | "Wait for CI" ayarı, iş akışında `push` tetikleyicisi şart ([github autodeploys](https://docs.railway.com/deployments/github-autodeploys)); iki repoda mevcut |

## 0. PROD-PREP kalanları

- **a) Gizlilik metni:** `legal/gizlilik-aydinlatma-taslak.md` (16.10 16:14) repo kopyasıyla **bayt bayt aynı** (yorum bloğu ve sürüm satırındaki yer tutucu dışında). Değişecek bir şey çıkmadı; güncellemeyi başka dosyaya kaydetmiş olabilir misin? Tarih/sürüm sabiti runbook 12. adımda.
- **b) nginx erişim logu:** `fc_masked` biçimi — IPv4 son oktet `0`, IPv6 ilk 48 bit (`2001:db8:abcd::`), `::ffff:a.b.c.0`; istemci yolu **sorgu dizesiz** (doğrulama bağlantısındaki token loga düşmüyordu, artık düşmüyor), referer/user-agent yok. Test `scripts/deploy/nginx.test.mjs` (gerçek nginx:1.27-alpine, 3 test; CI adımı).
- **c) Silinen hesabın JWT'si:** `JwtAuthenticationFilter` kullanıcı yoksa kimlik doğrulamaz → korumalı uçta 401 (`AccountDeletionIntegrationTest`, önce 404 ile kırmızı). Bedeli istek başına bir birincil anahtar sorgusu (`existsById`).

### Aydınlatma metni iddiaları — PROD-PREP tablosuna göre değişenler

| # | İddia | Yeni durum |
|---|---|---|
| 8 | IP sayaçları ≤ 24 sa; barındırıcı logları sınırlı süre | Uygulama sayaçları aynı (60 sn / 15 dk / 24 sa). nginx logu artık IP'yi maskeli yazıyor; Railway log saklama Hobby 7 gün, Pro 30 gün ([logs](https://docs.railway.com/observability/logs)) → "sınırlı süre" tutuyor |
| 12 | Çıkış / şifre değişiminde oturumlar geçersiz | Hesap silmede açık JWT artık reddediliyor. Çıkış hâlâ yalnız o cihaz; çıkış ve şifre değişimi sonrası JWT ≤ 15 dk geçerli (**kısmen**, değişmedi) |
| 15 | Yedeklerdeki kopyalar en geç 30 gün | Railway: günlük 6 gün, haftalık 27 gün, **aylık 89 gün** ([backups](https://docs.railway.com/volumes/backups)). Yalnız günlük + haftalık açılırsa tutar; runbook 11. adım aylığı kapalı tutuyor. PITR penceresi doğrulanmadı |
| 6 (aktarım) | Railway sunucuları AB (Hollanda) | Bölge EU West Metal Amsterdam `europe-west4-drams3a` ([regions](https://docs.railway.com/deployments/regions)); her servis + volume'da seçilmeli |

Diğer satırlar (3, 4, 5, 6, 16 kısmen; 1, 2, 7, 9, 10, 11, 13, 14, 17 tutuyor) PROD-PREP tablosundaki gibi; kod değişmedi.

## 3. ML modelleri (karar bekliyor, uygulanmadı)

- İki repo da GitHub'da **public** (`gh repo view`).
- `ml-service/models`: `potential.json` 3,4 MB + `meta.json` 1 KB (değer modeli `value.json` yok). XGBoost potansiyel modeli, FC27 oyuncu reytinglerinden (EA verisi) eğitilmiş; kişisel veri yok. `.gitignore`'da.
- Kullanım: yalnız yönetici `POST /api/v1/admin/ml/valuations` değerleme koşusu (`MlValuationService`); sonuçlar `player_valuation`'da ve taşımayla gelir. **Kullanıcı akışı çalışma zamanında modele ihtiyaç duymaz**; modelsiz ml `/health` 200 (`model_loaded:false`), tahmin 503.
- `data/fc27-dump` (13 MB) çalışma zamanında **gerekmez**: yalnız `tools/` eğitim betikleri kullanıyor.

| Seçenek | Artı | Eksi |
|---|---|---|
| **A. Şimdilik ml'yi dağıtma** (öneri) | Maliyet ve yüzey yok; beta'da yeniden değerleme gerekmiyor | Değerleme gerekince eklenir; backend'de `ML_BASE_URL` boşa düşer (yalnız yönetici ucu etkilenir) |
| B. Backend repoyu private yap, modeli commit et | En basit; imaja girer | Repo görünürlüğü değişir; Railway'in private repo erişimi GitHub uygulaması izniyle **[doğrulanmadı]** |
| C. Public repoya commit | Hiç altyapı yok | EA verisinden türetilmiş model herkese açık indirilebilir (DATA_POLICY ile çelişebilir) |
| D. Railway volume (`/srv/models`), bir kez yükle | Repo değişmez | Volume'a dosya yükleme yolu (CLI ssh vb.) **[doğrulanmadı]**; volume'lu serviste bölge değişikliği kesintili |
| E. Build sırasında private kaynaktan indir (ARG token) | Repo değişmez | Build ARG'ları imaj katmanlarında görünebilir; Railway build secret desteği **[doğrulanmadı]** |

## 4. Veri taşıma

`scripts/deploy/restore-to-railway.sh`: hedef yalnız `TARGET_DATABASE_URL` env'den (Docker'a `-e AD` ile, değer komut satırına girmez), hedefte tablo varsa durur, `pg_dump -Fc` (postgres:16) → `../backups`, `pg_restore --no-owner --no-privileges --single-transaction`, sonda 54 tablonun satır sayısı karşılaştırması. **Yerel deneme** (geçici boş postgres:16 hedef): 54 tablo, 306.973 satır kaynak = hedef; ikinci koşuda "Hedef boş değil" ile yazmadan durdu. Not: deneme `../backups/railway_migrate_20261016-162643.dump` bıraktı (yerel veri kopyası; silmek senin kararın).

## 5–7. Gizli değerler, CI, yedek

- JWT_SECRET / ML_SHARED_SECRET / ADMIN_KEY: runbook'ta `openssl rand … | pbcopy` (ekrana basmadan), Railway'de sealed. Hiçbir dosyaya yazılmadı.
- CI: iki repoda zaten var (Backend Test: mvn test + ml pytest; Web CI: lint + test + build); web CI'ya nginx testi eklendi. Wait for CI runbook 3. adım.
- **Bulgu: Backend Test GitHub'da en az 6 commit'tir kırmızıydı** (yerelde yeşil; Linux dosya sırası farklı). Wait for CI açılınca hiçbir backend dağıtımı geçmezdi. CI sırası yerelde yeniden üretildi ve iki test düzeltildi (üretim kodu değişmedi):
  - `UtItemBaseSyncIntegrationTest`: `KnowledgeBaseIntegrationTest` katalog kartına fiyat yazıp bırakıyordu → artık kendi fiyat satırlarını temizliyor.
  - `ApiFlowIntegrationTest.lineup…`: kariyer yolu v3; seviye normları başka testten dolunca v1'e özgü `badge` yerine `fitLabel` dönüyor → iki etiket de kabul.
  - Web CI: nginx testi Linux'ta geçici dizin izni yüzünden 500 alıyordu → düzeltildi, `main` yeşil.
- Yedek: runbook 11. adım (günlük + haftalık).

## 8. Duman testi

`scripts/deploy/smoke.mjs <url> [--backend-public <url>] [--beta true|false]` (web repo): başlıklar + CSP, /privacy, /about, `config/app` beta, oturumsuz `/me` 401, web adresinde actuator JSON yok, backend public adresinden uygulama yanıtı yok, sahte `X-Real-IP` + `X-Forwarded-For` ile 11 girişte 429. Kayıt/e-posta yapmaz.

**Yerel sonuç** (tam compose yığını yeniden kurulup): `node scripts/deploy/smoke.mjs http://localhost:8081 --beta false --backend-public http://localhost:8080` → **7/7 geçti** (11. denemede 429, backend 8080 bağlantı yok). Web logu maskeli: `172.217.20.0 … "POST /api/v1/auth/login" 429`.

## 10. Testler

- Backend: 604 test (5 atlandı) normal ve ters sırada yeşil.
- Web: 1083 test, lint 0 hata, build yeşil; nginx 3 test.
- Kırmızı önce: 0c (404 → 401), Railway yml çözümlemesi (2 test), nginx (şablon yokken 3 kırmızı).

## Doğrulanmadı listesi

Runbook sonundaki 13 madde: domainsiz servise public trafik, edge'in X-Real-IP/XFF ezmesi, private DNS adresi, Railway'e özel IPv6 rehberi, private URL'de port zorunluluğu, Postgres sürümü ve önerilen değişken, watch paths kökü, panel restart alan adları, shared + sealed, TCP proxy silinince DATABASE_PUBLIC_URL, yedek planları/çelişen saklama süreleri/PITR, IaC değişken davranışı, rollback'te Flyway. Ek: GitHub'dan oluşturulan servisin ilk dağıtımı erteleyip erteleyemediği; ML seçenekleri B, D, E'nin Railway tarafı.
