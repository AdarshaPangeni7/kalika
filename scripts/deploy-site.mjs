import {command} from './local-utils.mjs';
import {submitIndexNow} from './indexnow.mjs';
try{console.log(await command(process.cwd(),process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy']));}catch(e){console.error('Deployment failed:',e.message);process.exit(1);}
try{console.log((await submitIndexNow(process.cwd())).message);}catch(e){console.error('The site deployed, but its IndexNow notification needs a retry:',e.message);process.exitCode=1;}
