import assert from 'node:assert/strict';
import {workflowSummary} from './summarize-workflow-checks.mjs';
const result=workflowSummary({pdf:{outcome:'success'},quality:{outcome:'failure'},ocr:{outcome:'skipped'},scanner:{outcome:'cancelled'},unknown:{outcome:'success',outputs:{secret:'must not appear'}}});
assert.match(result,/PDF tools: passed/);
assert.match(result,/Accessibility and Lighthouse: FAILED/);
assert.match(result,/Private OCR: not run for this schedule/);
assert.match(result,/Document scanner: CANCELLED/);
assert.doesNotMatch(result,/must not appear|unknown/);
console.log('PASS workflow summary: passed, failed, skipped and cancelled checks remain distinct; unknown data excluded.');
