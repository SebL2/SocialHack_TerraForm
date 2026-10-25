import {BBOX,WIDTH,HEIGHT,type Cell,type Action} from './simulation';
import {local,geo,groundY,paths,steiner,lineDistance,inside,park,buildings} from './neighborhood';
import {cellAtCoordinate} from './mapGrid';
export {groundY};
export type Surface='lawn'|'path'|'street'|'pavement'|'building';
const nearbyPaths=paths.filter(f=>f.geometry.some(p=>{const q=local(p.lon,p.lat);return q.x> -160&&q.x<140&&q.z> -140&&q.z<140;}));
const nearbyBuildings=buildings.filter(f=>f.geometry.some(p=>{const q=local(p.lon,p.lat);return q.x> -110&&q.x<130&&Math.abs(q.z)<110;}));
/** Shared mapped surfaces for terrain colors and intervention clipping.
 * Widths are the same educational assumptions used by createGame. */
export function surfaceAt(x:number,z:number):Surface{
 const p=geo(x,z);
 if(nearbyBuildings.some(f=>inside(p.lng,p.lat,f.geometry)))return 'building';
 const inPark=inside(p.lng,p.lat,park.geometry);
 const road=Math.min(...steiner.map(f=>lineDistance(p.lng,p.lat,f.geometry)));
 if(road<8)return 'street';
 if(inPark){if(nearbyPaths.some(f=>lineDistance(p.lng,p.lat,f.geometry)<3))return 'path';return 'lawn';}
 return 'pavement';
}
export function localCellBounds(c:Pick<Cell,'x'|'y'>){
 const a=local(BBOX[0]+c.x/WIDTH*(BBOX[2]-BBOX[0]),BBOX[3]-c.y/HEIGHT*(BBOX[3]-BBOX[1]));
 const b=local(BBOX[0]+(c.x+1)/WIDTH*(BBOX[2]-BBOX[0]),BBOX[3]-(c.y+1)/HEIGHT*(BBOX[3]-BBOX[1]));
 return {west:a.x,east:b.x,north:a.z,south:b.z};
}
export function localCellAt(x:number,z:number){const p=geo(x,z);return cellAtCoordinate(p.lng,p.lat);}
export function fitsSurface(action:Action,surface:Surface){return action==='housing'?surface==='path':action==='retrofit'?surface==='street'||surface==='pavement':surface==='lawn';}
export function interventionSamples(c:Cell,action:Action,divisions=8){
 const b=localCellBounds(c),dx=(b.east-b.west)/divisions,dz=(b.south-b.north)/divisions,result:{x:number;z:number;dx:number;dz:number}[]=[];
 for(let iz=0;iz<divisions;iz++)for(let ix=0;ix<divisions;ix++){const x=b.west+(ix+.5)*dx,z=b.north+(iz+.5)*dz;if(fitsSurface(action,surfaceAt(x,z)))result.push({x,z,dx,dz});}
 return result;
}
