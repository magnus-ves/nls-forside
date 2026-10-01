// Builds the static site: wraps every page in src/pages/ with the shared
// layout (head, header, menu, footer) and writes it to site/.
//
//   src/pages/index.html          -> site/index.html
//   src/pages/kurs.html           -> site/kurs/index.html
//   src/pages/aktuelt/foo.html    -> site/aktuelt/foo/index.html
//   src/pages/404.html            -> site/404.html
//
// Each page starts with a JSON comment holding its metadata:
//   <!--{"title": "...", "description": "...", "nav": "kurs", "crumbs": [["Kurs", "/kurs/"]]}-->
//
// Run: node tools/build.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src', 'pages');
const outDir = join(root, 'site');
const SITE_NAME = 'Norges Livredningsselskap';
const LOGO = 'https://static.wixstatic.com/media/c68629_5278ddd3acd14657bb720ab775a6f65f~mv2.png/v1/fill/w_68,h_69,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/c68629_5278ddd3acd14657bb720ab775a6f65f~mv2.png';

const NAV = [
  ['utdanning', 'Utdanning', '/utdanning/'],
  ['kurs', 'Kurs', '/kurs/'],
  ['tips', 'Tips og råd', '/tips-og-rad/'],
  ['sporsmal', 'Spørsmål', '/sporsmal-og-svar/'],
  ['aktuelt', 'Aktuelt', '/aktuelt/'],
];

const MENU = [
  ['LÆR', [
    ['utdanning', 'Utdanning', '/utdanning/'],
    ['kurs', 'Kurs og kalender', '/kurs/'],
    ['tips', 'Tips og råd', '/tips-og-rad/'],
    ['sporsmal', 'Spørsmål og svar', '/sporsmal-og-svar/'],
    ['plakat', 'Livredningsplakat', '/livredningsplakat/'],
  ]],
  ['ORGANISASJONEN', [
    ['om', 'Om NLS', '/om-nls/'],
    ['strand', 'Strandtjenesten', '/strandtjenesten/'],
    ['klubber', 'Klubber og kretser', '/klubber-og-kretser/'],
    ['aktuelt', 'Aktuelt', '/aktuelt/'],
    ['kontakt', 'Kontakt oss', '/kontakt/'],
  ]],
];

