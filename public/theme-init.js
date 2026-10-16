// Tema ilk boyamadan önce (FOUC yok). PROD-PREP 6d: satır içi betik yerine dosya — CSP script-src 'self'.
try {
  var t = localStorage.getItem('fc.theme') || 'dark';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch { document.documentElement.classList.add('dark'); }
