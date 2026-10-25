import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {mappedBuildings} from './gridLandscape';
import {alamoHeight} from './terrainElevation';
import {createSFArchitecture} from './sfArchitecture';
describe('mapped Victorian architecture',()=>{
 it('uses each Painted Lady’s source color and batches its detailed facade',()=>{
  const houses=mappedBuildings.filter(b=>b.special);expect(houses).toHaveLength(7);
  for(const house of houses){const built=createSFArchitecture(house,alamoHeight,color=>new THREE.MeshStandardMaterial({color}));const colors=built.solid.map(m=>(m.material as THREE.MeshStandardMaterial).color.getHexString());expect(colors).toContain(new THREE.Color(house.color).getHexString());expect(colors).toContain('5e7268');expect(built.solid.length).toBeLessThan(12);expect(built.solid.length).toBeGreaterThan(4);for(const mesh of built.solid){expect((mesh.material as THREE.MeshStandardMaterial).clippingPlanes).toHaveLength(4);const a=mesh.geometry.getAttribute('position');expect(a.count).toBeGreaterThan(0);for(const value of a.array)expect(Number.isFinite(value)).toBe(true);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}
 });
});
