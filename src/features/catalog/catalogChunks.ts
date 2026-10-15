/** Katalog şablonu (kart veritabanı, kariyer oyuncu listesi): sunucu sayfa boyutu ve pencereleme parçası. */
export const CATALOG_PAGE_SIZE = 48
/** Pencereleme parça boyutu (öğe); VirtualChunk her parçayı görünüm alanı dışında yer tutucuya çevirir. */
export const CHUNK = 24

export const chunked = <T,>(items: T[]): T[][] => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK))
