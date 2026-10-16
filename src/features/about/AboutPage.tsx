import { Link } from 'react-router-dom'
import { LogoLockup } from '../../design/brand/LogoLockup'
import { LEGAL_NOTE, TAGLINE } from '../../design/brand/legal'
import { Panel } from '../../design/components/primitives'

/** Uygulama sahibinin iletişim adresi (aydınlatma metnindeki veri sorumlusu iletişimiyle aynı). */
export const CONTACT_EMAIL = 'bugraburunguz@gmail.com'

const LINK = 'font-semibold text-accent underline underline-offset-2'

/** Hakkında (v3, PROD-PREP 7): marka, bağımsızlık (EA notu), ücretsiz beta, iletişim ve Gizlilik bağlantısı. */
export function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 py-2">
      <h1 className="font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Hakkında</h1>
      <div className="flex justify-center py-2">
        <LogoLockup size={56} />
      </div>
      <Panel title="FC Assist">
        <p className="text-sm text-ink-2">{TAGLINE}</p>
        <p className="mt-2 text-sm text-ink-2">Kariyer modu ve Ultimate Team için taktik, kadro ve transfer yardımcısı. Bağımsız bir hayran projesidir.</p>
      </Panel>
      <Panel title="Beta">
        <p className="text-sm text-ink-2">FC Assist şu an ücretsiz beta: tüm özellikler ücretsiz, ödeme alınmaz. Hatalar ve eksikler olabilir.</p>
      </Panel>
      <Panel title="İletişim ve gizlilik">
        <p className="text-sm text-ink-2">
          Soru, hata bildirimi ve kişisel veri başvuruları için: <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>
        </p>
        <p className="mt-2 text-sm">
          <Link to="/privacy" className={LINK}>Gizlilik ve aydınlatma metni</Link>
        </p>
      </Panel>
      <p data-testid="legal-note" className="border-t border-line pt-3 text-xs text-muted">{LEGAL_NOTE}</p>
    </div>
  )
}
