import {describe,it,expect} from 'vitest';
import {applyAction,advanceQuarter,canAct,createGame,metrics} from './simulation';
import {compareEnvironment} from './environmentComparisonData';
describe('environment before and after comparison',()=>{
 it('uses actual run snapshots for changed tiles, costs, and storm runoff',()=>{const before=createGame(),original=structuredClone(before),tile=before.cells.find(c=>!canAct(before,c.id,'retrofit'))!;const after=advanceQuarter(applyAction(before,tile.id,'retrofit'));const comparison=compareEnvironment(before,after,35);expect(comparison.changed).toEqual([tile.id]);expect(comparison.waterSaved).toBeCloseTo(metrics(before,35).current-metrics(after,35).current,10);expect(comparison.waterSaved).toBeGreaterThan(0);expect(comparison.rows.find(r=>r.unit==='cr')).toMatchObject({before:100,after:82});expect(before).toEqual(original);});
 it('shows protection without inventing a runoff reduction',()=>{const before=createGame(),tile=before.cells.find(c=>!canAct(before,c.id,'protect'))!,after=applyAction(before,tile.id,'protect'),comparison=compareEnvironment(before,after,35);expect(comparison.changed).toEqual([tile.id]);expect(comparison.waterSaved).toBe(0);expect(comparison.rows.find(r=>r.label==='Protected green tiles')).toMatchObject({before:0,after:1});});
});
