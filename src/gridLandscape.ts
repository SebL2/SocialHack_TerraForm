import polygonClipping from 'polygon-clipping';
import {BBOX,WIDTH,HEIGHT,type Cell,type Action} from './simulation';
import {park,paths,steiner,buildings,local,geo,type Feature} from './neighborhood';
import {cellAtCoordinate} from './mapGrid';
type Pair=polygonClipping.Pair;
export type GridPolygon=polygonClipping.Polygon;
export const mapToGrid=(lng:number,lat:number)=>({x:(lng-BBOX[0])/(BBOX[2]-BBOX[0])*WIDTH,y:(BBOX[3]-lat)/(BBOX[3]-BBOX[1])*HEIGHT});
export const gridToMap=(x:number,y:number)=>({lng:BBOX[0]+x/WIDTH*(BBOX[2]-BBOX[0]),lat:BBOX[3]-y/HEIGHT*(BBOX[3]-BBOX[1])});
export function tileAtGrid(x:number,y:number){const p=gridToMap(x,y);return cellAtCoordinate(p.lng,p.lat);}
const ring=(f:Feature):Pair[]=>f.geometry.map(p=>{const q=mapToGrid(p.lon,p.lat);return[Math.round(q.x*1e6)/1e6,Math.round(q.y*1e6)/1e6];});
const extent:GridPolygon=[[[0,0],[WIDTH,0],[WIDTH,HEIGHT],[0,HEIGHT],[0,0]]];
const clipped=(polygons:polygonClipping.MultiPolygon|GridPolygon)=>polygonClipping.intersection(polygons,extent);
function buffered(features:Feature[],width:number){
 const polygons:GridPolygon[]=[];
 const convert=(x:number,z:number):Pair=>{const p=geo(x,z),q=mapToGrid(p.lng,p.lat);return[Math.round(q.x*1e6)/1e6,Math.round(q.y*1e6)/1e6];};
 for(const f of features)for(let i=1;i<f.geometry.length;i++){
  const ga=mapToGrid(f.geometry[i-1].lon,f.geometry[i-1].lat),gb=mapToGrid(f.geometry[i].lon,f.geometry[i].lat);if(Math.min(ga.x,gb.x)>WIDTH+2||Math.max(ga.x,gb.x)< -2||Math.min(ga.y,gb.y)>HEIGHT+2||Math.max(ga.y,gb.y)< -2)continue;
 const a=local(f.geometry[i-1].lon,f.geometry[i-1].lat),b=local(f.geometry[i].lon,f.geometry[i].lat),d=Math.hypot(b.x-a.x,b.z-a.z);if(!d)continue;
  const nx=-(b.z-a.z)/d*width,nz=(b.x-a.x)/d*width;
  polygons.push([[convert(a.x+nx,a.z+nz),convert(a.x-nx,a.z-nz),convert(b.x-nx,b.z-nz),convert(b.x+nx,b.z+nz),convert(a.x+nx,a.z+nz)]]);
  for(const p of[a,b]){const circle:Pair[]=[];for(let k=0;k<16;k++){const t=k/16*Math.PI*2;circle.push(convert(p.x+Math.cos(t)*width,p.z+Math.sin(t)*width));}circle.push(circle[0]);polygons.push([circle]);}
 }
 return polygons.length?clipped(polygonClipping.union(polygons[0],...polygons.slice(1))):[];
}
/** All scenery and placements use continuous geographic shapes inside the
 * original square grid. Widths match the simulation's educational assumptions. */
export const parkShape=clipped([ring(park)]);
export const roadShape=buffered(steiner,8);
export const pathShape=polygonClipping.intersection(buffered(paths,3),parkShape);
export const mappedBuildings=buildings.flatMap(f=>{
 const shapes=clipped([ring(f)]);if(!shapes.length)return[];
 const special=f.tags['addr:street']==='Steiner Street'&&['710','712','714','716','718','720','722'].includes(f.tags['addr:housenumber']);
 return[{id:f.id,shapes,special,address:f.tags['addr:housenumber']||'',height:Number(f.tags.height)||9,color:f.tags['building:colour']||'#c5c6b3',street:f.tags['addr:street']||'',roofColor:f.tags['roof:colour']||'#887f70',roofHeight:Number(f.tags['roof:height'])||0,roofShape:f.tags['roof:shape']||'flat'}];
});
const buildingShape=mappedBuildings.length?polygonClipping.union(mappedBuildings[0].shapes,...mappedBuildings.slice(1).map(b=>b.shapes)):[];
export const lawnShape=polygonClipping.difference(parkShape,pathShape,roadShape,buildingShape);
const pavedShape=polygonClipping.difference(extent,lawnShape,pathShape,buildingShape);
const masks={restore:lawnShape,protect:lawnShape,housing:pathShape,retrofit:pavedShape};
const patchCache=new Map<string,polygonClipping.MultiPolygon>();
export function gridPatch(c:Pick<Cell,'x'|'y'>,action:Action){
 const key=`${c.x},${c.y},${action}`;const cached=patchCache.get(key);if(cached)return cached;
 const tile:GridPolygon=[[[c.x,c.y],[c.x+1,c.y],[c.x+1,c.y+1],[c.x,c.y+1],[c.x,c.y]]];
 const result=polygonClipping.intersection(tile,masks[action]);patchCache.set(key,result);return result;
}
/** An interior render point on the surface, rather than a tile-center symbol
 * that might land on a path or a building in a mixed tile. */
function shapeContains(shape:polygonClipping.MultiPolygon,x:number,y:number){
 const inRing=(r:Pair[])=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 return shape.some(p=>inRing(p[0])&&!p.slice(1).some(inRing));
}
export function patchPoint(c:Pick<Cell,'x'|'y'>,action:Action){
 const shape=gridPatch(c,action);if(!shape.length)return null;
 let best:{x:number;y:number;distance:number}|null=null;
 for(let iy=0;iy<12;iy++)for(let ix=0;ix<12;ix++){const x=c.x+(ix+.5)/12,y=c.y+(iy+.5)/12;
  if(!shapeContains(shape,x,y))continue;
  const distance=Math.hypot(x-c.x-.5,y-c.y-.5);if(!best||distance<best.distance)best={x,y,distance};
 }
 if(best)return{x:best.x,y:best.y};
 // Very thin clipped fragments can miss the sample lattice. Look just inside
 // their corners, never return a boundary vertex belonging to the next tile.
 for(const polygon of shape){const r=polygon[0];for(let i=1;i<r.length-1;i++)for(const weight of [.02,.2,.333]){const a=r[i-1],b=r[i],d=r[(i+1)%(r.length-1)],x=b[0]*(1-2*weight)+(a[0]+d[0])*weight,y=b[1]*(1-2*weight)+(a[1]+d[1])*weight;if(tileAtGrid(x,y)===c.y*WIDTH+c.x&&shapeContains(shape,x,y))return{x,y};}}
 return null;
}
