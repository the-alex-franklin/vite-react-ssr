import { resolve, dirname } from "node:path";
import fs from "node:fs";

import React from "react";
import react from "@vitejs/plugin-react";
import windi from "vite-plugin-windicss";
import { createServer, defineConfig, type PluginOption } from "vite";
import { renderToString } from "react-dom/server";
import { env } from './env';

const entry_points: `src/${string}.tsx`[] = [
  "src/main.tsx",
  "src/other.tsx",
  "src/animated-chart.tsx",
];

const entry_point_regex = /^src\/([a-zA-Z0-9/_-]+)\.tsx$/;

const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  plugins: [react(), windi({ config: "windi.config.ts" })],
  server: { middlewareMode: true, hmr: false },
});

export default defineConfig({
  plugins: [
    react(),
    windi({ config: "windi.config.ts" }),
    devServer(),
    ...entry_points.map(buildProductionFile),
  ],
  base: env.RUNESMITH_URL,
  define: {
    'process.env': env,
  },
  build: {
    minify: "terser",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        entry_points.map(
          (entry) => [entry.match(entry_point_regex)?.[1], resolve(__dirname, entry)],
        ),
      ),
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        manualChunks(id, meta) {
          if (id.includes("node_modules/")) {
            return "node_modules/" + id.split("node_modules/").at(-1)?.split("/")[0];
          }

          if (id.includes("src/")) {
            return id.split("src/").at(-1)?.replace(/\.[jt]sx?$/, "");
          }

          if (id.includes("@windicss/windi.css")) return "index";
        },
      },
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});

await vite.close();

function buildProductionFile(entry_point: string): PluginOption {
  return {
    name: "generate-html",
    closeBundle: async () => {
      const module_name = entry_point.match(entry_point_regex)?.[1];
      if (!module_name) throw new Error("Invalid module name");

      const { default: App } = await vite.ssrLoadModule(entry_point);
      const appHtml = renderToString(React.createElement(App));

      const title = module_name.split('/').at(-1) ?? "Untitled";
      const html = /* html */ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title[0]?.toUpperCase() + title.slice(1)} Micro-Frontend</title>
            <link rel="stylesheet" crossorigin href="${env.RUNESMITH_URL}/assets/index.css" />
            <script type="module" crossorigin src="${env.RUNESMITH_URL}/assets/${module_name}.js" defer></script>
            <!--injectable-->
          </head>
          <body>
            <div id="root">${appHtml}</div>
          </body>
        </html>
      `.replaceAll(/\n\s{8}/g, "\n")
        .trim()
        .concat("\n");

      const destination = `dist/${module_name}.html`;
      const dir = dirname(destination);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destination, html);
    },
  };
}

function devServer(): PluginOption {
  return {
    name: 'dev-server',
    apply: 'serve',
    transformIndexHtml: {
      async handler(html, { originalUrl }) {
        if (originalUrl === "/") throw new Error("Do you actually have a root route?");
        const { default: App } = await vite.ssrLoadModule(`src${originalUrl}.tsx`);
        const appHtml = renderToString(React.createElement(App));

        html = html.replace('<!--injectable-->', `<script type="module" src="src${originalUrl}.tsx"></script>`);
        return html.replace('<!--content-->', appHtml);
      },
    },
  };
}
