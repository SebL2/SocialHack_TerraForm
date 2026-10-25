import {describe,it,expect} from 'vitest';
import {GLOBAL_SITES,globalCellCenter,globalMapPoint,globalPatchAt,globalFeatures,projectGlobal,inverseGlobal,globalPatchPlayable,type GlobalSiteId} from './globalLandscape';
import {GLOBAL_RULES,simulateSeason} from './globalChapters';
describe('mapped restoration chapter grids',()=>{
 for(const id of ['senegal','mongolia','indonesia'] as GlobalSiteId[]){
  it(`${id}: has source-attributed mapped data and stable geographic patch IDs`,()=>{const s=GLOBAL_SITES[id];expect(s.classes).toHaveLength(144);expect(s.features.length).toBeGreaterThan(0);expect(s.attribution).toContain('OpenStreetMap');expect(s.rasterUrl).toContain('esa-worldcover');expect(s.classes.every(v=>Number.isInteger(v)&&v>0)).toBe(true);for(let n=0;n<144;n++){const p=globalCellCenter(id,n),q=globalMapPoint(id,p.lng,p.lat);expect(q.x).toBeCloseTo(n%12+.5,7);expect(q.y).toBeCloseTo(Math.floor(n/12)+.5,7);expect(globalPatchAt(id,p.lng,p.lat)).toBe(n);}});
  it(`${id}: clips mapped area features to the board and keeps geographic baselines immutable`,()=>{for(const f of globalFeatures(id))for(const polygon of f.polygons)for(const ring of polygon)for(const [x,y]of ring){expect(x).toBeGreaterThanOrEqual(-1e-8);expect(y).toBeGreaterThanOrEqual(-1e-8);expect(x).toBeLessThanOrEqual(12+1e-8);expect(y).toBeLessThanOrEqual(12+1e-8);}const before=[...GLOBAL_SITES[id].classes];simulateSeason(id,[...GLOBAL_RULES[id].baseline],[{patch:10,choice:0}],0);expect(GLOBAL_SITES[id].classes).toEqual(before);expect(before.filter((_,n)=>globalPatchPlayable(id,n)).length).toBeGreaterThan(4);});
 }
 it('preserves every patch through rotation and top-down projection',()=>{for(const top of [false,true])for(let turn=0;turn<4;turn++)for(let n=0;n<144;n++){const p=projectGlobal(n%12+.5,Math.floor(n/12)+.5,turn,top),q=inverseGlobal(p.x,p.y,turn,top);expect(Math.floor(q.y)*12+Math.floor(q.x)).toBe(n);}});
 it('rejects open water for land interventions and out-of-area selections',()=>{for(const [id,s]of Object.entries(GLOBAL_SITES)){expect(globalPatchAt(id as GlobalSiteId,s.bbox[0]-.01,s.center[1])).toBeNull();s.classes.forEach((code,n)=>{if(code===80)expect(globalPatchPlayable(id as GlobalSiteId,n)).toBe(false);});}expect(()=>globalCellCenter('senegal',144)).toThrow();});
});

it('uses square overhead tiles rather than stretched isometric diamonds',()=>{const a=projectGlobal(0,0,0,true),b=projectGlobal(1,0,0,true),c=projectGlobal(0,1,0,true);expect(b.x-a.x).toBe(30);expect(b.y-a.y).toBe(0);expect(c.x-a.x).toBe(0);expect(c.y-a.y).toBe(30);});

it('preserves patch IDs throughout the global camera swing',()=>{for(const t of [0,.2,.5,.8,1])for(let turn=0;turn<4;turn++)for(let n=0;n<144;n++){const p=projectGlobal(n%12+.5,Math.floor(n/12)+.5,turn,t),q=inverseGlobal(p.x,p.y,turn,t);expect(Math.floor(q.y)*12+Math.floor(q.x)).toBe(n);}});
