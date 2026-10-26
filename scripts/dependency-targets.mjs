// Upstream library bundles contain dormant CDN defaults. They are not an inventory
// of the URLs this application actually uses: Kalika overrides these with local assets.
export function dependencyTargets(sources,vendorManifest,origin){
 const targets=new Set();
 for(const file of Object.keys(vendorManifest)){
  if(!file.startsWith('public/js/vendor/')||file.includes('..'))throw Error('Invalid vendor asset path');
  targets.add(new URL(file.slice('public'.length),origin).href);
 }
 for(const {filename,text} of sources){
  if(filename.replaceAll('\\','/').includes('/vendor/'))continue;
  for(const match of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/[^\s'"`<>\\)]+/g)){
   const u=new URL(match[0]);
   if(/\.(?:m?js|css|wasm|gz)$/i.test(u.pathname))targets.add(u.href);
  }
 }
 return [...targets];
}
