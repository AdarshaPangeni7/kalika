export async function listOpen(endpoint,{token=process.env.GITHUB_TOKEN,fetcher=fetch}={}){
 if(!['pulls','issues'].includes(endpoint))throw Error('Unsupported dependency review endpoint');
 const all=[];
 for(let page=1;page<=10;page++){
  const r=await fetcher(`https://api.github.com/repos/AdarshaPangeni7/kalika/${endpoint}?state=open&per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Kalika-maintenance',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`GitHub ${endpoint}: HTTP ${r.status}${r.headers.get('x-ratelimit-remaining')==='0'?' (API rate limit reached)':''}`);
  const data=await r.json();if(!Array.isArray(data))throw Error('Invalid GitHub response');
  all.push(...data);if(data.length<100)return all;
 }
 throw Error('GitHub result limit reached; update report incomplete.');
}
