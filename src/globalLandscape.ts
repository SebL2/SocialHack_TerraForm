import snapshots from './data/global-landscapes.json';
import polygonClipping from 'polygon-clipping';
import {rotateGrid,unrotateGrid,projectGridSwing,unprojectGridSwing} from './gridRotation';
export type GlobalSiteId='senegal'|'mongolia'|'indonesia';
export type MapFeature={id:string;tags:Record<string,string>;geometry:{lon:number;lat:number}[]};
export type Site={name:string;center:number[];bbox:number[];width:number;height:number;year:number;rasterUrl:string;osmUrl:string;classes:number[];features:MapFeature[];attribution:string;method:string};
export const GLOBAL_SITES=snapshots as unknown as Record<GlobalSiteId,Site>;
export function globalMapPoint(id:GlobalSiteId,lng:number,lat:number){const s=GLOBAL_SITES[id],[w,so,e,n]=s.bbox;return{x:(lng-w)/(e-w)*s.width,y:(n-lat)/(n-so)*s.height};}
export function globalCellCenter(id:GlobalSiteId,patch:number){const s=GLOBAL_SITES[id];if(!Number.isInteger(patch)||patch<0||patch>=s.width*s.height)throw new Error('Invalid land patch');return{lng:s.bbox[0]+(patch%s.width+.5)/s.width*(s.bbox[2]-s.bbox[0]),lat:s.bbox[3]-(Math.floor(patch/s.width)+.5)/s.height*(s.bbox[3]-s.bbox[1])};}
export function globalPatchAt(id:GlobalSiteId,lng:number,lat:number){const s=GLOBAL_SITES[id],p=globalMapPoint(id,lng,lat);return p.x>=0&&p.x<s.width&&p.y>=0&&p.y<s.height?Math.floor(p.y)*s.width+Math.floor(p.x):null;}
export function projectGlobal(x:number,y:number,turns=0,top:boolean|number=false){const t=typeof top==='boolean'?(top?1:0):top,r=rotateGrid(x,y,turns,12,12),p=projectGridSwing(r.x-6,r.y-6,t),scale=50-20*t;return{x:500+p.x*scale,y:315+25*t+p.y*scale};}
export function inverseGlobal(x:number,y:number,turns=0,top:boolean|number=false){const t=typeof top==='boolean'?(top?1:0):top,scale=50-20*t,p=unprojectGridSwing((x-500)/scale,(y-315-25*t)/scale,t);return unrotateGrid(p.x+6,p.y+6,turns,12,12);}

const cache=new Map<string,{id:string;tags:Record<string,string>;polygons:polygonClipping.MultiPolygon;line:{x:number;y:number}[]}[]>();
export function globalFeatures(id:GlobalSiteId){
 if(cache.has(id))return cache.get(id)!;
 const extent:polygonClipping.Polygon=[[[0,0],[12,0],[12,12],[0,12],[0,0]]];
 const features=GLOBAL_SITES[id].features.flatMap(f=>{
  const line=f.geometry.map(p=>globalMapPoint(id,p.lon,p.lat));
  const a=f.geometry[0],b=f.geometry.at(-1)!,closed=a.lon===b.lon&&a.lat===b.lat;
  const area=closed&&(f.tags.building||f.tags.natural==='water'||f.tags.natural==='wetland'||f.tags.natural==='wood'||['forest','meadow','grass','farmland','reservoir','basin'].includes(f.tags.landuse));
  let polygons:polygonClipping.MultiPolygon=[];
  if(area){const ring:polygonClipping.Pair[]=line.map(p=>[Math.round(p.x*1e6)/1e6,Math.round(p.y*1e6)/1e6]);polygons=polygonClipping.intersection([ring],extent);}
  if(!area&&!f.tags.highway&&!f.tags.waterway)return[];
  return[{id:f.id,tags:f.tags,polygons,line:area?[]:line}];
 });
 cache.set(id,features);return features;
}
export function landColor(id:GlobalSiteId,code:number){
 const palettes:Record<GlobalSiteId,Record<number,string>>={senegal:{10:'#8d9b69',20:'#a6a774',30:'#b8b381',40:'#bfb17b',50:'#c7b79b',60:'#d5b58a',80:'#8baaaa',90:'#9daa87'},mongolia:{10:'#789167',20:'#99a675',30:'#a8b784',40:'#b9b58a',50:'#b7b39d',60:'#c3b391',80:'#80a7b0',90:'#8da88a'},indonesia:{10:'#628c74',20:'#90a377',30:'#a4b17c',40:'#aeb47e',50:'#c2b49a',60:'#ae9475',80:'#77a9ab',90:'#769d8a',95:'#648e77'}};
 return palettes[id][code]||'#b1ac87';
}
const blockedCache=new Map<GlobalSiteId,polygonClipping.MultiPolygon>();
function blockedAreas(id:GlobalSiteId){
 const cached=blockedCache.get(id);if(cached)return cached;
 const areas=globalFeatures(id).filter(f=>f.tags.building||f.tags.natural==='water'||f.tags.landuse==='reservoir'||f.tags.landuse==='basin').flatMap(f=>f.polygons);
 const shape=areas.length?polygonClipping.union(areas[0],...areas.slice(1)):[];blockedCache.set(id,shape);return shape;
}
function containsRing(r:number[][],x:number,y:number){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
/** Mapped open water and buildings remain outside terrestrial placements. */
export function globalPatchPlayable(id:GlobalSiteId,patch:number){const site=GLOBAL_SITES[id];if(!Number.isInteger(patch)||patch<0||patch>=site.classes.length||site.classes[patch]===80)return false;const x=patch%12+.5,y=Math.floor(patch/12)+.5;return !blockedAreas(id).some(p=>containsRing(p[0],x,y)&&!p.slice(1).some(h=>containsRing(h,x,y)));}
const placementCache=new Map<string,polygonClipping.MultiPolygon>();
export function globalPlacementShape(id:GlobalSiteId,patch:number){const key=`${id}:${patch}`,cached=placementCache.get(key);if(cached)return cached;const x=patch%12,y=Math.floor(patch/12),tile:polygonClipping.Polygon=[[[x+.08,y+.08],[x+.92,y+.08],[x+.92,y+.92],[x+.08,y+.92],[x+.08,y+.08]]];const shape=polygonClipping.difference(tile,blockedAreas(id));placementCache.set(key,shape);return shape;}
