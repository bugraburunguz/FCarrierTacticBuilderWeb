// Ekran kapısı ölçümleri (V3-05b-b): yapışkan yüzey örtmesi (Q5), kart içi en küçük yazı (Q18), etiket kesilmesi.
// Fonksiyonlar page.evaluate içinde çalışır; dış değişken kullanmaz.

/**
 * Q5 — yapışkan yüzeyin altından içerik görünmesin. Yöntem: (1) yüzeyin arka plan alfası ≥ 0,92 (computed style),
 * (2) yüzey kutusunda 5×3 ızgara noktada elementFromPoint en üstte yüzeyin kendisini (ya da içeriğini) döndürür.
 * Altında kalan öğe: aynı noktada yüzey gizlenince görünen ilk kart/yazı (yalnız raporlama için).
 */
export function stickyCover(selector) {
  const el = document.querySelector(selector)
  if (!el) {
    return { found: false }
  }
  const rect = el.getBoundingClientRect()
  const bg = getComputedStyle(el).backgroundColor
  const parts = bg.match(/[\d.]+/g)?.map(Number) ?? []
  const alpha = parts.length === 4 ? parts[3] : parts.length === 3 ? 1 : 0
  const points = []
  for (let i = 1; i <= 5; i++) {
    for (let j = 1; j <= 3; j++) {
      points.push([rect.left + (rect.width * i) / 6, rect.top + (rect.height * j) / 4])
    }
  }
  const inside = (x, y) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight
  const visible = points.filter(([x, y]) => inside(x, y))
  const notTop = visible.filter(([x, y]) => {
    const hit = document.elementFromPoint(x, y)
    return !(hit && (el === hit || el.contains(hit)))
  })
  // Yapışkanlık yüzeyin kendisinde ya da onu saran kapta olabilir (kart veritabanı: sticky kap + cam bölüm).
  const holder = [el, el.parentElement].find((n) => n && getComputedStyle(n).position === 'sticky')
  const sticky = Boolean(holder)
  const hide = holder ?? el
  const prev = hide.style.visibility
  hide.style.visibility = 'hidden'
  const underneath = visible.map(([x, y]) => document.elementFromPoint(x, y)).filter((n) => n && n.closest('ul, li, [role="img"], p, h2, dt, dd')).length
  hide.style.visibility = prev
  return { found: true, top: Math.round(rect.top), height: Math.round(rect.height), position: sticky ? 'sticky' : getComputedStyle(el).position, alpha, pointsChecked: visible.length, notTopmost: notTop.length, contentUnderneath: underneath, ok: alpha >= 0.92 && notTop.length === 0 }
}

/** Q18 — görünür kartlardaki (role=img, ölçekli katman) yazının ekrandaki px'i: computed font-size × katmanın ölçeği. */
export function cardMinFont(rootSelector) {
  const root = document.querySelector(rootSelector) ?? document
  const cards = [...root.querySelectorAll('[role="img"][aria-label]')].filter((c) => {
    const r = c.getBoundingClientRect()
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && c.querySelector('svg')
  })
  let min = Infinity
  let minText = ''
  let ovrMin = Infinity
  let surnames = 0
  for (const card of cards) {
    const layer = card.querySelector('[style*="scale("]')
    const scale = layer ? layer.getBoundingClientRect().width / layer.offsetWidth : 1
    const ovr = parseInt(card.getAttribute('aria-label').split(', ')[1], 10)
    // Bir stat değeri OVR ile aynı sayı olabilir: kartın OVR'si eşleşen en büyük yazıdır.
    let ovrPx = 0
    const surname = card.getAttribute('aria-label').split(', ')[0].split(' ').slice(-1)[0]
    for (const el of card.querySelectorAll('div, span')) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('')
      if (!own || getComputedStyle(el).visibility === 'hidden' || el.getBoundingClientRect().width === 0) {
        continue
      }
      const px = parseFloat(getComputedStyle(el).fontSize) * (layer && layer.contains(el) ? scale : 1)
      if (px < min) {
        min = px
        minText = own
      }
      if (own === String(ovr)) {
        ovrPx = Math.max(ovrPx, px)
      }
      if (own.toLocaleUpperCase('tr') === surname.toLocaleUpperCase('tr') || own === surname) {
        surnames++
      }
    }
    if (ovrPx > 0) {
      ovrMin = Math.min(ovrMin, ovrPx)
    }
  }
  const round = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null)
  return { cards: cards.length, minFontPx: round(min), minFontText: minText, ovrMinPx: round(ovrMin), surnamesVisible: surnames }
}

/**
 * Sayfa geneli en küçük görünür yazı (V3-05b-c): görünür her metin düğümünün ekrandaki px'i = computed font-size × atalardaki `scale()`.
 * Hariç: aria-hidden alt ağaçları (dekoratif) ve görsel olarak gizli (sr-only: 1px kırpılmış) metin; ikisi ayrıca listelenir.
 * Sayfadaki çizilen tüm metin ölçülür (görünüm alanı dışı dahil; gizli sekme/display:none hariç).
 */
