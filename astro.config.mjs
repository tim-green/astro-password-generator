// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import aiRobotsTxt from 'astro-ai-robots-txt';

import favicons from 'astro-favicons';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), aiRobotsTxt(), favicons()],
  vite: {
    plugins: [tailwindcss()]
  }
});