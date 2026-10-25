import osm from './data/alamo-osm.json';
export const ORIGIN={lng:-122.4335,lat:37.77625};
export const METERS_LNG=111320*Math.cos(ORIGIN.lat*Math.PI/180);
export const local=(lng:number,lat:number)=>({x:(lng-ORIGIN.lng)*METERS_LNG,z:(ORIGIN.lat-lat)*111320});
export const geo=(x:number,z:number)=>({lng:ORIGIN.lng+x/METERS_LNG,lat:ORIGIN.lat-z/111320});
export type Feature={id:string;tags:Record<string,string>;geometry:{lat:number;lon:number}[]};
export const features=osm.elements as unknown as Feature[];
export const park=features.find(f=>f.tags.leisure==='park'&&f.tags.name==='Alamo Square')!;
export const buildings=features.filter(f=>f.tags.building&&f.geometry.length>3);
export const streets=features.filter(f=>f.tags.highway);
export function inside(lng:number,lat:number,ring:{lat:number;lon:number}[]){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a.lat>lat)!==(b.lat>lat))&&(lng<(b.lon-a.lon)*(lat-a.lat)/(b.lat-a.lat)+a.lon))c=!c;}return c;}
export function lineDistance(lng:number,lat:number,geometry:{lat:number;lon:number}[]){const p=local(lng,lat);let result=Infinity;for(let i=1;i<geometry.length;i++){const a=local(geometry[i-1].lon,geometry[i-1].lat),b=local(geometry[i].lon,geometry[i].lat),dx=b.x-a.x,dz=b.z-a.z;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));result=Math.min(result,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));}return result;}
export const steiner=streets.filter(f=>f.tags.name==='Steiner Street');
export const paths=streets.filter(f=>['footway','path'].includes(f.tags.highway));
export function siteInfo(lng:number,lat:number){return {inPark:inside(lng,lat,park.geometry),inBuilding:buildings.some(f=>inside(lng,lat,f.geometry)),curb:Math.min(...steiner.map(f=>lineDistance(lng,lat,f.geometry))),path:Math.min(...paths.map(f=>lineDistance(lng,lat,f.geometry)))};}
// Artistic slope only: this is not an elevation survey.
export function groundY(x:number,z:number){return 7*Math.exp(-((x+100)**2/12000+z*z/18000))-7*Math.tanh(z/200);}
