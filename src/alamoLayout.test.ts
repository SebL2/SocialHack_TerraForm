import {describe,it,expect} from 'vitest';
import {createGame,cellLocation,canAct,type Action} from './simulation';
import {local} from './neighborhood';
import {localCellAt,localCellBounds,interventionSamples,fitsSurface,surfaceAt,groundY} from './alamoLayout';
describe('Alamo diorama shares the simulation geography',()=>{
 it('selects the same cell from every rendered cell center',()=>{
  for(const c of createGame().cells){const q=cellLocation(c),p=local(q.lng,q.lat),b=localCellBounds(c);expect(localCellAt(p.x,p.z)).toBe(c.id);expect(p.x).toBeGreaterThan(b.west);expect(p.x).toBeLessThan(b.east);expect(p.z).toBeGreaterThan(b.north);expect(p.z).toBeLessThan(b.south);expect(Number.isFinite(groundY(p.x,p.z))).toBe(true);}
 });
 it('clips each available intervention to its actual rendered surface and cell',()=>{
  const s=createGame();for(const action of ['restore','retrofit','housing','protect'] as Action[]){let count=0;for(const c of s.cells.filter(c=>!canAct(s,c.id,action))){const samples=interventionSamples(c,action);for(const p of samples){expect(fitsSurface(action,surfaceAt(p.x,p.z))).toBe(true);expect(localCellAt(p.x,p.z)).toBe(c.id);}count+=samples.length;}expect(count).toBeGreaterThan(0);}
 });
 it('refines coarse park pixels to match visible lawn while preserving paths',()=>{
  for(const c of createGame().cells){if(c.locked||!c.inPark||c.path<3||c.curb<8)continue;const q=cellLocation(c),p=local(q.lng,q.lat);if(surfaceAt(p.x,p.z)==='lawn')expect(c.original).not.toBe('urban');}
 });
 it('never treats a building as an intervention surface',()=>{for(const action of ['restore','retrofit','housing','protect'] as Action[])expect(fitsSurface(action,'building')).toBe(false);});
});
