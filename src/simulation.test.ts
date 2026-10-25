import {describe,it,expect} from 'vitest';
import {createGame,runoffMm,applyAction,advanceQuarter,metrics,canAct} from './simulation';
describe('environmental model',()=>{
 it('conserves event rainfall and is monotonic in curve number',()=>{
  for(const rain of [0,1,10,35,100]){
   let previous=0;
   for(const cn of [40,55,61,78,92,100]){
    const q=runoffMm(rain,cn);expect(q).toBeGreaterThanOrEqual(previous);expect(q).toBeLessThanOrEqual(rain);expect(q).toBeGreaterThanOrEqual(0);previous=q;
   }
  }
 });
 it('starts with zero difference from the observed baseline',()=>expect(metrics(createGame()).reduction).toBe(0));
 it('charges once, waits for completion, and reduces runoff after a retrofit',()=>{
  const s=createGame(),id=s.cells.find(c=>!canAct(s,c.id,'retrofit'))!.id;
  const planned=applyAction(s,id,'retrofit');expect(planned.budget).toBe(82);expect(metrics(planned).current).toBe(metrics(s).current);
  const done=advanceQuarter(planned);expect(done.cells[id].use).toBe('retrofit');expect(metrics(done).current).toBeLessThan(metrics(s).current);expect(s.cells[id].use).toBe('urban');
 });
 it('replaces a mapped paved path and reduces runoff',()=>{
  const s=createGame(),id=s.cells.find(c=>!canAct(s,c.id,'housing'))!.id;
  expect(s.cells[id].inPark).toBe(true);
  const next=advanceQuarter(applyAction(s,id,'housing'));expect(next.homes).toBe(0);expect(next.cells[id].intervention).toBe('housing');expect(metrics(next).current).toBeLessThan(metrics(s).current);
 });
 it('preserves mapped buildings and protected ground',()=>{
  const s=createGame(),green=s.cells.find(c=>!canAct(s,c.id,'protect'))!.id,building=s.cells.find(c=>c.locked)!.id;
  const p=applyAction(s,green,'protect');expect(canAct(p,green,'restore')).toContain('protected');expect(applyAction(s,building,'retrofit')).toBe(s);
  const curb=s.cells.find(c=>!canAct(s,c.id,'retrofit'))!.id;const h=applyAction(s,curb,'retrofit');expect(applyAction(h,curb,'retrofit')).toBe(h);
 });
 it('offers all four interventions on non-building ground',()=>{
  const s=createGame();for(const action of ['restore','retrofit','housing','protect'] as const){const targets=s.cells.filter(c=>!canAct(s,c.id,action));expect(targets.length).toBeGreaterThan(0);expect(targets.every(c=>!c.locked)).toBe(true);}
 });
 it('is reproducible and stops at the scenario horizon',()=>{
  const a=advanceQuarter(createGame()),b=advanceQuarter(createGame());expect(a).toEqual(b);
  let s=createGame();for(let n=0;n<45;n++)s=advanceQuarter(s);expect(s.month).toBe(120);
 });
});
