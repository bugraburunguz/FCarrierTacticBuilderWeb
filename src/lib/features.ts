/**
 * Özellik bayrakları (build zamanı, Vite ortam değişkeni).
 *
 * Yakalama ile içe aktarma (HAR dosyası ve tarayıcı uzantısı): VARSAYILAN KAPALI (V3-05c-b). EA, FC 27 Web App'te uzantıları ve
 * geliştirici araçlarını engelliyor; bu korumaları aşmaya yönelik bir şey yapılmaz. Kod durur; yalnız `VITE_CAPTURE_IMPORT=on` ile açılır.
 */
export function captureImportEnabled(): boolean {
  return (import.meta.env.VITE_CAPTURE_IMPORT as string | undefined) === 'on'
}

/** Yakalama kapalıyken kullanıcıya gösterilen tek durum metni (içe aktarma ve SBC listesi aynı gerçeği söyler). */
export const CAPTURE_BLOCKED_TEXT = "EA, FC 27 Web App'te uzantıları ve geliştirici araçlarını engelliyor; kulüp ve SBC yakalama şu an kullanılamıyor."
