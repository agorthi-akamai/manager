import react from '@vitejs/plugin-react-swc';
import { URL } from 'url';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

import { urlCanParsePolyfill } from './src/polyfills/urlCanParse';
import istanbul from 'vite-plugin-istanbul';

// ESM-friendly alternative to `__dirname`.
const DIRNAME = new URL('.', import.meta.url).pathname;

// Only enable Istanbul for coverage runs (Cypress)
const isE2ECoverage = !!process.env.COVERAGE || !!process.env.CYPRESS_COVERAGE;

export default defineConfig({
  build: {
    outDir: 'build',
  },
  envPrefix: 'REACT_APP_',
  plugins: [
    react(),
    svgr({ svgrOptions: { exportType: 'default' }, include: '**/*.svg' }),
    urlCanParsePolyfill(),
    ...(isE2ECoverage
      ? [
          istanbul({
            include: 'src/**/*.{js,jsx,ts,tsx}',
            extension: ['.js', '.jsx', '.ts', '.tsx'],
            cypress: true,
            requireEnv: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      src: `${DIRNAME}/src`,
    },
  },
  server: {
    allowedHosts: ['cloud.lindev.local'],
    port: 3000,
  },
  test: {
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      exclude: [
        'src/**/*.constants.{js,jsx,ts,tsx}',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/index.{js,jsx,ts,tsx}',
        'src/**/*.styles.{js,jsx,ts,tsx}',
      ],
      include: [
        'src/components/**/*.{js,jsx,ts,tsx}',
        'src/hooks/*.{js,jsx,ts,tsx}',
        'src/utilities/**/*.{js,jsx,ts,tsx}',
        'src/**/*.utils.{js,jsx,ts,tsx}',
      ],
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testSetup.ts',
  },
});