const ISSUER='https://token.actions.githubusercontent.com';
const bytes=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function verifyReportToken(token,fetcher=fetch){
 try{
  if(!token||token.length>16000)return null;
  const parts=token.split('.');if(parts.length!==3)return null;
  const header=JSON.parse(new TextDecoder().decode(bytes(parts[0]))),claims=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  const now=Date.now()/1000;
  if(header.alg!=='RS256'||!header.kid||claims.iss!==ISSUER||claims.aud!=='https://kalikatools.com/admin/api/ingest'||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.nbf)||claims.nbf>now+30||!Number.isFinite(claims.iat)||claims.iat>now+30||now-claims.iat>600)return null;
  if(claims.repository_id!=='1372570270'||claims.repository_owner_id!=='140908479'||claims.repository!=='AdarshaPangeni7/kalika'||claims.ref!=='refs/heads/main'||claims.workflow_ref!=='AdarshaPangeni7/kalika/.github/workflows/kalika-maintenance.yml@refs/heads/main'||!['schedule','workflow_dispatch'].includes(claims.event_name)||!/^\d+$/.test(claims.run_id))return null;
  const r=await fetcher(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});if(!r.ok)return null;
  const jwk=(await r.json()).keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256');if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))?claims:null;
 }catch{return null;}
}
