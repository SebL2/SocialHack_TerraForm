import {defineConfig,type Plugin,type ViteDevServer,type PreviewServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const requests=new Map<string,Promise<string>>();
const directory=resolve('.cache/map');
function middleware(server:ViteDevServer|PreviewServer){server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url||'/', 'http://localhost');if(url.pathname!=='/api/map-chunk')return next();
 const key=url.searchParams.get('key')||'';if(!/^-?\d{1,5},-?\d{1,5}$/.test(key)){res.statusCode=400;res.end('Invalid chunk');return;}
 const [x,z]=key.split(',').map(Number),size=256,lonScale=111320*Math.cos(37.77625*Math.PI/180),west=-122.4335+x*size/lonScale,east=west+size/lonScale,north=37.77625-z*size/111320,south=north-size/111320;
 if(west< -180||east>180||south< -85||north>85){res.statusCode=400;res.end('Outside map coverage');return;}
 try{let promise=requests.get(key);if(!promise){promise=(async()=>{const file=resolve(directory,key+'.osm');try{return await readFile(file,'utf8');}catch{}const response=await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${west},${south},${east},${north}`,{headers:{'User-Agent':'TestGameEducationalPrototype/0.1'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(`OSM ${response.status}`);const text=await response.text();await mkdir(directory,{recursive:true});await writeFile(file,text);return text;})();requests.set(key,promise);promise.catch(()=>requests.delete(key));}
 const xml=await promise;res.setHeader('Content-Type','application/xml');res.setHeader('Cache-Control','public, max-age=604800, immutable');res.end(xml);
 }catch{res.statusCode=503;res.end('Map data temporarily unavailable.');}
 });}
const mapChunks:Plugin={name:'local-map-chunks',configureServer:middleware,configurePreviewServer:middleware};
export default defineConfig({plugins:[react(),tailwindcss(),mapChunks],resolve:{alias:{'@':resolve('src')}},server:{port:5173},build:{chunkSizeWarningLimit:1800}});
