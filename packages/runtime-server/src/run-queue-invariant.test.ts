import { readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * **M2 — the load-bearing run-serialization invariant (design doc R4).**
 *
 * The server fronts one kernel via one sequential `ExecutionEngine`. Two overlapping
 * `engine.runProject` calls would interleave IOPub traffic onto one output handler and corrupt
 * output (ADR-005 Negative). The serialization queue (`run-queue.ts`) guarantees one run at a
 * time — but only if **no other code path can issue a run**. The design doc is explicit that an
 * ordering test "proves little" because ordering is structurally guaranteed; the *real* guarantee
 * is that `engine.runProject` (via the `session.runProject` pass-through) is reachable **only**
 * through the queue's `drain`.
 *
 * This is the lint/`madge` rule made a hard CI check. `madge`/`dependency-cruiser` are not
 * installed, so — exactly as step-2 implemented its no-runtime-import invariant — it is asserted
 * against the in-repo TypeScript compiler AST: scan every non-test source module and assert the
 * property access `.runProject` appears **only** in the two allowed files:
 *
 * - `run-queue.ts` — the sole *caller* of the run entry point (`target.runProject` inside `drain`);
 * - `session.ts` — which *defines* the pass-through and forwards to the engine (`engine.runProject`).
 *
 * Any third module (a route, a future handler) that references `.runProject` — i.e. tries to run
 * the engine outside the queue — fails this test. That is the structural no-interleave guarantee:
 * an un-serialized run cannot exist by construction.
 */

const srcDir = dirname(fileURLToPath(import.meta.url))

/** The files permitted to reference `.runProject` (the queue caller + the session pass-through). */
const ALLOWED_RUNPROJECT_FILES = new Set(['run-queue.ts', 'session.ts'])

/** Collect non-test `.ts` source files in the package `src/`. */
function sourceFiles(): string[] {
  return readdirSync(srcDir).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'))
}

/** True if `source` contains a property-access or call to a `runProject` member. */
function referencesRunProject(source: string, fileName: string): boolean {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true)
  let found = false
  const visit = (node: ts.Node): void => {
    // `x.runProject` / `x.runProject(...)` — a property access whose name is `runProject`.
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'runProject') {
      found = true
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

describe('M2: engine.runProject is referenced only by the serialization queue', () => {
  it('only run-queue.ts (caller) and session.ts (pass-through) reference .runProject', () => {
    const offenders: string[] = []
    let queueReferences = false

    for (const fileName of sourceFiles()) {
      const source = readFileSync(`${srcDir}/${fileName}`, 'utf8')
      if (!referencesRunProject(source, fileName)) {
        continue
      }
      if (fileName === 'run-queue.ts') {
        queueReferences = true
      }
      if (!ALLOWED_RUNPROJECT_FILES.has(fileName)) {
        offenders.push(fileName)
      }
    }

    // Non-vacuous: the queue MUST be a `.runProject` caller, or the invariant is empty.
    expect(queueReferences).toBe(true)
    // No other module may issue a run — that is the no-interleave guarantee by construction.
    expect(offenders).toEqual([])
  })
})