const FOOTER = [
  ['Lær', [['Utdanning', '/utdanning/'], ['Kurs og kalender', '/kurs/'], ['Tips og råd', '/tips-og-rad/'], ['Spørsmål og svar', '/sporsmal-og-svar/'], ['Livredningsplakat', '/livredningsplakat/']]],
  ['Organisasjonen', [['Om NLS', '/om-nls/'], ['Strandtjenesten', '/strandtjenesten/'], ['Klubber og kretser', '/klubber-og-kretser/'], ['Aktuelt', '/aktuelt/']]],
  ['Bidra', [['Støtt oss', '/stott-oss/'], ['Bli medlem', '/bli-medlem/'], ['Meld inn en redningsdåd', '/om-nls/#redningsdad']]],
  ['Kontakt', [['Kontakt oss', '/kontakt/'], ['Presse', '/kontakt/#presse'], ['Personvern', '/personvern/'], ['Tilgjengelighet', '/tilgjengelighet/']]],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cur = (key, active) => (key === active ? ' aria-current="page"' : '');

function header(active) {
  const nav = NAV.map(([k, label, href]) => `<a href="${href}"${cur(k, active)}>${label}</a>`).join('\n          ');
  const groups = MENU.map(([head, items]) => `
            <div class="menu-group">
              <span class="menu-head">${head}</span>
              ${items.map(([k, label, href]) => `<a href="${href}"${cur(k, active)}>${label}</a>`).join('\n              ')}
            </div>`).join('');
  return `
  <div class="header-slot">
    <header class="header" id="header">
      <div class="header-inner">
        <a href="/" class="brand" aria-label="${SITE_NAME} — til forsiden">
          <img src="${LOGO}" alt="" width="36" height="36">
          <span>Norges<br>Livredningsselskap</span>
        </a>
        <nav class="nav" aria-label="Hovedmeny">
          ${nav}
        </nav>
        <div class="header-actions">
          <a href="/kurs/" class="btn btn-dark btn-sm">Finn kurs</a>
          <button type="button" class="menu-toggle" id="menu-toggle" aria-label="Meny" aria-expanded="false" aria-controls="menu">
            <span class="bar bar-top"></span>
            <span class="bar bar-bottom"></span>
          </button>
          <nav class="menu" id="menu" aria-label="Alle sider">${groups}
            <a href="/stott-oss/" class="menu-cta">Støtt oss</a>
          </nav>
        </div>
      </div>
    </header>
  </div>`;
}

function footer() {
  const cols = FOOTER.map(([head, items]) => `
        <div class="footer-col">
          <span class="footer-col-head">${head}</span>
          ${items.map(([label, href]) => `<a href="${href}">${label}</a>`).join('\n          ')}
        </div>`).join('');
  return `
  <footer id="om" class="footer">
    <div class="footer-emergency">
      <span class="emergency-label"><span class="dot"></span>Ved akutt fare</span>
      <span class="emergency-numbers">
        <a href="tel:113">MEDISINSK NØDHJELP 113</a>
        <a href="tel:120">SJØ OG VANN 120</a>
        <a href="tel:112">POLITI 112</a>
      </span>
    </div>
    <div class="footer-main">
      <div class="footer-brand">
        <div class="footer-logo">
          <img src="${LOGO}" alt="" width="46" height="46" loading="lazy">
          <span>Norges<br>Livredningsselskap</span>
        </div>
        <span class="footer-tagline">Stiftet 1906. Klubber og kretser i hele Norge.</span>
        <div class="footer-social">
          <a href="https://www.facebook.com/norgeslivredningsselskap/" rel="noopener">Facebook</a>
          <a href="https://www.instagram.com/norgeslivredningsselskap/" rel="noopener">Instagram</a>
          <a href="https://www.youtube.com/channel/UCrJ9Nnmt-geTGgbTjWLXfXg" rel="noopener">YouTube</a>
        </div>
      </div>
      <div class="footer-cols">${cols}
      </div>
    </div>
    <div class="footer-legal">
      <span>© Norges Livredningsselskap ${new Date().getFullYear()}</span>
      <span class="footer-legal-links"><a href="/personvern/">Personvern</a><a href="/tilgjengelighet/">Tilgjengelighet</a></span>
    </div>
  </footer>`;
}

function crumbs(list) {
  if (!list || !list.length) return '';
  const items = [['Forside', '/'], ...list];
  return `<nav class="crumbs" aria-label="Brødsmuler">${items.map(([label, href], i) =>
    i === items.length - 1
      ? `<span aria-current="page">${esc(label)}</span>`
      : `<a href="${href}">${esc(label)}</a><span aria-hidden="true">/</span>`).join('')}</nav>`;
}

function layout(meta, body) {
  const title = meta.title === SITE_NAME ? SITE_NAME : `${meta.title} · ${SITE_NAME}`;
  const css = ['/assets/nls.css', ...(meta.css || [])].map((h) => `<link rel="stylesheet" href="${h}">`).join('\n');
  const js = ['/assets/nls.js', ...(meta.js || [])].map((h) => `<script src="${h}" defer></script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="theme-color" content="#002b45">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:locale" content="nb_NO">
<link rel="icon" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
${css}
</head>
<body${meta.bodyClass ? ` class="${meta.bodyClass}"` : ''}>
<a class="skip-link" href="#innhold">Hopp til innhold</a>
<div class="page">

  <div class="backdrop" aria-hidden="true">
    <img src="/assets/bakgrunn-vann.jpeg" alt="">
    <div class="backdrop-tint"></div>
  </div>
${header(meta.nav)}

  <main id="innhold" tabindex="-1">
${body.replace('{{crumbs}}', crumbs(meta.crumbs))}
  </main>
${meta.footer === false ? '' : footer()}
</div>
${js}
</body>
</html>
`;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

const pages = walk(srcDir);
for (const file of pages) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing metadata comment`);
  const meta = JSON.parse(m[1]);
  const rel = relative(srcDir, file).replace(/\\/g, '/');
  const name = basename(rel, '.html');
  const out = name === 'index' || name === '404'
    ? join(outDir, rel)
    : join(outDir, dirname(rel), name, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, layout(meta, raw.slice(m[0].length)));
  console.log('built', relative(root, out));
}
