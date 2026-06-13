import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

// The repo runs two distinct vitest projects (ADR-006 Negative consequence): the node-env
// backend suite (packages/* + test-helpers, the long-standing `.test.ts` suite) and the
// DOM-env apps/studio SPA suite (jsdom + @testing-library/react, defined in
// apps/studio/vitest.config.ts). `pnpm test` collects both. Reporter/coverage/junit output
// stay root-level (shared across projects); environment/include/setup are per-project.
export default defineConfig({
  test: {
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/test-results.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'backend',
          globals: false,
          environment: 'node',
          include: ['packages/**/*.test.ts', 'test-helpers/**/*.test.ts', 'test-fixtures/**/*.test.ts'],
          // KD-9: integration tests (real-kernel, Python-provisioning) are collected by
          // a dedicated `vitest.integration.config.ts` + `test:integration` script run
          // only in the `integration-kernels` CI job. Exclude them here so the always-on
          // mocked `pnpm test` never collects them (env-gating alone still collects the
          // file, and with `bail: 1` and no local Python that risks interference). Append
          // to vitest's defaults rather than replacing them (which would drop the built-in
          // node_modules/dist/etc. excludes).
          exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
          setupFiles: [path.resolve(__dirname, 'test-helpers/expect-url-with-query-params.ts')],
          bail: 1,
          // Constrained-environment tuning — opt-in via env only. When these env vars are unset (the
          // default, including CI and every maintainer machine) vitest uses its own defaults, so behaviour
          // is unchanged. On a low-memory / no-swap box the default worker fan-out thrashes the machine
          // (multi-minute transform/import) and the Python-subprocess tests (reactivity DAG, cli stats)
          // miss the 5s default timeout, which `bail: 1` then turns into a whole-suite failure. The local
          // dispatcher push sets VITEST_MAX_WORKERS / VITEST_TEST_TIMEOUT to run the suite reliably.
          ...(process.env.VITEST_MAX_WORKERS ? { maxWorkers: Number(process.env.VITEST_MAX_WORKERS) } : {}),
          ...(process.env.VITEST_MIN_WORKERS ? { minWorkers: Number(process.env.VITEST_MIN_WORKERS) } : {}),
          ...(process.env.VITEST_TEST_TIMEOUT ? { testTimeout: Number(process.env.VITEST_TEST_TIMEOUT) } : {}),
        },
      },
      './apps/studio/vitest.config.ts',
    ],
  },
})
