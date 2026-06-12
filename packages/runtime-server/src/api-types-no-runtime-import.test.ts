import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * ADR-007 §6 invariant: `api-types.ts` is the Node-free contract module — the SPA
 * imports `@deepnote/runtime-server/types` and must never pull Node / HTTP / `ws`
 * into its type graph. The mechanism that guarantees it: the module declares
 * **only `type`/`interface`** and references other modules **only via type-only
 * imports**, which the compiler fully erases — so the emitted `api-types.js` has
 * zero `import`/`require` and the type-only consumer's graph stays Node-free.
 *
 * This is the `madge`/dependency-check the design doc (Phase 1) and ADR-007 §6
 * call for, implemented against the in-repo TypeScript compiler (no extra dep, and
 * more precise than string-presence: it inspects the *resolved AST*, so a value
 * import slips through neither `import type` sugar nor a `// react` comment). The
 * m3/s1 slice-integrity card reuses this assertion.
 */

const apiTypesPath = fileURLToPath(new URL('./api-types.ts', import.meta.url))

/** Every `import`/re-export in `api-types.ts`, with whether it is fully type-only. */
function collectModuleReferences(source: string): { specifier: string; typeOnly: boolean }[] {
  const sourceFile = ts.createSourceFile('api-types.ts', source, ts.ScriptTarget.ESNext, true)
  const refs: { specifier: string; typeOnly: boolean }[] = []

  const isTypeOnlyImport = (node: ts.ImportDeclaration): boolean => {
    const clause = node.importClause
    // `import './x'` (side-effect / runtime) — no clause means a runtime import.
    if (!clause) return false
    // `import type ...` covers the whole clause.
    if (clause.isTypeOnly) return true
    // A default or namespace binding without a top-level `type` keyword is a value import.
    if (clause.name) return false
    const named = clause.namedBindings
    if (named && ts.isNamespaceImport(named)) return false
    // `import { type A, type B }` — every named specifier must be inline-type-only.
    if (named && ts.isNamedImports(named)) {
      return named.elements.every((el) => el.isTypeOnly)
    }
    return false
  }

  const isTypeOnlyExport = (node: ts.ExportDeclaration): boolean => {
    if (node.isTypeOnly) return true
    const clause = node.exportClause
    if (clause && ts.isNamedExports(clause)) {
      return clause.elements.every((el) => el.isTypeOnly)
    }
    // `export * from '...'` is a runtime re-export.
    return false
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      refs.push({ specifier: node.moduleSpecifier.text, typeOnly: isTypeOnlyImport(node) })
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      refs.push({ specifier: node.moduleSpecifier.text, typeOnly: isTypeOnlyExport(node) })
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return refs
}

describe('api-types.ts is runtime-import-free (ADR-007 §6)', () => {
  const source = readFileSync(apiTypesPath, 'utf8')

  it('contains only type-only imports and re-exports — zero runtime import', () => {
    const refs = collectModuleReferences(source)

    // Sanity: the module *does* reference its helper-type sources (otherwise the
    // assertion is vacuous and the contract could drift undetected).
    expect(refs.length).toBeGreaterThan(0)

    const runtimeRefs = refs.filter((r) => !r.typeOnly).map((r) => r.specifier)
    expect(runtimeRefs).toEqual([])
  })

  it('emits no runtime import/require when transpiled (the erasure that makes it Node-free)', () => {
    // The behavioural proof: stripping types leaves no module reference at all, so
    // a consumer of the emitted `/types` JS pulls in nothing — no Node, no `ws`.
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    })
    expect(outputText).not.toMatch(/\bimport\b/)
    expect(outputText).not.toMatch(/\brequire\(/)
  })
})
