import {describe,it,expect} from 'vitest';
import {cellAtCoordinate,geographicGrid} from './mapGrid';
import {BBOX,WIDTH,HEIGHT,createGame,cellLocation} from './simulation';
describe('geographic game grid',()=>{
 it('round-trips every simulation cell through real geographic coordinates',()=>{
  const state=createGame();
  for(const c of state.cells){const p=cellLocation(c);expect(cellAtCoordinate(p.lng,p.lat)).toBe(c.id);}
 });
 it('keeps polygon boundaries contiguous and exactly within the scenario extent',()=>{
  const grid=geographicGrid(createGame());
  expect(grid.features).toHaveLength(WIDTH*HEIGHT);
  const first=grid.features[0].geometry.coordinates[0],last=grid.features.at(-1)!.geometry.coordinates[0];
  expect(first[0]).toEqual([BBOX[0],BBOX[3]]);
  expect(last[2][0]).toBeCloseTo(BBOX[2],10);
  expect(last[2][1]).toBeCloseTo(BBOX[1],10);
  expect(first[3]).toEqual(grid.features[1].geometry.coordinates[0][0]);
 });
 it('does not select a tile outside the play area or produce an out-of-range edge ID',()=>{
  const [w,s,e,n]=BBOX;
  expect(cellAtCoordinate(w,n)).toBe(0);
  for(const [lng,lat]of [[e,n],[w,s],[w-.001,n],[w,n+.001],[NaN,n]])expect(cellAtCoordinate(lng,lat)).toBeNull();
 });
});
