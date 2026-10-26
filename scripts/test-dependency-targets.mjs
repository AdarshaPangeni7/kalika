import assert from 'node:assert/strict';
import {dependencyTargets} from './dependency-targets.mjs';
const sources=[{filename:'public/js/vendor/ocr/worker.min.js',text:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/'},{filename:'public/js/app.js',text:"const src='https://cdn.jsdelivr.net/npm/example@1/file.js'; const base='https://cdn.jsdelivr.net/npm/data/';"}];
const targets=dependencyTargets(sources,{'public/js/vendor/ocr/worker.min.js':'hash','public/js/vendor/ocr/data/eng.traineddata.gz':'hash'},'https://kalikatools.com');
assert.deepEqual(targets,['https://kalikatools.com/js/vendor/ocr/worker.min.js','https://kalikatools.com/js/vendor/ocr/data/eng.traineddata.gz','https://cdn.jsdelivr.net/npm/example@1/file.js']);
assert.throws(()=>dependencyTargets([],{ '../outside':'hash'},'https://kalikatools.com'));
console.log('PASS dependency inventory: local engine/model assets and concrete app CDN assets checked; dormant upstream CDN defaults excluded.');
