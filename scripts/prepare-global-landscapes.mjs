import {fromUrl} from 'geotiff';
import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const sites=[
 {id:'senegal',name:'Téssékéré Ouolof · Ferlo',center:[-15.0596902,15.8574673],tile:'N15W018'},
 {id:'mongolia',name:'Khustai park approach · Töv',center:[105.8779546,47.76371],tile:'N45E105'},
 {id:'indonesia',name:'Kereng Bangkirai · Sebangau edge',center:[113.906,-2.301],tile:'S03E111'},
];
const parse=`import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read()); nodes={n.attrib['id']:{'lon':float(n.attrib['lon']),'lat':float(n.attrib['lat'])} for n in r.findall('node')}; out=[]
for w in r.findall('way'):
 tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
 if not any(k in tags for k in ['building','highway','waterway','natural','landuse','leisure']):continue
 pts=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes]
 if len(pts)>1:out.append({'id':w.attrib['id'],'tags':tags,'geometry':pts})
print(json.dumps(out))`;
const result={};
for(const site of sites){
 const [lng,lat]=site.center,bbox=[lng-.008,lat-.008,lng+.008,lat+.008];
 const rasterUrl=`https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${site.tile}_Map.tif`;
 const osmUrl=`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.join(',')}`;
 console.log('Reading',site.id);
 const [classes,response]=await Promise.all([(async()=>{const tiff=await fromUrl(rasterUrl);return Array.from(await tiff.readRasters({bbox,width:12,height:12,interleave:true,resampleMethod:'nearest'}));})(),fetch(osmUrl,{headers:{'User-Agent':'TerraFormEducationalPrototype/0.1'},signal:AbortSignal.timeout(60000)})]);
 if(!response.ok)throw new Error(`${site.id} OSM ${response.status}`);
 const parsed=spawnSync('python3',['-c',parse],{input:await response.text(),encoding:'utf8',maxBuffer:30e6});if(parsed.status!==0)throw new Error(parsed.stderr);
 if(classes.length!==144||classes.some(c=>c===0))throw new Error('Missing land-cover samples');
 const features=JSON.parse(parsed.stdout);
 result[site.id]={name:site.name,center:site.center,bbox,width:12,height:12,year:2021,rasterUrl,osmUrl,classes,features,attribution:'© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021). CC BY 4.0. © OpenStreetMap contributors, ODbL 1.0.',method:'12 × 12 nearest-neighbor representative samples of ESA WorldCover 2021 v200 across this geographic extent. Mapped OSM ways provide roads, buildings and waterways where available. Samples are not surveyed parcels; missing features are not inferred.'};
 console.log(site.id,'features',features.length,'classes', [...new Set(classes)]);
}
await writeFile('src/data/global-landscapes.json',JSON.stringify(result));