export function pageMinFont(threshold) {
  const below = []
  const excluded = new Map()
  let min = Infinity
  let minText = ''
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim()
    const el = node.parentElement
    if (!text || !el || el.closest('script, style, noscript')) {
      continue
    }
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      continue
    }
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || Number(style.opacity) === 0) {
      continue
    }
    const hidden = el.closest('[aria-hidden="true"]')
    const srOnly = rect.width <= 1.5 && rect.height <= 1.5
    if (hidden || srOnly) {
      const key = `${hidden ? 'aria-hidden' : 'sr-only'}: ${text.slice(0, 24)}`
      excluded.set(key, (excluded.get(key) ?? 0) + 1)
      continue
    }
    let scale = 1
    for (let a = el; a; a = a.parentElement) {
      const m = /scale\(([\d.]+)\)/.exec(a.style?.transform ?? '')
      if (m) {
        scale *= Number(m[1])
      }
    }
    const px = parseFloat(style.fontSize) * scale
    if (px < min) {
      min = px
      minText = text.slice(0, 30)
    }
    if (px < threshold - 0.01) {
      below.push({ text: text.slice(0, 30), px: Math.round(px * 10) / 10, tag: el.tagName.toLowerCase() })
    }
  }
  return { minFontPx: Number.isFinite(min) ? Math.round(min * 10) / 10 : null, minFontText: minText, below: below.slice(0, 15), belowCount: below.length, excluded: [...excluded.keys()].slice(0, 20) }
}

/**
 * Yapışkan başlık + sayfa içi yapışkanlar (V3-05b-c, Q5): başlık ve yapışkanların kapladığı üst bant [0, bandBottom] içinde
 * 3 sütun × her 6px'te bir satır noktasında elementFromPoint başlığa ya da yapışkan yüzeylerden birine düşmeli; içerik (kart, metin) görünmemeli.
 * Başlık ve yapışkanlar arası boşluk = bant içinde hiçbir yüzeye düşmeyen nokta.
 */
export function stickyBand(surfaceSelectors) {
  const surfaces = surfaceSelectors.flatMap((s) => [...document.querySelectorAll(s)]).filter((el) => {
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.top < innerHeight && r.bottom > 0 && getComputedStyle(el).position !== 'static'
  })
  const stuck = surfaces.filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position) || getComputedStyle(el.parentElement).position === 'sticky')
  // Bant: en üstten başlayıp birbirine (≤ 24px boşlukla) eklenen yapışık yüzeyler; boşluk varsa aşağıdaki noktalar onu sızıntı olarak yakalar.
  // Yan sütunda aşağıda duran yapışkanlar (masaüstü kart sütunu içindeki şerit, yan panel) bandı oluşturmaz.
  const band = []
  let bandBottom = 0
  for (const el of [...stuck].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
    const r = el.getBoundingClientRect()
    if (r.top <= bandBottom + 24 && r.bottom < innerHeight * 0.6) {
      band.push(el)
      bandBottom = Math.max(bandBottom, r.bottom)
    }
  }
  const bg = (el) => {
    const parts = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []
    return parts.length === 4 ? parts[3] : parts.length === 3 ? 1 : 0
  }
  const leaks = []
  for (let y = 1; y < bandBottom; y += 6) {
    for (const x of [innerWidth * 0.2, innerWidth * 0.5, innerWidth * 0.8]) {
      const hit = document.elementFromPoint(x, y)
      if (!hit || !stuck.some((s) => s === hit || s.contains(hit))) {
        leaks.push({ x: Math.round(x), y, hit: hit ? `${hit.tagName}.${String(hit.className?.baseVal ?? hit.className).slice(0, 30)}` : null })
      }
    }
  }
  return {
    bandBottom: Math.round(bandBottom),
    surfaces: band.map((el) => ({ el: `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''}`, top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), alpha: bg(el) })),
    leaks: leaks.slice(0, 8), leakCount: leaks.length,
    ok: leaks.length === 0 && band.every((el) => bg(el) >= 0.92 || bg(el.parentElement) >= 0.92),
  }
}

/** Stat etiketleri: kesilen (scrollWidth > clientWidth) ya da ellipsis taşıyan etiketler. */
export function labelClipping(rootSelector) {
  const labels = [...document.querySelectorAll(`${rootSelector} dt`)]
  const clipped = labels.filter((dt) => dt.scrollWidth > dt.clientWidth + 0.5 || getComputedStyle(dt).textOverflow === 'ellipsis').map((dt) => dt.textContent)
  const longest = ['Savunma farkındalığı', 'Kayarak müdahale', 'Ayakta müdahale'].map((t) => {
    const dt = labels.find((d) => d.textContent === t)
    return { label: t, present: Boolean(dt), lines: dt ? Math.round(dt.getBoundingClientRect().height / parseFloat(getComputedStyle(dt).lineHeight || '16')) : 0 }
  })
  return { labels: labels.length, clipped, longest }
}
