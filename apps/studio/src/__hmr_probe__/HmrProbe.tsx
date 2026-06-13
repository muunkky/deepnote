// HMR probe — the live edit→reflect target for the timed HMR test (apps/studio/e2e).
// The test renders this component, edits the marker literal below in the real source file,
// and asserts the running browser DOM updates within an HMR cycle via a React Fast Refresh
// HOT update (no full reload). It is NOT imported by the app shell; it exists solely so the
// HMR proof edits a real source file under apps/studio/src without touching shell code. The
// edit is restored after the test.
//
// IMPORTANT for the hot-update assertion: this module must export ONLY the component, and
// the marker must be a literal *inside* it. React Fast Refresh only accepts a module as an
// HMR boundary when its exports are all components — an extra `export const` would demote the
// edit to a full page reload, which the test detects (and would then fail).
export function HmrProbe() {
  return <div data-testid='hmr-probe'>{'HMR_PROBE_V1'}</div>
}
