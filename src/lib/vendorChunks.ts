const nm = (pattern: string) => new RegExp(`[\\\\/]node_modules[\\\\/](${pattern})[\\\\/]`)

export const VENDOR_GROUPS = [
  { name: 'vendor-react', test: nm('react|react-dom|scheduler') },
  { name: 'vendor-router', test: nm('react-router|react-router-dom') },
  { name: 'vendor-query', test: nm('@tanstack[\\\\/]query-core|@tanstack[\\\\/]react-query') },
  { name: 'vendor-dexie', test: nm('dexie') },
]
