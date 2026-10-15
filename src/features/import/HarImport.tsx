import type { Capture } from '../../lib/har/harCapture'
import { CaptureFileImport } from './CaptureFileImport'

/** HAR-01: HAR dosyasından içe aktarma — ortak dosya akışının (CaptureFileImport) HAR kaynağı. */
export function HarImport({ onPersonal, busy }: { onPersonal: (captures: Capture[]) => void; busy: boolean }) {
  return <CaptureFileImport source="har" onPersonal={onPersonal} busy={busy} />
}
