import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Load-bearing isolation invariants for apps/studio (LUIVIEW1 step 2, ADR-006 / ADR-007 §3).
//
// These run in the node-env backend suite (NOT the jsdom studio project) because they
// inspect the backend's own compiler output and the packages/* manifests. The capstone
// assertion is `tsc -p tsconfig.json --listFiles` naming ZERO apps/ files: the frontend is
// walled off so thoroughly the backend's TypeScript compiler never even sees apps/studio.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('apps/studio isolation invariant (ADR-006 / ADR-007)', () => {
  // The assertion is over which files the root project INCLUDES (the module graph the
  // compiler resolves), not whether they typecheck — so we use `--listFilesOnly`, which
  // skips type-checking and runs in ~3s instead of a full ~45s compile (the backend's actual
  // typecheck is separately covered by `pnpm typecheck`). The explicit timeout keeps this
  // robust on the constrained CI box where the global testTimeout is tightened to 30s.
  it('the root typecheck names zero apps/ files (tsc -p tsconfig.json --listFilesOnly)', { timeout: 60_000 }, () => {
    // Resolve the workspace-local tsc so the test does not depend on a global install.
    const tscBin = path.resolve(repoRoot, 'node_modules', '.bin', 'tsc')
    let listing: string
    try {
      listing = execFileSync(tscBin, ['-p', 'tsconfig.json', '--listFilesOnly'], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
    } catch (error) {
      // --listFilesOnly skips type-checking, so tsc should exit 0; if a config error makes it
      // exit non-zero, the file listing is still emitted to stdout — surface it for the assertion.
      const stdout = (error as { stdout?: Buffer | string }).stdout
      if (stdout == null) throw error
      listing = stdout.toString()
    }

    const appsFiles = listing
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      // Normalise to repo-relative and match a real apps/ source path (not node_modules).
      .map(line => path.relative(repoRoot, line))
      .filter(rel => !rel.startsWith('..') && !rel.includes('node_modules'))
      .filter(rel => rel === 'apps' || rel.startsWith(`apps${path.sep}`))

    expect(appsFiles, `root tsc must not name any apps/ file; saw:\n${appsFiles.join('\n')}`).toEqual([])
  })

  it('no packages/* manifest declares a frontend dependency (R1 backend boundary)', () => {
    const frontendNames = [
      'react',
      'react-dom',
      'vite',
      '@vitejs/plugin-react',
      '@types/react',
      '@types/react-dom',
      '@testing-library/react',
      '@testing-library/dom',
      'preact',
      'solid-js',
      'svelte',
      'jsdom',
      'happy-dom',
    ]
    const packagesDir = path.join(repoRoot, 'packages')
    const offenders: string[] = []

    for (const pkg of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue
      const manifestPath = path.join(packagesDir, pkg.name, 'package.json')
      let manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      } catch {
        continue
      }
      const declared = { ...manifest.dependencies, ...manifest.devDependencies }
      for (const name of frontendNames) {
        if (name in declared) offenders.push(`packages/${pkg.name} → ${name}`)
      }
    }

    expect(offenders, `no packages/* may depend on a frontend lib; saw:\n${offenders.join('\n')}`).toEqual([])
  })

  it('apps/studio imports no Node builtin and no server runtime value (R2 one-way boundary)', () => {
    const studioSrc = path.join(repoRoot, 'apps', 'studio', 'src')
    const offenders: string[] = []

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue
        const source = readFileSync(full, 'utf8')
        const rel = path.relative(repoRoot, full)
        // No `node:` builtins, no bare Node core modules, no runtime-server runtime entry.
        if (/from\s+['"]node:/.test(source)) offenders.push(`${rel}: imports a node: builtin`)
        if (/from\s+['"]@deepnote\/runtime-server['"]/.test(source)) {
          offenders.push(`${rel}: imports the runtime-server runtime entry (types subpath only)`)
        }
      }
    }
    walk(studioSrc)

    expect(offenders, `apps/studio must stay Node-free;\n${offenders.join('\n')}`).toEqual([])
  })

  it('ExecutionClient imports the WS/HTTP contract type-only and uses only browser globals (LUIRUN1 step 2)', () => {
    // The execution transport seam is the FIRST runtime (non-type) backend interaction the SPA
    // has (design m3-s3 Phase 1, KD-2/R6). Its boundary is load-bearing: the WS/HTTP SHAPES must
    // be `import type` from the Node-free `/types` entry, and the TRANSPORT must be the browser
    // `fetch`/`WebSocket` globals — never a backend runtime value, never a `node:` builtin.
    const clientPath = path.join(repoRoot, 'apps', 'studio', 'src', 'execution', 'ExecutionClient.ts')
    const source = readFileSync(clientPath, 'utf8')
    const offenders: string[] = []

    // Every `@deepnote/runtime-server` import in this file must be a TYPE import (`import type …`),
    // and it must come from the `/types` subpath, never the bare runtime entry.
    const importRe = /import\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"](@deepnote\/runtime-server[^'"]*)['"]/g
    for (const match of source.matchAll(importRe)) {
      const isType = match[1] !== undefined
      const specifier = match[2]
      if (!isType) offenders.push(`value import of '${specifier}' (must be \`import type\`)`)
      if (specifier !== '@deepnote/runtime-server/types') {
        offenders.push(`import from '${specifier}' (only the /types subpath is allowed)`)
      }
    }
    // No node: builtin, and no runtime-core runtime value (its types ride the /types re-export).
    if (/from\s+['"]node:/.test(source)) offenders.push('imports a node: builtin')
    if (/import\s+(?!type\s)[^;]*from\s+['"]@deepnote\/runtime-core['"]/.test(source)) {
      offenders.push('value import of @deepnote/runtime-core')
    }
    // The transport must be the browser globals — the file must actually reach for them (a guard
    // against an accidental refactor to a Node http/ws client that would still pass the negative
    // checks above).
    if (!/\bnew WebSocket\(/.test(source)) offenders.push('does not use the browser WebSocket global')
    if (!/\bfetch\(/.test(source)) offenders.push('does not use the browser fetch global')

    expect(offenders, `ExecutionClient.ts must stay type-only + browser-native;\n${offenders.join('\n')}`).toEqual([])
  })
})
