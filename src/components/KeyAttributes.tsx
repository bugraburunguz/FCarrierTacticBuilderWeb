import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import { ATTR_LABELS } from '../lib/format'
import { AttrBar, Card } from './ui'

const MAX_POSITIONS = 3

export function KeyAttributes({ positions, attrs }: { positions: string[]; attrs: Record<string, number> }) {
  const config = useQuery({ queryKey: ['key-attributes'], queryFn: endpoints.keyAttributes, staleTime: 3_600_000 })
  const shown = positions.filter((p) => config.data?.positions[p]).slice(0, MAX_POSITIONS)
  if (shown.length === 0) {
    return null
  }
  return (
    <Card title="EA'nın mevki anahtar özellikleri">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((position) => {
          const keys = config.data!.positions[position]
          const average = Math.round(keys.reduce((sum, key) => sum + (attrs[key] ?? 0), 0) / keys.length)
          return (
            <div key={position}>
              <h3 className="mb-1 flex items-baseline justify-between text-xs font-semibold uppercase text-muted">
                <span>{position}</span>
                <span className="tabular-nums normal-case">ortalama {average}</span>
              </h3>
              <div className="space-y-1">
                {keys.map((key) => (
                  <AttrBar key={key} label={ATTR_LABELS[key] ?? key} value={attrs[key] ?? 0} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Bu mevkide oyunun en çok önemsediği 5 özellik (EA verisi). OVR'dan çok bunlar mevkideki gerçek gücü belirler.</p>
    </Card>
  )
}
