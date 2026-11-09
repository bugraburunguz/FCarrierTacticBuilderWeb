// Tema ilk boyamadan önce (FOUC yok). PROD-PREP 6d: satır içi betik yerine dosya — CSP script-src 'self'.
try {
  var t = localStorage.getItem('fc.theme') || 'dark';
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // FCA-3: kariyer ekranları şimdilik yalnız koyu (src/state/modeStore.ts isCareerSurface ile aynı kural; ilk boyamada açık tema yanıp sönmesin).
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var publicPaths = ['/', '/login', '/register', '/verify-email', '/about', '/privacy', '/profile'];
  // Kariyer yolları modu kariyere çeker (modeForPath); ortak yollarda son seçim geçerli.
  var careerPath = /^\/(career|squad|tactics|recommend|scouting|teams|wonderkids)(\/|$)/.test(path);
  var careerMode = careerPath || (localStorage.getItem('fc.mode') !== 'ut' && !/^\/ut(\/|$)/.test(path));
  if (careerMode && publicPaths.indexOf(path) < 0) dark = true;
  document.documentElement.classList.toggle('dark', dark);
} catch { document.documentElement.classList.add('dark'); }
