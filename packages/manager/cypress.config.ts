import { defineConfig } from 'cypress';
import cypressOnFix from 'cypress-on-fix';

// ** The missing import for code coverage **
import codeCoverageTask from '@cypress/code-coverage/task';

import cypressViteConfig from './cypress/vite.config';

// Plugin imports
import { setupPlugins } from './cypress/support/plugins';
import { configureApi } from './cypress/support/plugins/configure-api';
import { configureBrowser } from './cypress/support/plugins/configure-browser';
import { configureFileWatching } from './cypress/support/plugins/configure-file-watching';
import { configureMultiReporters } from './cypress/support/plugins/configure-multi-reporters';
import { discardPassedTestRecordings } from './cypress/support/plugins/discard-passed-test-recordings';
import { featureFlagOverrides } from './cypress/support/plugins/feature-flag-override';
import { fetchAccount } from './cypress/support/plugins/fetch-account';
import { fetchLinodeClusters } from './cypress/support/plugins/fetch-linode-clusters';
import { fetchLinodeImages } from './cypress/support/plugins/fetch-linode-images';
import { fetchLinodeRegions } from './cypress/support/plugins/fetch-linode-regions';
import { generateTestWeights } from './cypress/support/plugins/generate-weights';
import { enableHtmlReport } from './cypress/support/plugins/html-report';
import {
  enableJunitComponentReport,
  enableJunitE2eReport,
} from './cypress/support/plugins/junit-report';
import { loadEnvironmentConfig } from './cypress/support/plugins/load-env-config';
import { nodeVersionCheck } from './cypress/support/plugins/node-version-check';
import {
  clusterOverrideCheck,
  regionOverrideCheck,
} from './cypress/support/plugins/override-check';
import { postRunCleanup } from './cypress/support/plugins/post-run-cleanup';
import { resetUserPreferences } from './cypress/support/plugins/reset-user-preferences';
import { splitCypressRun } from './cypress/support/plugins/split-run';
import { logTestTagInfo } from './cypress/support/plugins/test-tagging-info';
import { vitePreprocess } from './cypress/support/plugins/vite-preprocessor';

// This variable is only for Vite config, not needed here (Vite uses its own config file)
// const isE2ECoverage = !!process.env.CYPRESS_COVERAGE || !!process.env.COVERAGE;

export default defineConfig({
  trashAssetsBeforeRuns: false,
  chromeWebSecurity: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  requestTimeout: 30000,
  responseTimeout: 80000,
  defaultCommandTimeout: 80000,
  pageLoadTimeout: 60000,
  projectId: '5rhsif',
  screenshotOnRunFailure: true,
  video: true,
  retries: 0,
  experimentalMemoryManagement: true,

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: cypressViteConfig,
    },
    indexHtmlFile: './cypress/support/component/index.html',
    supportFile: './cypress/support/component/setup.tsx',
    specPattern: './cypress/component/**/*.spec.tsx',
    viewportWidth: 500,
    viewportHeight: 500,

    setupNodeEvents(cypressOn, config) {
      const on = cypressOnFix(cypressOn);
      // Add code coverage task for component testing
      codeCoverageTask(on, config);
      return setupPlugins(on, config, [
        loadEnvironmentConfig,
        discardPassedTestRecordings,
        enableJunitComponentReport,
        enableHtmlReport,
        configureMultiReporters,
      ]);
    },
  },

  e2e: {
    experimentalRunAllSpecs: true,
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/core/**/*.spec.{ts,tsx}',
    setupNodeEvents(cypressOn, config) {
      const on = cypressOnFix(cypressOn);
      // Add code coverage task for e2e testing
      codeCoverageTask(on, config);
      return setupPlugins(on, config, [
        loadEnvironmentConfig,
        nodeVersionCheck,
        configureApi,
        configureFileWatching,
        configureBrowser,
        vitePreprocess,
        discardPassedTestRecordings,
        fetchAccount,
        fetchLinodeRegions,
        fetchLinodeClusters,
        fetchLinodeImages,
        resetUserPreferences,
        regionOverrideCheck,
        clusterOverrideCheck,
        featureFlagOverrides,
        logTestTagInfo,
        splitCypressRun,
        generateTestWeights,
        enableJunitE2eReport,
        enableHtmlReport,
        configureMultiReporters,
        postRunCleanup,
      ]);
    },
  },
});