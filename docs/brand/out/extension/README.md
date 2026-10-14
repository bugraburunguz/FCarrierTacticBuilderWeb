# FC Assist — Chrome uzantısı ikonları ve ad değişikliği

Uzantı klasörü bu repoların dışında (`…/FCarrierTacticBuilder/extension/`). Manifest adını sen değiştireceksin; yapılacaklar:

1. `manifest.json` içinde:
   - `"name"`: `"FC Assist"` (varsa `"short_name"`: `"FC Assist"`)
   - `"description"`: eski ürün adı geçiyorsa "FC Assist" yap
   - `"action"` → `"default_title"` (varsa): `"FC Assist"`
   - `"icons"` ve `"action"` → `"default_icon"`: aşağıdaki dosyalara bağla
2. Bu klasördeki üç PNG'yi uzantının `icons/` klasörüne kopyala:
   - `icon-16.png` → araç çubuğu / sekme (16 px'te sadeleştirilmiş varyant: yalnız altıgen + ok)
   - `icon-48.png` → uzantılar sayfası
   - `icon-128.png` → Chrome Web Store ve kurulum penceresi
   ```json
   "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" },
   "action": { "default_icon": { "16": "icons/icon-16.png", "48": "icons/icon-48.png" } }
   ```
3. Web tarafı uzantıyı adıyla anıyor: `ExtensionSync.tsx` hata metni "kurulu FC Assist uzantısı". Adı farklı yazarsan o metni de eşle.
4. `chrome://extensions` → uzantıyı yeniden yükle; araç çubuğu ikonunun saydam zeminde okunduğunu koyu ve açık temada kontrol et.

PNG'ler `node tools/brand/render-icons.mjs` ile üretilir (web reposu); elle düzenleme.
