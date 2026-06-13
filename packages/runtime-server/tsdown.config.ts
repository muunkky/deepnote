import { defineConfig } from 'tsdown'

export default defineConfig({
  // Two entries: the Node host (`index`) and the Node-free contract (`api-types`),
  // matching the `exports` map (`.` → index, `./types` → api-types) per ADR-007 §6.
  entry: ['src/index.ts', 'src/api-types.ts'],
  format: ['esm', 'cjs'],
  dts: true,
})
