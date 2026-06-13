import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * ADR-007 slice-integrity gate (design doc Phase 9 / test-strategy suite 7).
 *
 * The `contrib/m3-serve` diff is the upstream-ready slice: `@deepnote/runtime-server`
 * plus the `deepnote serve`/`ui` CLI delta, cut off `upstream/main` with **no `apps/`
 * SPA, no frontend framework**. This always-on test is the CI gate that keeps that
 * boundary load-bearing on the milestone branch, so a leak is caught before the slice
 * is ever cut — not after.
 *
 * ### Why not the bare `git grep -iE 'react|vite|apps/'`
 *
 * The card's literal acceptance grep is **word-boundary-free** and false-positives on
 * benign substrings with zero frontend coupling (LUI1WEDGE 87ifqe review 1, item L1):
 *
 * - `reactivity` — the legitimate `@deepnote/reactivity` dependency and the
 *   `reactivity: 'python' | 'disabled'` capability enum — contains `react`.
 * - `vitest` — the test runner — contains `vite`.
 * - `preAction`, `backward` — ordinary identifiers/prose — contain `react`.
 *
 * Shipping the broad regex as the canonical gate would make a genuinely-clean boundary
 * un-passable and pressure someone to disable it. So this gate matches the AC's *intent*
 * — a real React/Vite framework **import** or an `apps/` **import edge** — via the
 * resolved TypeScript AST (mirrors `api-types-no-runtime-import.test.ts` /
 * `no-cli-import.test.ts`, the `87ifqe` invariant). The AST is strictly more precise
 * than string-grep: it inspects module-specifier string literals only, so `reactivity`
 * in a comment, a capability enum, or the `vitest` import for the test harness can never
 * trip it.
 */

// ── Slice path resolution ──────────────────────────────────────────────────
// `import.meta.url` is `packages/runtime-server/src/slice-integrity.test.ts`; walk up to
// the repo root so the CLI serve-delta files can be reached regardless of CWD.
const srcDir = fileURLToPath(new URL('.', import.meta.url))
const runtimeServerDir = join(srcDir, '..')
const repoRoot = join(runtimeServerDir, '..', '..')

const cliServeDeltaFiles = [
  join(repoRoot, 'packages/cli/src/commands/serve.ts'),
  join(repoRoot, 'packages/cli/src/cli.ts'),
  join(repoRoot, 'packages/cli/package.json'),
]

/** Recursively collect every shipped `.ts` source file under `dir` (excludes tests). */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // `dist`/`node_modules` are build output / deps, not slice source.
      if (entry === 'dist' || entry === 'node_modules') continue
      out.push(...collectSourceFiles(full))
      continue
    }
    if (!entry.endsWith('.ts')) continue
    if (entry.endsWith('.test.ts')) continue
    out.push(full)
  }
  return out
}

/** The serve-slice TypeScript source: all of `runtime-server/src` + the CLI serve delta. */
function sliceSourceFiles(): string[] {
  const serverSrc = collectSourceFiles(srcDir)
  const cliTs = cliServeDeltaFiles.filter(f => f.endsWith('.ts') && existsSync(f))
  return [...serverSrc, ...cliTs]
}

