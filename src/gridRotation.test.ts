import {describe,it,expect} from 'vitest';
import {rotateGrid,unrotateGrid,projectGridPlane,unprojectGridPlane,projectGridSwing,unprojectGridSwing} from './gridRotation';
import {tileAtGrid} from './gridLandscape';
import {createGame,WIDTH,HEIGHT} from './simulation';
describe('grid view rotation',()=>{
 it('preserves selection IDs through projection and inverse projection at every angle',()=>{for(const turns of [0,1,2,3,-1,4])for(const c of createGame().cells){const p=rotateGrid(c.x+.5,c.y+.5,turns,WIDTH,HEIGHT),screen={x:(p.x-p.y)*25,y:(p.x+p.y)*12.5},q=unrotateGrid((screen.x/25+screen.y/12.5)/2,(screen.y/12.5-screen.x/25)/2,turns,WIDTH,HEIGHT);expect(tileAtGrid(q.x,q.y)).toBe(c.id);}});
 it('rotates around the board center and returns to the starting position after four turns',()=>{expect(rotateGrid(6,6,1,12,12)).toEqual({x:6,y:6});expect(rotateGrid(0,0,1,12,12)).toEqual({x:12,y:0});expect(rotateGrid(2,9,4,12,12)).toEqual({x:2,y:9});});
});

describe('direct overhead projection',()=>{
 it('draws perpendicular equal-length tile edges',()=>{const a=projectGridPlane(2,3,true),b=projectGridPlane(3,3,true),c=projectGridPlane(2,4,true);expect(b.x-a.x).toBe(1);expect(b.y-a.y).toBe(0);expect(c.x-a.x).toBe(0);expect(c.y-a.y).toBe(1);});
 it('keeps every tile selectable in both views and all rotations',()=>{for(const top of [false,true])for(let turn=0;turn<4;turn++)for(const c of createGame().cells){const r=rotateGrid(c.x+.5,c.y+.5,turn,WIDTH,HEIGHT),p=projectGridPlane(r.x,r.y,top),q=unprojectGridPlane(p.x,p.y,top),original=unrotateGrid(q.x,q.y,turn,WIDTH,HEIGHT);expect(tileAtGrid(original.x,original.y)).toBe(c.id);}});
});

describe('camera swing projection',()=>{
 it('matches isometric and overhead endpoints',()=>{for(const t of [0,1]){const p=projectGridSwing(3,7,t),expected=projectGridPlane(3,7,t===1);expect(p.x).toBeCloseTo(expected.x,10);expect(p.y).toBeCloseTo(expected.y,10);}});
 it('keeps tile selection invertible throughout both directions of the swing',()=>{for(const t of [0,.1,.25,.5,.75,.9,1])for(let turn=0;turn<4;turn++)for(const c of createGame().cells){const r=rotateGrid(c.x+.5,c.y+.5,turn,WIDTH,HEIGHT),p=projectGridSwing(r.x,r.y,t),q=unprojectGridSwing(p.x,p.y,t),original=unrotateGrid(q.x,q.y,turn,WIDTH,HEIGHT);expect(tileAtGrid(original.x,original.y)).toBe(c.id);}});
});
