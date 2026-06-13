import type { ApiProject } from '@deepnote/runtime-server/types'
import { expectTypeOf, it } from 'vitest'
import type { fetchProject } from './fetchProject'

// COMPILE-TIME contract drift-catch (design Phase 3 test strategy, constraint C1).
//
// `fetchProject`'s resolved value IS the imported `ApiProject` — never a re-declared local
// shape — so a server-side contract change the SPA hasn't absorbed becomes a TYPE error
// here, not silent runtime drift. There is no second shape to drift *from*. This file is
// type-only: it is compiled by `tsc -p tsconfig.json` (the studio `typecheck`) and by
// `vitest --typecheck`; it asserts nothing at runtime.
it('fetchProject resolves to the imported ApiProject envelope', () => {
  expectTypeOf<Awaited<ReturnType<typeof fetchProject>>>().toEqualTypeOf<ApiProject>()
})
