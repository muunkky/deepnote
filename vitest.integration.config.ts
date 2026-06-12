import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

/**
 * Dedicated config for the real-kernel integration suite (design-doc Sub-phase 1C,
 * KD-9). Collects ONLY `*.integration.test.ts` files — the inverse of the default
 * `vitest.config.ts`, which excludes that glob so the always-on mocked `pnpm test`
 * never picks these up.
 *
 * These tests provision/locate a Python venv with `deepnote-toolkit[server]` +
 * `bash_kernel` and run the REAL built CLI against the REAL toolkit server. They are
 * the only place real-kernel execution happens, and run solely in the
 * `integration-kernels` CI job via the `test:integration` script.
 *
 * `RUN_INTEGRATION_TESTS=true` is a defense-in-depth runtime gate (each test
 * self-skips when it is unset or no venv is present) — NOT the collection mechanism.
 * The `exclude` glob in the default config is what keeps these out of `pnpm test`.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    include: ['**/*.integration.test.ts'],
    // Real kernels (server boot + kernel idle wait) are slower than mocked units.
    // Per-test budget covers venv-backed startup with headroom; bash reaches idle
    // sub-second once the toolkit server is up.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // No `bail` here: we want all three integration assertions (bash e2e,
    // missing-kernel legibility, python3 regression) to report independently.
  },
})
