import elevation from './data/alamo-elevation.json';
import globalElevation from './data/global-elevation.json';
import {GLOBAL_SITES,type GlobalSiteId} from './globalLandscape';
import {gridToMap} from './gridLandscape';
/** USGS export has a square geographic extent, including margins outside the level.
 * Sample pixel centres in that returned extent, rather than stretching it to the board. */
export function alamoHeight(x:number,y:number){
 const p=gridToMap(x,y),e=elevation.bbox;
 const px=Math.max(0,Math.min(elevation.width-1,(p.lng-e.xmin)/(e.xmax-e.xmin)*elevation.width-.5));
 const py=Math.max(0,Math.min(elevation.height-1,(e.ymax-p.lat)/(e.ymax-e.ymin)*elevation.height-.5));
 const ix=Math.floor(px),iy=Math.floor(py),tx=px-ix,ty=py-iy;
 const at=(a:number,b:number)=>elevation.heights[Math.min(elevation.height-1,b)*elevation.width+Math.min(elevation.width-1,a)];
 return (at(ix,iy)*(1-tx)+at(ix+1,iy)*tx)*(1-ty)+(at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx)*ty-60;
}
export function worldToTile(x:number,z:number){const gx=x/10+6,gy=z/10+6;return gx>=0&&gy>=0&&gx<12&&gy<12?Math.floor(gy)*12+Math.floor(gx):null;}

/** Global surface heights retain their real scale relative to each chapter's extent. */
export function chapterHeight(id:GlobalSiteId,x:number,y:number){
 const data=globalElevation[id],site=GLOBAL_SITES[id],e=data.bbox;
 const lng=site.bbox[0]+x/12*(site.bbox[2]-site.bbox[0]),lat=site.bbox[3]-y/12*(site.bbox[3]-site.bbox[1]);
 const px=Math.max(0,Math.min(data.width-1,(lng-e.xmin)/(e.xmax-e.xmin)*data.width-.5)),py=Math.max(0,Math.min(data.height-1,(e.ymax-lat)/(e.ymax-e.ymin)*data.height-.5));
 const ix=Math.floor(px),iy=Math.floor(py),tx=px-ix,ty=py-iy;
 const at=(a:number,b:number)=>data.heights[Math.min(data.height-1,b)*data.width+Math.min(data.width-1,a)];
 const h=(at(ix,iy)*(1-tx)+at(ix+1,iy)*tx)*(1-ty)+(at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx)*ty;
 return (h-globalHeightBases[id])*120/((site.bbox[3]-site.bbox[1])*111320);
}
const globalHeightBases=Object.fromEntries(Object.entries(globalElevation).map(([id,data])=>[id,Math.min(...data.heights)])) as Record<GlobalSiteId,number>;
