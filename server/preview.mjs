import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { handleAgent } from './agent.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const port = Number(process.env.PORT || 3000);
// The preview is intentionally incapable of live delivery, even if a developer's shell has keys.
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://preview.invalid');
    if (url.pathname.startsWith('/api/')) {
      const method = req.method || 'GET';
      const request = new Request('http://preview.invalid' + url.pathname + url.search, {
        method,
        headers: req.headers,
        ...(['GET', 'HEAD'].includes(method) ? {} : { body: Readable.toWeb(req), duplex: 'half' }),
      });
      const out = await handleAgent(request, { env: { ENABLE_LIVE_INTAKE: 'false' } });
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(await out.text());
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const path = decodeURIComponent(url.pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (
      !file.startsWith(resolve(root) + sep) ||
      path.split('/').some((part) => part.startsWith('.'))
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error();
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    if (req.method === 'HEAD') res.end();
    else
      createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '0.0.0.0', () =>
  console.log(`Portfolio preview is ready on port ${port}. Live contact delivery is disabled.`),
);
