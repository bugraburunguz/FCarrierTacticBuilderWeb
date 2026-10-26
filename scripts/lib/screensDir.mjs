// OPS-SCREENS: ekran görüntüleri repoda tutulmaz. Kapı betikleri (axe/taşma) görüntüleri proje kökündeki "Claude outputs/screens/<İŞ-ID>/"
// klasörüne yazar. Proje kökü, betiğin bulunduğu yerden yukarı doğru "Claude outputs" klasörü aranarak bulunur (ana checkout ya da worktrees/
// altındaki çalışma kopyası fark etmez). FC_SCREENS_DIR verilirse o klasör kullanılır. Klasör yoksa oluşturulur.
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const OUTPUTS = 'Claude outputs'

/** Ekran görüntüsü kök klasörü (mutlak yol). */
export function screensRoot() {
  if (process.env.FC_SCREENS_DIR) {
    return resolve(process.env.FC_SCREENS_DIR)
  }
  let dir = dirname(fileURLToPath(import.meta.url))
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, OUTPUTS))) {
      return join(dir, OUTPUTS, 'screens')
    }
    dir = dirname(dir)
  }
  throw new Error(`"${OUTPUTS}" klasörü bulunamadı; FC_SCREENS_DIR ile ekran görüntüsü klasörünü verin.`)
}

/** İşin klasörü file URL olarak (sonunda /): `new URL('ad.png', screensDir('GT-b'))` ile dosya yolu kurulur. */
export function screensDir(...parts) {
  const dir = join(screensRoot(), ...parts)
  mkdirSync(dir, { recursive: true })
  return pathToFileURL(`${dir}/`)
}
