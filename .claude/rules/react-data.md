---
paths:
  - "**/*.tsx"
  - "**/use*.ts"
  - "**/api/**"
  - "**/lib/*Queries.ts"
  - "**/state/**"
---

# React bileşen, hook ve veri katmanı

`web.md` ile birlikte geçerlidir. Projenin kendi CLAUDE.md'si çelişirse proje kazanır.

## Render saf kalır
- Bileşen ve hook render sırasında yan etki yapmaz: ağ çağrısı, `localStorage` yazımı, global değişken değişimi render'da yok.
- Prop ve state değiştirilmez (mutate edilmez); yeni nesne/dizi üretilir.
- Hook'lar yalnız bileşenin ya da başka bir hook'un en üst seviyesinde çağrılır; koşul, döngü ve erken return'den sonra yok.
- Liste öğesinde `key` kalıcı kimliktir (id); dizi indeksi yalnız sırası hiç değişmeyen statik listede.

## useEffect yalnız dış sistem içindir
- Effect, React dışındaki bir sistemle eşleşmek içindir (DOM API, abonelik, timer, WebSocket, üçüncü taraf widget).
- Prop/state'ten türetilebilen değer render'da hesaplanır; effect ile state'e kopyalanmaz.
- Kullanıcı eyleminin sonucu (gönder, kaydet, bildirim) olay işleyicisinde yapılır, effect'te değil.
- Prop değişince state sıfırlanacaksa bileşene `key` verilir; effect ile sıfırlanmaz.
- Veri çekme effect'te yapılmaz; projenin veri katmanı (TanStack Query) kullanılır.
- Her effect kendi temizliğini döner (listener, timer, abonelik, `AbortController`).
- Bağımlılık dizisi eksiksizdir; `react-hooks/exhaustive-deps` uyarısı susturulmaz, kod düzeltilir.

## Memoizasyon
- React Compiler açıksa elle `useMemo`/`useCallback`/`memo` eklenmez; yalnız ölçülmüş darboğazda.
- Compiler kapalıysa da varsayılan "memo yok"tur; profilde görülen pahalı hesap ya da referans eşitliği gereken prop için eklenir.

## State
- State mümkün olan en alt bileşende durur; iki kardeş paylaşıyorsa en yakın ortak ataya çıkar.
- Birbirine bağlı alanlar tek nesnede ya da `useReducer`'da; çelişebilen iki boolean yerine tek durum alanı (`status: 'idle' | 'loading' | 'error'`).
- Global istemci state'i (context/store) yalnız gerçekten uygulama geneli olan değerler için: oturum, tema, dil.
- Context değeri sık değişiyorsa bölünür; tek dev context her tüketiciyi yeniden çizer.
- URL'de yaşaması gereken durum (filtre, sekme, sayfa) URL'de tutulur, paylaşılabilir ve geri tuşuyla çalışır.

## TanStack Query
- Sorgu tanımı `queryOptions({ queryKey, queryFn })` ile tek yerde; `useQuery`, `prefetchQuery`, `invalidateQueries` aynı tanımı kullanır.
- Query key'ler alan başına bir fabrikada, hiyerarşik: `all` → `lists()` → `list(filters)` → `detail(id)`. Elle dizi yazılmaz.
- Key'e fonksiyon ya da sınıf örneği girmez; yalnız serileştirilebilir değer. `queryFn`'in kullandığı her değişken key'dedir.
- Gerekli girdi yoksa `enabled: false` ya da `skipToken`; `queryFn` içinde `undefined` kontrolü ile boş istek atılmaz.
- Mutasyon sonrası etkilenen key'ler `invalidateQueries` ile geçersizlenir; sunucu verisi elle state'e kopyalanmaz.
- İyimser güncelleme yalnız geri alınabilir işte ve `onError`'da geri alma ile. Para/kredi düşen işte iyimser güncelleme yok.
- `staleTime` ve `retry` varsayılanları `QueryClient`'ta merkezi; bileşen başına sihirli sayı yok. 4xx yanıtlar yeniden denenmez.
- Yükleme, hata ve boş durum her sorgu için ayrı ele alınır; boş liste ile hata aynı görünmez.

## Formlar
- Doğrulama sınırda ve tiplidir (şema ya da saf fonksiyon); sunucu doğrulaması yine esastır, istemcideki yalnız kolaylıktır.
- Gönder düğmesi istek sürerken kilitlenir (çift tıklama). Sunucu hatası ilgili alanın yanında gösterilir.
- Her alanın görünür `label`'ı vardır; placeholder etiket yerine geçmez.

## Hata sınırı
- Rota/sayfa seviyesinde Error Boundary vardır; bir panelin çökmesi tüm uygulamayı beyaz ekrana düşürmez.
- Yakalanan hata kullanıcıya kısa metinle, ayrıntısı geliştirici konsoluna gider; token ya da kişisel veri loglanmaz.

## Don'ts
- Türetilmiş değeri effect + `setState` ile senkronlamak.
- Effect içinde `fetch`.
- `// eslint-disable-next-line react-hooks/exhaustive-deps`.
- Render'da `Math.random()`/`Date.now()` ile kimlik üretmek (`useId` kullanılır).
- Ağ yanıtını tipsiz (`any`) bırakmak.
