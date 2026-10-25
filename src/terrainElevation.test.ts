import {describe,it,expect} from 'vitest';
import {alamoHeight,chapterHeight,worldToTile} from './terrainElevation';
import elevation from './data/alamo-elevation.json';
import {GLOBAL_SITES,type GlobalSiteId} from './globalLandscape';
import {BBOX} from './simulation';
import {gridToMap} from './gridLandscape';
describe('Three.js geographic registration',()=>{
 it('provides finite geographically sampled surface heights for every chapter',()=>{for(const id of Object.keys(GLOBAL_SITES) as GlobalSiteId[]){const values=[];for(let y=0;y<=12;y++)for(let x=0;x<=12;x++){const h=chapterHeight(id,x,y);expect(Number.isFinite(h)).toBe(true);expect(h).toBeGreaterThanOrEqual(0);expect(h).toBeLessThan(12);values.push(h);}expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.1);}});
 it('maps every world-space cell centre to its existing game ID',()=>{for(let id=0;id<144;id++){const x=id%12,y=Math.floor(id/12);expect(worldToTile((x+.5-6)*10,(y+.5-6)*10)).toBe(id);}});
 it('rejects points outside the board, including its open east and south edges',()=>{expect(worldToTile(60,0)).toBeNull();expect(worldToTile(0,60)).toBeNull();expect(worldToTile(-60.01,0)).toBeNull();expect(worldToTile(0,-60.01)).toBeNull();expect(worldToTile(-60,-60)).toBe(0);});
 it('samples the returned USGS pixel extent rather than stretching its margins',()=>{const e=elevation.bbox,ix=20,iy=28,lng=e.xmin+(ix+.5)/elevation.width*(e.xmax-e.xmin),lat=e.ymax-(iy+.5)/elevation.height*(e.ymax-e.ymin),x=(lng-BBOX[0])/(BBOX[2]-BBOX[0])*12,y=(BBOX[3]-lat)/(BBOX[3]-BBOX[1])*12;expect(alamoHeight(x,y)).toBeCloseTo(elevation.heights[iy*elevation.width+ix]-60,5);});
 it('has valid, varying elevations covering the complete geographic board',()=>{const values=[];for(let y=0;y<=12;y++)for(let x=0;x<=12;x++){const p=gridToMap(x,y);expect(p.lng).toBeGreaterThanOrEqual(elevation.bbox.xmin);expect(p.lat).toBeLessThanOrEqual(elevation.bbox.ymax);const h=alamoHeight(x,y);expect(Number.isFinite(h)).toBe(true);expect(h).toBeGreaterThan(-10);expect(h).toBeLessThan(30);values.push(h);}expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(3);});
});
