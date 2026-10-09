import { useState } from 'react'

const POSITION_HUE: Record<string, string> = {
  GK: 'bg-code-soft', CB: 'bg-info-soft', LB: 'bg-info-soft', RB: 'bg-info-soft', CDM: 'bg-accent-bg', CM: 'bg-accent-bg', CAM: 'bg-accent-bg',
  LM: 'bg-teal-600', RM: 'bg-teal-600', LW: 'bg-danger', RW: 'bg-danger', ST: 'bg-danger',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** Yuvarlak yüz: EA içerik adresinden (faceUrl) tembel yüklenir; yoksa ya da yüklenemezse mevki renkli baş harfler. */
export function PlayerAvatar({ name, position, faceUrl, size = 28 }: { name: string; position?: string; faceUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (faceUrl && !failed) {
    return <img src={faceUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={style} className="shrink-0 rounded-full bg-surface-2 object-cover" />
  }
  return (
    <span aria-hidden="true" style={{ ...style, fontSize: size * 0.4 }} className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${POSITION_HUE[position ?? ''] ?? 'bg-slate-500'}`}>
      {initials(name)}
    </span>
  )
}
