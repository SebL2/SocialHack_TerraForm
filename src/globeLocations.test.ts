import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {GLOBE_LOCATIONS,globeVector} from './globeLocations';
import {GLOBAL_SITES} from './globalLandscape';
describe('globe chapter registration',()=>{
 it('uses the existing mapped level centers',()=>{for(const id of ['senegal','mongolia','indonesia'] as const){expect(GLOBE_LOCATIONS[id].lng).toBe(GLOBAL_SITES[id].center[0]);expect(GLOBE_LOCATIONS[id].lat).toBe(GLOBAL_SITES[id].center[1]);}});
 it('projects geographic locations onto the same sphere as ThreeGlobe',()=>{expect(globeVector(0,0,100)[2]).toBeCloseTo(100);expect(globeVector(0,90,100)[0]).toBeCloseTo(100);for(const p of Object.values(GLOBE_LOCATIONS)){const v=new Vector3(...globeVector(p.lat,p.lng));expect(v.length()).toBeCloseTo(102);expect(Math.asin(v.y/102)*180/Math.PI).toBeCloseTo(p.lat);expect(Math.atan2(v.x,v.z)*180/Math.PI).toBeCloseTo(p.lng);}});
});
