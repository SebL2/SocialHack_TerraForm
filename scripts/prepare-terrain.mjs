import fs from 'node:fs/promises';
import {fromUrl,fromArrayBuffer} from 'geotiff';
const sites=JSON.parse(await fs.readFile('src/data/global-landscapes.json','utf8'));
const result={};
for(const [id,site] of Object.entries(sites)){
 const [w,s,e,n]=site.bbox,lat=Math.floor(s),lng=Math.floor(w),tile=`Copernicus_DSM_COG_10_${lat<0?'S':'N'}${String(Math.abs(lat)).padStart(2,'0')}_00_${lng<0?'W':'E'}${String(Math.abs(lng)).padStart(3,'0')}_00_DEM`,source=`https://copernicus-dem-30m.s3.amazonaws.com/${tile}/${tile}.tif`;
 const t=await fromUrl(source),im=await t.getImage(),[ox,oy]=im.getOrigin(),[rx,ry]=im.getResolution();
 const west=Math.floor((w-ox)/rx),east=Math.ceil((e-ox)/rx),north=Math.floor((n-oy)/ry),south=Math.ceil((s-oy)/ry),window=[west,north,east,south];
 const a=await im.readRasters({window,width:65,height:65,resampleMethod:'bilinear'});
 result[id]={source,width:65,height:65,bbox:{xmin:ox+west*rx,xmax:ox+east*rx,ymin:oy+south*ry,ymax:oy+north*ry},heights:Array.from(a[0]).map(v=>Math.round(v*100)/100),attribution:'Copernicus DEM GLO-30, © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018. Surface heights include vegetation and structures.'};
 console.log(id,{min:Math.min(...a[0]),max:Math.max(...a[0])});
}
await fs.writeFile('src/data/global-elevation.json',JSON.stringify(result));

const {bbox}=JSON.parse(await fs.readFile('src/data/sf-level-landcover.json','utf8'));
const source='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';
const query=new URLSearchParams({f:'json',bbox:bbox.join(','),bboxSR:'4326',imageSR:'4326',size:'65,65',format:'tiff',pixelType:'F32',interpolation:'RSP_BilinearInterpolation',noData:'-9999'});
const exportResponse=await (await fetch(source+'/exportImage?'+query)).json();
if(!exportResponse.href)throw new Error(JSON.stringify(exportResponse));
const tiff=await fromArrayBuffer(await (await fetch(exportResponse.href)).arrayBuffer()),image=await tiff.getImage(),rasters=await image.readRasters();
const heights=Array.from(rasters[0]);
if(heights.some(v=>!Number.isFinite(v)||v===-9999))throw new Error('Missing USGS elevation samples');
await fs.writeFile('src/data/alamo-elevation.json',JSON.stringify({source,bbox:exportResponse.extent,width:image.getWidth(),height:image.getHeight(),heights:heights.map(v=>Math.round(v*100)/100),attribution:'USGS 3D Elevation Program, public domain. Bilinear samples of the elevation service; not a local survey.'}));
