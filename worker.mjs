import manifest from './config/security-manifest.json' with {type:'json'};
import {handleAdmin} from './admin-worker.mjs';

// Edge response policy only: no request bodies, uploaded files, storage or telemetry.
export function securityHeaders(pathname,env={},hashes=[]){
 const scripts=["'self'",'https://www.googletagmanager.com',...hashes];
 // PDF.js uses local WebAssembly codecs for some PDF images. This does not enable JS eval.
 if(pathname.startsWith('/tools/')||pathname.startsWith('/js/'))scripts.push("'wasm-unsafe-eval'");
 const policy=["default-src 'self'",`script-src ${scripts.join(' ')}`,"script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'","font-src 'self' data:",
  "img-src 'self' data: blob: https://www.google-analytics.com https://region1.google-analytics.com",
  "connect-src 'self' https://api.frankfurter.dev https://open.er-api.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
  "worker-src 'self' blob:","media-src 'self' blob:","frame-src 'none'","frame-ancestors 'none'","base-uri 'self'","form-action 'self'","object-src 'none'"].join('; ');
 const headers=new Headers({
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin','Cross-Origin-Opener-Policy':'same-origin',
  'Permissions-Policy':`camera=${pathname==='/tools/document-scanner'?'(self)':'()'}, microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=(), serial=(), hid=(), browsing-topics=()`,
  'Content-Security-Policy':env.CSP_ENFORCE==='true'?policy:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
 });
 if(env.CSP_ENFORCE!=='true')headers.set('Content-Security-Policy-Report-Only',policy);
 return headers;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),canonicalHost=env.LOCAL_DEV!=='true'&&['kalikatools.com','www.kalikatools.com'].includes(url.hostname);
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/'))return handleAdmin(request,env);
  const pathname=Object.hasOwn(manifest.aliases,url.pathname)?manifest.aliases[url.pathname]:url.pathname;
  const page=Object.hasOwn(manifest.pages,pathname)?manifest.pages[pathname]:null;
  let response;
  if((canonicalHost&&(url.protocol!=='https:'||url.hostname!=='kalikatools.com'))||pathname!==url.pathname){
   url.pathname=pathname;if(canonicalHost){url.protocol='https:';url.hostname='kalikatools.com';url.port='';}
   response=new Response(null,{status:301,headers:{Location:url.href}});
  }else if(!['GET','HEAD'].includes(request.method)){
   response=new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Content-Type':'text/plain;charset=utf-8'}});
  }else{
   const assetURL=new URL(request.url);if(page)assetURL.pathname=page.asset;
   response=await env.ASSETS.fetch(new Request(assetURL,request));
   response=new Response(response.body,response);
  }
  for(const [key,value] of securityHeaders(pathname,env,page?.hashes))response.headers.set(key,value);
  const html=response.headers.get('Content-Type')?.includes('text/html');
  // Keep served HTML intact: Cloudflare must not inject an ungated RUM beacon
  // or other scripts outside the site's consent-controlled analytics loader.
  response.headers.set('Cache-Control',response.status!==200?'no-store':html?'public, max-age=0, must-revalidate, no-transform':'public, max-age=3600, must-revalidate');
  // Unversioned assets are deliberately NOT immutable: updates must reach repeat visitors.
  if(!canonicalHost)response.headers.set('X-Robots-Tag','noindex');
  return response;
 }
};
