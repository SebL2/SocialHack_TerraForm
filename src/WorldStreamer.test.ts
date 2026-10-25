import {it,expect} from 'vitest';
import * as THREE from 'three';
import {WorldStreamer} from './WorldStreamer';
it('keeps explored terrain geometry resident instead of rebuilding it on revisit',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const streamer=new WorldStreamer(scene,camera,()=>new THREE.Vector3(),()=>{},()=>{});
 streamer.terrain('0,0');const first=streamer.tiles.get('0,0');const count=scene.children.length;
 streamer.terrain('1,0');streamer.terrain('0,0');expect(streamer.tiles.get('0,0')).toBe(first);expect(scene.children.length).toBe(count+1);
 streamer.destroy();
 for(const mesh of streamer.tiles.values()){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}
});
