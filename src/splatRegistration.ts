import {geo,local} from './neighborhood';
export type Anchor={world:[number,number,number];lng:number;lat:number};
export type SplatScene={title:string;url:string;credit:string;source:string;rotation:[number,number,number];camera:[number,number,number];target:[number,number,number];anchors?:Anchor[]};
export const DEMO_SCENE:SplatScene={title:'Sunnyvale Heritage Park Museum',url:'https://code.playcanvas.com/examples_data/example_sunnyvale/sunnyvale.sog',credit:'zeitgeistarchivescans · CC BY 4.0',source:'https://superspl.at/scene/d5d397aa',rotation:[0,0,180],camera:[12,9,18],target:[0,1,0]};
function coefficients(points:[number,number,number][],values:number[]){
 const [a,b,c]=points,det=a[0]*(b[2]-c[2])+b[0]*(c[2]-a[2])+c[0]*(a[2]-b[2]);
 const scale=Math.max(1,...points.map(p=>Math.abs(p[0])),...points.map(p=>Math.abs(p[2])));
 if(Math.abs(det)<1e-9*scale*scale)throw new Error('Map anchors must form a triangle, not a line.');
 const [u,v,w]=values;
 return [(u*(b[2]-c[2])+v*(c[2]-a[2])+w*(a[2]-b[2]))/det,(u*(c[0]-b[0])+v*(a[0]-c[0])+w*(b[0]-a[0]))/det,(u*(b[0]*c[2]-c[0]*b[2])+v*(c[0]*a[2]-a[0]*c[2])+w*(a[0]*b[2]-b[0]*a[2]))/det];
}
/** Three ground tie points register a small scene in a local metric map frame.
 * This is an affine alignment, not a survey or a recovered terrain mesh. */
export function registerScene(anchors:Anchor[]){
 if(anchors.length!==3)throw new Error('Provide exactly three ground anchors with scene positions and map coordinates.');
 for(const a of anchors)if(!Array.isArray(a.world)||a.world.length!==3||!a.world.every(Number.isFinite)||!Number.isFinite(a.lng)||!Number.isFinite(a.lat)||Math.abs(a.lng)>180||Math.abs(a.lat)>=85)throw new Error('Anchor coordinates must be finite positions and valid longitude/latitude.');
 const world=anchors.map(a=>a.world),locations=anchors.map(a=>local(a.lng,a.lat));
 const cx=coefficients(world,locations.map(p=>p.x)),cz=coefficients(world,locations.map(p=>p.z));
 const inversePoints=locations.map(p=>[p.x,0,p.z] as [number,number,number]);
 const ix=coefficients(inversePoints,world.map(p=>p[0])),iz=coefficients(inversePoints,world.map(p=>p[2])),iy=coefficients(inversePoints,world.map(p=>p[1]));
 const apply=(c:number[],x:number,z:number)=>c[0]*x+c[1]*z+c[2];
 return {toMap:(x:number,z:number)=>geo(apply(cx,x,z),apply(cz,x,z)),toWorld:(lng:number,lat:number)=>{const p=local(lng,lat);return [apply(ix,p.x,p.z),apply(iy,p.x,p.z),apply(iz,p.x,p.z)] as [number,number,number];}};
}
export function parseScene(value:unknown):SplatScene{
 const s=value as SplatScene;
 if(!s||typeof s.title!=='string'||typeof s.url!=='string'||!s.url||typeof s.credit!=='string'||typeof s.source!=='string')throw new Error('Scene needs a title, asset URL, credit and source.');
 for(const u of [s.url,s.source])if(!u.startsWith('/')&&!/^https?:\/\//.test(u))throw new Error('Use a local path or an HTTP(S) asset/source URL.');
 for(const p of [s.rotation,s.camera,s.target])if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error('Rotation, camera and target must each contain three finite numbers.');
 if(s.anchors)registerScene(s.anchors);
 return s;
}
