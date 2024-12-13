import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { etag, RETAINED_304_HEADERS } from 'hono/etag';
import { readFileSync } from 'fs';

const app = new Hono();

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
  compress({ encoding: 'gzip' }),
  etag({ retainedHeaders: [...RETAINED_304_HEADERS] }),
  serveStatic({ root: './dist' }),
);

app.get('/*',
  compress({ encoding: 'gzip' }),
  etag({ retainedHeaders: [...RETAINED_304_HEADERS] }),
  async (c) => {
    const html = readFileSync(`./dist${c.req.path}.html`, 'utf-8');
    return c.html(html);
  },
);

app.post('/*',
  compress({ encoding: 'gzip' }),
  async (c) => {
    const path = c.req.path;
    if (path === '/') return c.text('Not Found', 404);
    const template = readFileSync(`./dist${path}.html`, 'utf-8');

    const data = await c.req.text();
    const injectable = data ? `<script>window.__INITIAL_DATA__ = ${data}</script>` : '';
    const html = template.replace('<!--injectable-->', injectable);

    return c.html(html);
  },
);

const port = 5173;
console.log(`Server is running on port ${port}`); // eslint-disable-line no-console

serve({
  fetch: app.fetch,
  port,
});
