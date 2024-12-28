import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { etag, RETAINED_304_HEADERS } from 'hono/etag';
import { readFileSync } from 'fs';
import { Try } from '@2or3godzillas/fp-try';

const app = new Hono();

const commonMiddleware = [
  compress({ encoding: 'gzip' }),
  etag({ retainedHeaders: [...RETAINED_304_HEADERS] }),
];

app.use('*', async (c, next) => {
  const result = await Try(next);
  if (result.failure) {
    console.error('Server error:', result.error);
    return c.text('Internal Server Error', 500);
  }
  return result.data;
});

app.get('/', async (c) => {
  return c.text('Not Found', 404);
});

app.get('/health', async (c) => {
  return c.text('200 OK', 200);
});

app.get('/favicon.ico', async (c) => {
  return c.json(null, 204);
});

app.get('/assets/*',
  cors({ origin: '*' }),
  ...commonMiddleware,
  serveStatic({ root: './dist' }),
);

const htmlCache = new Map<string, string>();
function getHtmlFile(path: string): string {
  const cachedHtml = htmlCache.get(path);
  if (cachedHtml) return cachedHtml;

  const html = readFileSync(`./dist${path}.html`, 'utf-8');
  htmlCache.set(path, html);
  return html;
}

app.get('/*',
  ...commonMiddleware,
  async (c) => {
    const result = Try(() => getHtmlFile(c.req.path));
    if (result.failure) return c.text('Not Found', 404);
    return c.html(result.data);
  },
);

app.post('/*',
  ...commonMiddleware,
  async (c) => {
    const path = c.req.path;
    if (path === '/') return c.text('Not Found', 404);

    const result = await Try(async () => {
      const template = getHtmlFile(path);
      const data = await c.req.text();
      const injectable = data ? `<script>window.__INITIAL_DATA__ = ${JSON.stringify(data)}</script>` : '';
      return template.replace('<!--injectable-->', injectable);
    });

    if (result.failure) return c.text('Not Found', 404);
    return c.html(result.data);
  },
);

const port = 5173;
console.log(`Server is running on port ${port}`); // eslint-disable-line no-console

serve({
  fetch: app.fetch,
  port,
});
