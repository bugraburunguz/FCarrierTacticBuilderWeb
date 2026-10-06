import type { DragEvent } from 'react'

interface DragCardInfo {
  name: string
  overall: number
  position: string
  detail?: string
}

const GHOST_ID = 'drag-card-ghost'

export function setCardDragImage(event: DragEvent, info: DragCardInfo) {
  document.getElementById(GHOST_ID)?.remove()
  const ghost = document.createElement('div')
  ghost.id = GHOST_ID
  ghost.style.cssText = [
    'position:fixed',
    'top:-1000px',
    'left:-1000px',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'padding:8px 12px',
    'min-width:190px',
    'border-radius:14px',
    'border:2px solid #10b981',
    'background:#ffffff',
    'color:#0f172a',
    'font:600 14px system-ui,sans-serif',
    'box-shadow:0 14px 28px rgba(15,23,42,.35)',
    'transform:rotate(-3deg)',
    'opacity:1',
  ].join(';')

  const rating = document.createElement('span')
  rating.textContent = String(info.overall)
  rating.style.cssText = 'font-size:22px;font-weight:800;color:#047857;min-width:30px;text-align:center'
  const body = document.createElement('span')
  body.style.cssText = 'display:flex;flex-direction:column;line-height:1.2'
  const name = document.createElement('span')
  name.textContent = info.name
  const sub = document.createElement('span')
  sub.textContent = [info.position, info.detail].filter(Boolean).join(' · ')
  sub.style.cssText = 'font-size:11px;font-weight:500;color:#64748b'
  body.append(name, sub)
  ghost.append(rating, body)
  document.body.appendChild(ghost)

  event.dataTransfer.effectAllowed = 'copyMove'
  event.dataTransfer.setDragImage(ghost, 24, 22)
  setTimeout(() => ghost.remove(), 0)
}
