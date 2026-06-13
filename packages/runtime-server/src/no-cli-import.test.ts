import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * ADR-007 §1/§4 boundary capstone: the dependency arrow is one-way — `@deepnote/cli` may depend
 * on `@deepnote/runtime-server`, but **`runtime-server` must NEVER import `@deepnote/cli`**.
 * Inverting it would pull CLI/terminal concerns into the publishable server package and defeat the
 * KD-3 lift (the integration helpers were lifted into `runtime-core` precisely so the server could
 * reach `run`'s parity without reaching back into cli).
 *
 * Mechanism (mirrors `api-types-no-runtime-import.test.ts`, the step-2 / `87ifqe` invariant): scan
 * every `runtime-server` source file with the in-repo TypeScript compiler and inspect the **resolved
 * AST** for any module reference whose specifier is `@deepnote/cli` (or a deep subpath of it). The
 * AST walk is more precise than string-grep — it ignores the specifier inside a comment or string
 * literal and catches both `import` and re-`export` forms, value or type-only. `madge` /
 * `dependency-cruiser` are not installed in this repo, so this compiler-API test IS the boundary check.
 *
 * Non-vacuity guard: the scan must actually find source files and actually parse `@deepnote/...`
 * references, so a future refactor that (say) renamed the package or emptied the dir can't make this
 * assertion silently pass over nothing.
 */

const srcDir = fileURLToPath(new URL('.', import.meta.url))

/** Recursively collect every `.ts` source file under `dir`, excluding test files. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full))
      continue
    }
    if (!entry.endsWith('.ts')) continue
    // Exclude test files — the boundary applies to shipped source; this very test imports `ts`
    // but never `@deepnote/cli`, and excluding tests keeps the invariant about the package's
    // real dependency graph.
    if (entry.endsWith('.test.ts')) continue
    out.push(full)
  }
  return out
}

/** Every module specifier referenced via `import`/`export … from '…'` in a source string. */
function collectModuleSpecifiers(source: string, fileName: string): string[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true)
  const specifiers: string[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text)
    } else if (
      // Also catch dynamic `import('…')` (a runtime edge the static forms above miss).
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

const isCliSpecifier = (s: string): boolean => s === '@deepnote/cli' || s.startsWith('@deepnote/cli/')

describe('ADR-007 boundary: runtime-server NEVER imports @deepnote/cli', () => {
  const sourceFiles = collectSourceFiles(srcDir)

  it('scans a non-trivial set of source files with real @deepnote module references (non-vacuity)', () => {
    expect(sourceFiles.length).toBeGreaterThan(3)
    const allSpecifiers = sourceFiles.flatMap(f => collectModuleSpecifiers(readFileSync(f, 'utf8'), f))
    // The scanner genuinely parses workspace imports (e.g. `@deepnote/runtime-core`/`blocks`),
    // so a finding of "no cli import" is a real absence, not an empty scan.
    expect(allSpecifiers.some(s => s.startsWith('@deepnote/'))).toBe(true)
  })

  it('no runtime-server source file imports or re-exports @deepnote/cli', () => {
    const offenders: { file: string; specifier: string }[] = []
    for (const file of sourceFiles) {
      for (const specifier of collectModuleSpecifiers(readFileSync(file, 'utf8'), file)) {
        if (isCliSpecifier(specifier)) {
          offenders.push({ file, specifier })
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
