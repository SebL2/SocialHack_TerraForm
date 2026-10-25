import {describe,it,expect} from 'vitest';
import {geo} from './neighborhood';
import {registerScene,parseScene,DEMO_SCENE,type Anchor} from './splatRegistration';
describe('scan geographic registration',()=>{
 const anchors:Anchor[]=[{world:[0,1,0],...geo(0,0)},{world:[10,2,0],...geo(0,20)},{world:[0,3,10],...geo(-20,0)}];
 it('aligns a rotated, scaled scan and round-trips interior positions',()=>{
  const r=registerScene(anchors),p=r.toMap(3,4),expected=geo(-8,6);
  expect(p.lng).toBeCloseTo(expected.lng,10);expect(p.lat).toBeCloseTo(expected.lat,10);
  const w=r.toWorld(p.lng,p.lat);expect(w[0]).toBeCloseTo(3,7);expect(w[2]).toBeCloseTo(4,7);expect(w[1]).toBeCloseTo(2.1,7);
 });
 it('rejects collinear ground anchors and invalid map coordinates',()=>{
  expect(()=>registerScene(anchors.map((a,i)=>({...a,world:[i,0,0]})))).toThrow('triangle');
  expect(()=>registerScene(anchors.map(a=>({...a,lat:NaN})))).toThrow('finite');
 });
 it('keeps an unregistered demo unregistered and rejects executable URLs',()=>{
  expect(parseScene(DEMO_SCENE).anchors).toBeUndefined();
  expect(()=>parseScene({...DEMO_SCENE,url:'javascript:alert(1)'})).toThrow('HTTP');
 });
});
