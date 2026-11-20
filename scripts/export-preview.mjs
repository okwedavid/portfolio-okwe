// Export the authored pages for review on a phone, without a server or a sandbox URL.
// Only public frontend files are inputs. Nothing from the environment or backend is bundled.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';

const root = new URL('../', import.meta.url);
const at = (name) => new URL(name, root);
const text = (url) => readFileSync(url, 'utf8');
const types = {
  glb: 'model/gltf-binary',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  woff2: 'font/woff2',
  txt: 'text/plain',
};
function asset(url) {
  const type = types[url.pathname.split('.').at(-1)];
  if (!type || !url.href.startsWith(at('img/').href)) throw Error(`Unexpected asset: ${url}`);
  return `data:${type};base64,${readFileSync(url).toString('base64')}`;
}
function css(name) {
  const url = at(`sass/${name}.scss`);
  return compile(fileURLToPath(url), { style: 'compressed' }).css.replace(
    /url\((["']?)(\.\.?\/[^)"']+)\1\)/g,
    (_, _quote, path) => `url("${asset(new URL(path, url))}")`,
  );
}
// Keep ES module scopes intact. Inline local dependencies rather than loading file:// modules,
// which mobile browsers can reject. The globe maps and portrait mesh stay local too.
function moduleSource(url) {
  if (!url.href.startsWith(at('src/').href)) throw Error(`Unexpected module: ${url}`);
  return text(url)
    .replace(
      /new URL\('([^']+)', import\.meta\.url\)/g,
      (_, path) => `new URL("${asset(new URL(path, url))}")`,
    )
    .replace(/(\bfrom\s+)'(\.\/[^']+\.js)'/g, (_, prefix, path) => {
      const encoded = Buffer.from(moduleSource(new URL(path, url))).toString('base64');
      return `${prefix}'data:text/javascript;base64,${encoded}'`;
    });
}
function inlineImages(html) {
  return html.replace(/\b(src|href)="(\.\/img\/[^"\s]+)"/g, (_, attr, path) => {
    const download = path.endsWith('.txt') ? ` download="${path.split('/').at(-1)}"` : '';
    return `${attr}="${asset(at(path))}"${download}`;
  });
}
// The two web pages become two views of one offline document. Keep a single fixed
// sky outside the views (including a single set of canvas IDs and one render loop).
const scenePattern = /<figure class="universe"[\s\S]*?<\/figure>/;
const landing = text(at('index.html'));
const [sharedSky] = landing.match(scenePattern);
const brief = text(at('engineering-brief.html'))
  .match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(scenePattern, '');
const screenSwitch = `
  #offline-brief { display: none; }
  #offline-brief:target, #offline-brief:has(:target) { display: block; }
  body:has(#offline-brief:target, #offline-brief :target) #offline-site { display: none; }
`;
let html = landing
  .replace(scenePattern, '')
  .replace('<html lang="en">', '<html lang="en" data-offline-preview>')
  .replace(/<link\b[^>]*rel="preload"[^>]*>/g, '')
  .replace(
    /<link rel="stylesheet"[^>]*>/,
    () => `<style>${css('brief')}${css('main')}${screenSwitch}</style>`,
  )
  .replace(
    '<script type="module" src="./src/main.js"></script>',
    () =>
      `<script type="module">${moduleSource(at('src/main.js'))}\n${text(at('src/print.js'))}</script>`,
  )
  .replace('<body>', () => `<body>${sharedSky}<div id="offline-site">`)
  .replace('</body>', () => `</div><div id="offline-brief">${brief}</div></body>`)
  .replaceAll('./engineering-brief.html#credits', '#credits')
  .replaceAll('./engineering-brief.html', '#offline-brief')
  .replaceAll('./index.html#about', '#about');
html = inlineImages(html);
mkdirSync(at('preview-files/'), { recursive: true });
writeFileSync(at('preview-files/Okwe-David-Portfolio.html'), html);
console.log(
  `Created preview-files/Okwe-David-Portfolio.html (${(Buffer.byteLength(html) / 1e6).toFixed(1)} MB). Open the file directly in a browser.`,
);