/** Every module specifier referenced via static/dynamic `import`/`export … from '…'`. */
function collectModuleSpecifiers(source: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true)
  const specifiers: string[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (
      // Dynamic `import('…')` — a runtime edge the static forms miss.
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push((node.arguments[0] as ts.StringLiteral).text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return specifiers
}

/**
 * Does a module specifier name a frontend framework or an `apps/` SPA edge?
 *
 * Word-boundary / import-form matching, NOT substring — this is the precision the L1
 * finding demands. `@deepnote/reactivity` and `vitest` are explicitly NOT framework
 * specifiers; a planted `react` / `react-dom` / `vite` / `@vitejs/*` import, or any
 * relative/aliased path that crosses into `apps/`, IS.
 */
function isForbiddenSpecifier(specifier: string): boolean {
  // Framework packages: exact name or a deep subpath (`react/jsx-runtime`, `@vitejs/plugin-react`).
  // `\b` after the name stops `react` from matching `reactivity` and `vite` from matching `vitest`.
  if (/^(react|react-dom|react-dom\/.*|vite)\b/.test(specifier)) return true
  if (/^@vitejs(\/|$)/.test(specifier)) return true
  // `apps/` import edge — relative (`../apps/…`, `../../apps/…`) or bare (`apps/…`).
  if (/(^|\/)apps\//.test(specifier)) return true
  // `@apps/…` path-alias form (no such alias exists today, but the gate must catch the
  // edge in any plausible form rather than only the path-relative one).
  if (/^@apps(\/|$)/.test(specifier)) return true
  return false
}

describe('slice-integrity: no frontend framework / apps SPA edge in the serve slice (ADR-007 suite 7)', () => {
  const sourceFiles = sliceSourceFiles()

  it('scans a non-trivial set of slice source files including the CLI serve delta (non-vacuity)', () => {
    // Both halves of the slice must be present, or a clean result is a vacuous empty scan.
    expect(sourceFiles.length).toBeGreaterThan(3)
    expect(sourceFiles.some(f => f.endsWith('serve.ts'))).toBe(true)
    expect(sourceFiles.some(f => f.includes(join('runtime-server', 'src')))).toBe(true)

    // The scanner genuinely parses workspace imports, so "no framework import" is a real
    // absence — and crucially the slice *does* legitimately import `@deepnote/reactivity`,
    // the exact substring the bare grep chokes on.
    const allSpecifiers = sourceFiles.flatMap(f => collectModuleSpecifiers(readFileSync(f, 'utf8'), f))
    expect(allSpecifiers.some(s => s.startsWith('@deepnote/'))).toBe(true)
  })

  it('no slice source imports react/react-dom/vite/@vitejs or crosses into apps/', () => {
    const offenders: { file: string; specifier: string }[] = []
    for (const file of sourceFiles) {
      for (const specifier of collectModuleSpecifiers(readFileSync(file, 'utf8'), file)) {
        if (isForbiddenSpecifier(specifier)) {
          offenders.push({ file, specifier })
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('slice-integrity: the precision matcher (L1 — does not false-positive on reactivity/vitest)', () => {
  // Regression corpus: the precise matcher must accept every benign string the bare
  // `-iE 'react|vite|apps/'` substring grep would flag, and reject every real edge.
  const benign = [
    '@deepnote/reactivity', // the legitimate workspace dep
    'vitest', // the test runner
    './reactivity-helpers', // a relative module that merely *contains* `react`
    '@deepnote/runtime-core',
    '@deepnote/blocks',
    'ws',
    'node:fs',
    'commander',
  ]
  const forbidden = [
    'react',
    'react-dom',
    'react-dom/client',
    'react/jsx-runtime',
    'vite',
    'vite/client',
    '@vitejs/plugin-react',
    '../apps/web/main',
    '../../apps/spa/index',
    'apps/web',
    '@apps/web',
  ]

  it('accepts reactivity / vitest and every benign workspace specifier (no false positive)', () => {
    for (const s of benign) {
      expect(isForbiddenSpecifier(s), `expected benign: ${s}`).toBe(false)
    }
  })

  it('flags every real framework import and apps/ edge (non-vacuity)', () => {
    for (const s of forbidden) {
      expect(isForbiddenSpecifier(s), `expected forbidden: ${s}`).toBe(true)
    }
  })

  it('catches a PLANTED react import / apps edge in a synthetic source via the AST scan', () => {
    // End-to-end proof the matcher + AST scanner together catch a real leak — not just
    // the predicate in isolation. The synthetic file mixes a benign `reactivity` import
    // (must be ignored) with a planted `react` value import and an `apps/` edge.
    const planted = [
      `import { reactive } from '@deepnote/reactivity'`,
      `import 'react'`,
      `import { App } from '../apps/web/App'`,
      `import { describe } from 'vitest'`,
    ].join('\n')
    const specifiers = collectModuleSpecifiers(planted, 'planted.ts')
    const flagged = specifiers.filter(isForbiddenSpecifier)
    expect(flagged.sort()).toEqual(['../apps/web/App', 'react'])
  })
})
