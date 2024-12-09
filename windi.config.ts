import { defineConfig } from "vite-plugin-windicss";

export default defineConfig({
  preflight: true,
  transformCSS: 'pre',
  plugins: [
    function customGlobalStyles({ addBase }: any) {
      addBase({
        '*': {
          '-webkit-tap-highlight-color': 'transparent',
        }
      });
    },
  ],
  extract: {
    include: ['src/**/*.{vue,html,jsx,tsx}'],
  },
});
