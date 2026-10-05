import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

const FEATURES = [
  { to: '/tactics/builder', title: 'Taktik kur', text: 'Formasyon seç, her slota oyuncunun ne yapmasını istediğini davranışlarla söyle. Motor rolü senin yerine çıkarır.' },
  { to: '/recommend', title: 'Slot önerisi', text: 'Zayıf halka için bütçene uygun, rolün silahlarını taşıyan oyuncuları sebepleriyle listele.' },
  { to: '/players', title: 'Oyuncu arama', text: 'Attribute, PlayStyle ve AcceleRATE filtreleriyle scout et.' },
]

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Oynamak istediğin futbolu seç, kadron oynayabiliyor mu gör.</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
          Offline EA FC kariyer/menajerlik yardımcısı: veritabanının üstüne taktik zekâ katmanı. Potential ve değer değerleri “tahmin”dir; gerçek değerler yalnızca PREMIUM içe aktarmada kullanıcıya özel tutulur.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link key={f.to} to={f.to} className="block">
            <Card title={f.title} className="h-full transition hover:border-emerald-400">
              <p className="text-sm text-slate-600 dark:text-slate-300">{f.text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
