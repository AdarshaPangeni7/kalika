import assert from 'node:assert/strict';
import worker from '../worker.mjs';
const env={ASSETS:{fetch:async()=>new Response('safe',{headers:{'Content-Type':'text/html'}})}};
for(const url of ['http://www.kalikatools.com/tools/merge-pdf.html?lang=en','https://www.kalikatools.com/tools/merge-pdf/','http://kalikatools.com/tools/merge-pdf']){
 const r=await worker.fetch(new Request(url),env);assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://kalikatools.com/tools/merge-pdf'+(url.includes('?')?'?lang=en':''));
 assert.equal(r.headers.get('X-Frame-Options'),'DENY');
}
for(const route of ['/','/tools/document-scanner','/tools/jpg-to-pdf','/not-found']){
 const r=await worker.fetch(new Request('https://kalikatools.com'+route),env);
 assert.match(r.headers.get('Permissions-Policy'),route==='/tools/document-scanner'?/camera=\(self\)/:/camera=\(\)/);
 assert.match(r.headers.get('Content-Security-Policy-Report-Only'),/worker-src 'self' blob:/);
 assert.doesNotMatch(r.headers.get('Content-Security-Policy-Report-Only'),/script-src [^;]*'unsafe-(inline|eval)'/);
 assert.equal(r.headers.get('Cache-Control'),'public, max-age=0, must-revalidate, no-transform');
}
const enforced=await worker.fetch(new Request('https://kalikatools.com/'),{...env,CSP_ENFORCE:'true'});
assert.equal(enforced.headers.get('Content-Security-Policy-Report-Only'),null);
assert.match(enforced.headers.get('Content-Security-Policy'),/default-src/);
assert.equal((await worker.fetch(new Request('https://kalikatools.com/',{method:'POST',body:'ignored'}),env)).status,405);
console.log('PASS: canonical redirects in one hop, security headers, camera scope, cache policy and CSP enforcement switch.');
