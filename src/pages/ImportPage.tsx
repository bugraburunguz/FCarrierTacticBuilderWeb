import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Card, Pill } from '../components/ui'

export function ImportPage() {
  const { me } = useAuth()
  const premium = me?.subscriptionType === 'PREMIUM'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title="Kariyer verisini içe aktar" actions={<Pill tone="amber">Yakında</Pill>}>
        <p className="text-sm">
          Mod aracından (FC Editor Tool / Live Editor) dışa aktardığın CSV ya da SQLite dosyası ile oyundaki gerçek potential ve değer bilgilerini içe aktarabilirsin. Veriler yalnızca sana özel kalır.
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Bu özellik PREMIUM’dur. Dosya şeması örnek bir dışa aktarım gelene kadar sabitlenmediği için içe aktarma henüz açık değil; yüklemeyi bozuk şemayla denemek yerine kapalı tuttuk.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input type="file" disabled aria-label="Dışa aktarım dosyası" accept=".csv,.sqlite,.db" className="text-sm" />
          <Button disabled>Yükle</Button>
        </div>
        {!premium && (
          <p className="mt-3 text-sm">
            Hazır olduğunda kullanabilmek için <Link to="/profile" className="text-emerald-700 underline">PREMIUM’a geç</Link>.
          </p>
        )}
      </Card>
    </div>
  )
}
