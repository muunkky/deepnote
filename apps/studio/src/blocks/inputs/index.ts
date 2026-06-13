// Barrel for the eight read-only input renderers (design Phase 8a). Each kind lives in its
// own file and is re-exported here so the registry seam in `BlockRenderer.tsx` can register
// all eight `input-*` keys from a single import — additive, keep-both-mergeable with the
// sibling 7x cards' registry edits.
export { InputCheckboxRenderer } from './InputCheckboxRenderer'
export { InputDateRangeRenderer } from './InputDateRangeRenderer'
export { InputDateRenderer } from './InputDateRenderer'
export { InputFileRenderer } from './InputFileRenderer'
export { InputSelectRenderer } from './InputSelectRenderer'
export { InputSliderRenderer } from './InputSliderRenderer'
export { InputTextareaRenderer } from './InputTextareaRenderer'
export { InputTextRenderer } from './InputTextRenderer'
