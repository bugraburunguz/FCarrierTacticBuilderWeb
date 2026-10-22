/**
 * Özellik bayrakları (build zamanı, Vite ortam değişkeni). V3-06a: tek yakalama bayrağı ikiye ayrıldı.
 *
 * - `VITE_EXTENSION_CAPTURE` (VARSAYILAN AÇIK, yalnız `off` kapatır): uzantı senkronu, yakalama dosyası içe aktarma ve yakalamaya bağlı
 *   UT ekranları (SBC, Kadrom, Objective, Evolution, Kulüp içe aktar). EXT-07 sonrası uzantı yüklüyken giriş ve yakalama çalışıyor.
 * - `VITE_HAR_IMPORT` (VARSAYILAN KAPALI, yalnız `on` açar): yalnız HAR dosyası bölümü (HAR-01).
 *
 * EA korumalarını aşmaya yönelik hiçbir yol yok; bayraklar yalnız arayüzde gösterip gizler, kod durur.
 */
export function extensionCaptureEnabled(): boolean {
  return (import.meta.env.VITE_EXTENSION_CAPTURE as string | undefined) !== 'off'
}

export function harImportEnabled(): boolean {
  return (import.meta.env.VITE_HAR_IMPORT as string | undefined) === 'on'
}

/**
 * KARIYER-UX: Taktik Laboratuvarı (/career/tactics-lab) FAZ 4'te gelir. O zamana kadar Lab'a götüren her giriş ("Lab'da düzenle",
 * "Lab'da dene", "Lab'a git", "Rolü değiştir") gizlenir ve taslak oluşturulmaz. FAZ 4'te bu sabit ve kullanımları kaldırılır.
 */
export const LAB_AVAILABLE: boolean = false

/** Uzantı yakalaması bu sürümde kapalıyken (VITE_EXTENSION_CAPTURE=off) yakalamaya bağlı sayfalarda gösterilen tek kısa not. */
export const CAPTURE_OFF_TEXT = 'Kulüp ve SBC yakalama bu sürümde kapalı.'
