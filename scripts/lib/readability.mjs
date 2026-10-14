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
        ovrMin = Math.min(ovrMin, px)
      }
      if (own.toLocaleUpperCase('tr') === surname.toLocaleUpperCase('tr') || own === surname) {
        surnames++
      }
    }
  }
  const round = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null)
  return { cards: cards.length, minFontPx: round(min), minFontText: minText, ovrMinPx: round(ovrMin), surnamesVisible: surnames }
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
