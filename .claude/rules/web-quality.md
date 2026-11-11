---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.css"
  - "**/*.html"
  - "**/vite.config.*"
  - "**/nginx*.conf*"
  - "**/package.json"
---

# Web güvenlik, performans ve erişilebilirlik

`web.md` ile birlikte geçerlidir. Projenin kendi CLAUDE.md'si çelişirse proje kazanır.

## Güvenlik (OWASP)
- Kullanıcıdan ya da sunucudan gelen metin JSX ile basılır; `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`, `new Function` yok.
  HTML basmak şartsa DOMPurify ile temizlenir ve PR'da gerekçe yazılır.
- Kullanıcı verisinden üretilen `href`/`src` yalnız `https:`, `http:` ve `mailto:` şemalarına izin verir; `javascript:` ve `data:` engellenir.
- `target="_blank"` bağlantıda `rel="noopener noreferrer"`.
- Uzun ömürlü token ve refresh token `localStorage`/`sessionStorage`'da tutulmaz; tercih HttpOnly + Secure + SameSite çerez.
  Proje Bearer kullanıyorsa access token bellekte ve kısa ömürlü; mevcut düzen bir görev olmadan değiştirilmez, risk raporda yazılır.
- Çerezle oturum varsa durum değiştiren istek CSRF korumalıdır (SameSite + token ya da özel başlık).
- İstemci yetki kararı vermez; gizlenen düğme yalnız kolaylıktır, yetki sunucuda denetlenir.
- Secret, API anahtarı, iç URL bundle'a girmez: `import.meta.env` içinde yalnız `VITE_` önekli ve herkese açık olabilecek değerler.
- Prod yanıtında CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors` başlıkları vardır; yeni dış kaynak eklenince CSP güncellenir.
- Prod build'de source map herkese açık sunulmaz.
- Yeni bağımlılık eklemeden önce: bakımı süren, yaygın, gerçekten gerekli mi? `npm audit` yüksek/kritik açıkla PR açılmaz.
- Kullanıcı verisi URL query'sine (e-posta, token, kişisel veri) konmaz.

## Performans
- Hedef (75. yüzdelik, mobil): LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
- Rota bazlı kod bölme (`lazy` + `Suspense`); ilk ekranda gerekmeyen ağır modül (grafik, editör, PDF) dinamik `import()` ile.
- Görsellerde `width`/`height` ya da `aspect-ratio` (CLS); ekran dışındakiler `loading="lazy"`, LCP görseli lazy değil.
- Uzun liste (≈200+ satır) sanallaştırılır; olay işleyicisinde 50 ms'yi geçen iş Web Worker'a ya da parçalara bölünür.
- Arama/filtre girişinde istek debounce edilir ya da `useDeferredValue` kullanılır.
- Bundle'a yeni bağımlılık eklenince boyut farkı PR'da yazılır; tek fonksiyon için büyük kütüphane eklenmez.
- Font: `font-display: swap`, yalnız kullanılan ağırlıklar.

## Erişilebilirlik (WCAG 2.2 AA)
- Önce yerel öğe: tıklanan şey `<button>`, gezinen şey `<a href>`/`<Link>`; `div onClick` yok. ARIA yalnız yerel öğe yetmezse.
- Klavye ile her şeye ulaşılır ve kullanılır; odak halkası kaldırılmaz (`outline: none` tek başına yok), `:focus-visible` stillenir.
- Modal/sheet açılınca odak içine taşınır, içinde tutulur, `Esc` kapatır, kapanınca tetikleyen öğeye döner.
- Sabit başlık/alt bar odaklanan öğeyi örtmez.
- Dokunma hedefi en az 24×24 CSS px (mobil öncelikli ekranda 44×44).
- Kontrast: gövde metni 4.5:1, büyük metin ve UI kenarları 3:1; iki temada da.
- Form hatası metinle ve `aria-describedby` ile alana bağlı; yalnız kırmızı kenarlık yetmez.
- Dinamik bildirim (kaydedildi, hata) `aria-live` bölgesinden okunur.
- Sayfa başlığı (`<title>`) rota değişince güncellenir; her sayfada tek `<h1>`, başlık seviyeleri atlanmaz.
- 200% yakınlaştırmada ve 320 px genişlikte yatay kaydırma olmadan kullanılır.

## Don'ts
- `dangerouslySetInnerHTML` temizlemeden.
- Token'ı `localStorage`'a yazmak.
- `VITE_` önekli değişkene secret koymak.
- `div`/`span` üzerinde `onClick` ile düğme yapmak.
- Odak halkasını kaldırmak.
- Ölçmeden "performans için" memo/abstraction eklemek.
