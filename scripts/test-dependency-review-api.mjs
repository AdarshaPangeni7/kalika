import assert from 'node:assert/strict';
import {listOpen} from './dependency-review-api.mjs';
let calls=0;
const data=await listOpen('issues',{token:'ephemeral-test',fetcher:async(url,options)=>{
 assert.ok(url.startsWith('https://api.github.com/repos/AdarshaPangeni7/kalika/issues?'));
 assert.equal(options.headers.Authorization,'Bearer ephemeral-test');
 return Response.json(++calls===1?Array.from({length:100},(_,id)=>({id})):[{id:100}]);
}});
assert.equal(data.length,101);assert.equal(calls,2);
await assert.rejects(listOpen('pulls',{fetcher:async()=>new Response('',{status:403,headers:{'x-ratelimit-remaining':'0'}})}),/API rate limit reached/);
await assert.rejects(listOpen('https://outside.example'),/Unsupported/);
console.log('PASS dependency review API: authenticated reads, pagination, explicit rate-limit failures and fixed endpoints.');
