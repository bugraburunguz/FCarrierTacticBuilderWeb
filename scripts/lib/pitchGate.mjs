// Q17/Q18 saha ölçümü (11 §8): kadro sayfaları (scripts/q17.mjs) ve SBC çözüm sahası (scripts/sbc-solve-shots.mjs) aynı fonksiyonu kullanır.
// measurePitch tarayıcıda çalışır (page.evaluate); q18Problems Node tarafında kart genişliği / yazı eşiklerini ekler.

/** Rol etiketi en uzun adlarla değiştirilir (taşma ölçümü). */
export const LONGEST = { one: 'Wide Mid · Vers', full: 'Ball-Playing Defender · Ball-Winning' }

export function measurePitch({ formationId, expected, longest }) {
  const groups = [...document.querySelectorAll('[data-slot-group]')]
  groups.forEach((g) => {
    const label = g.querySelector('button[title]')
    const spans = label ? [...label.querySelectorAll('span')] : []
    if (spans.length >= 1) {
      spans[0].textContent = window.innerWidth < 480 ? longest.one : longest.full
    }
  })
  const rect = (el) => el.getBoundingClientRect()
  const field = rect(document.querySelector('.pitch-field'))
  const boxes = groups.map((g) => ({ id: g.dataset.slotGroup, ...rect(g).toJSON() }))
  const problems = []
  if (groups.length !== expected) {
    problems.push(`slot grubu sayısı ${groups.length} ≠ ${expected}`)
  }
  boxes.forEach((a, i) => {
    boxes.slice(i + 1).forEach((b) => {
      const hit = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
      if (hit) problems.push(`${a.id} × ${b.id} kesişiyor`)
    })
    if (a.left < field.left - 0.5 || a.right > field.right + 0.5 || a.top < field.top - 0.5 || a.bottom > field.bottom + 0.5) problems.push(`${a.id} saha dışında`)
  })
  groups.forEach((g) => {
    const gr = rect(g)
    ;[...g.querySelectorAll('button[title], [data-slot-pill], [data-pitch-slot]')].forEach((child) => {
      const cr = rect(child)
      if (cr.width > 0 && (cr.bottom > gr.bottom + 1 || cr.right > gr.right + 1 || cr.left < gr.left - 1)) {
        problems.push(`${g.dataset.slotGroup}: içerik grup kutusundan taşıyor (${child.tagName.toLowerCase()})`)
      }
    })
    const label = g.querySelector('button[title]')
    if (label && label.scrollWidth > label.clientWidth + 1) problems.push(`${g.dataset.slotGroup}: rol etiketi kesiliyor`)
  })
  // Q18: kart genişliği ve kart içi en küçük yazı (ölçekli kapsayıcıdaki yazı genişlik/180 ile çarpılır)
  const cards = groups.map((g) => g.querySelector('[role="img"]')).filter(Boolean)
  let cardWidth = cards.length ? Infinity : null
  let minFont = cards.length ? Infinity : null
  let ovrFont = cards.length ? Infinity : null
  cards.forEach((card) => {
    const cw = card.getBoundingClientRect().width
    cardWidth = Math.min(cardWidth, cw)
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue
      const el = node.parentElement
      const scaled = el.closest('[style*="scale("]') ? cw / 180 : 1
      minFont = Math.min(minFont, parseFloat(getComputedStyle(el).fontSize) * scaled)
    }
    const ovr = card.querySelector('.font-display > div')
    if (ovr) ovrFont = Math.min(ovrFont, parseFloat(getComputedStyle(ovr).fontSize) * (cw / 180))
  })
  // Q18 eki: her dolu kartta isim görünür ve ≥ 11px
  let nameProblem = null
  cards.forEach((card) => {
    const el = card.parentElement?.querySelector('[data-card-name]') ?? card.closest('[data-pitch-slot]')?.querySelector('[data-card-name]')
    const r = el?.getBoundingClientRect()
    if (!el || !el.textContent.trim() || r.width < 4 || r.height < 4) nameProblem = 'Q18: kartta isim görünmüyor'
    else if (parseFloat(getComputedStyle(el).fontSize) < 10.95) nameProblem = 'Q18: isim yazısı 11px altında'
    // V3-05d-c: ad şeridi yalnız rakamdan (ya da "#" kimlikten) oluşamaz
    else if (/^[#\d\s]+$/.test(el.textContent.trim())) nameProblem = `Q18: ad şeridinde ad yerine sayı ("${el.textContent.trim()}")`
  })
  if (nameProblem) problems.push(nameProblem)
  const root = document.documentElement
  return { formationId, problems: [...new Set(problems)], pageOverflowY: root.scrollHeight - window.innerHeight, fieldBottom: field.bottom, fieldWidth: field.width, innerHeight: window.innerHeight, cardWidth, minFont, ovrFont }
}

/** Q18 eşikleri (Node): ≥1024px'te kart ≥56px, <480px'te ≥48px; kart içi yazı ≥11px, OVR ≥14px. report.problems'a ekler. */
export function q18Problems(report, viewportWidth) {
  const minCard = viewportWidth < 480 ? 48 : viewportWidth >= 1024 ? 56 : 0
  if (report.cardWidth !== null) {
    if (report.cardWidth < minCard - 0.5) report.problems.push(`Q18: kart ${Math.round(report.cardWidth)}px < ${minCard}px`)
    if (report.minFont < 10.95) report.problems.push(`Q18: kart içi yazı ${report.minFont.toFixed(1)}px < 11px`)
    if (report.ovrFont < 13.95) report.problems.push(`Q18: OVR ${report.ovrFont.toFixed(1)}px < 14px`)
  }
  return report
}
