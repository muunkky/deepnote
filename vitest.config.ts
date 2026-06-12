import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    include: ['**/*.test.ts'],
    // KD-9: integration tests (real-kernel, Python-provisioning) are collected by
    // a dedicated `vitest.integration.config.ts` + `test:integration` script run
    // only in the `integration-kernels` CI job. Exclude them here so the always-on
    // mocked `pnpm test` never collects them (env-gating alone still collects the
    // file, and with `bail: 1` and no local Python that risks interference). Append
    // to vitest's defaults rather than replacing them (which would drop the built-in
    // node_modules/dist/etc. excludes).
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
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
    setupFiles: [path.resolve(__dirname, 'test-helpers/expect-url-with-query-params.ts')],
    bail: 1,
  },
})
