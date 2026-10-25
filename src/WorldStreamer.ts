import * as THREE from 'three';
import cityCover from './data/sf-landcover.json';
import {CHUNK_SIZE,chunkBounds,mapCache,type ChunkStatus} from './mapChunks';
import {geo,groundY,local,type Feature} from './neighborhood';
const COLORS:Record<number,string>={10:'#7e986b',20:'#a0aa7c',30:'#9caf79',40:'#a2ae7a',50:'#aaa99b',60:'#b6ad96',80:'#79a9b4',90:'#7c9d80',95:'#769b78',100:'#b9b9a1'};
export function coverColor(x:number,z:number){const p=geo(x,z),b=cityCover.bbox;if(p.lng<b[0]||p.lng>=b[2]||p.lat<b[1]||p.lat>=b[3])return '#adae9c';const cx=Math.min(cityCover.width-1,Math.floor((p.lng-b[0])/(b[2]-b[0])*cityCover.width)),cy=Math.min(cityCover.height-1,Math.floor((b[3]-p.lat)/(b[3]-b[1])*cityCover.height));return COLORS[cityCover.classes[cy*cityCover.width+cx]]||'#adae9c';}
export class WorldStreamer{
 tiles=new Map<string,THREE.Mesh>();loaded=new Set<string>();failed=new Set<string>();queue:string[]=[];inFlight=0;alive=true;lastScan=0;lastSignature='';reused=0;lastCenter={x:Infinity,z:Infinity};frustum=new THREE.Frustum();projection=new THREE.Matrix4();
 constructor(private scene:THREE.Scene,private camera:THREE.PerspectiveCamera,private center:()=>THREE.Vector3,private attach:(features:Feature[])=>void,private status:(value:ChunkStatus)=>void){
  // A distant underlay prevents empty space while detailed visible chunks arrive.
  const geo=new THREE.PlaneGeometry(400000,400000);geo.rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#a6ad99',roughness:1}));m.position.y=-25;m.receiveShadow=true;scene.add(m);this.tiles.set('underlay',m);
 }
 terrain(key:string){if(this.tiles.has(key))return;const bounds=chunkBounds(key),geometry=new THREE.PlaneGeometry(CHUNK_SIZE,CHUNK_SIZE,16,16);geometry.rotateX(-Math.PI/2);const positions=geometry.getAttribute('position'),colors:number[]=[];for(let i=0;i<positions.count;i++){const x=positions.getX(i)+bounds.minX+CHUNK_SIZE/2,z=positions.getZ(i)+bounds.minZ+CHUNK_SIZE/2;positions.setXYZ(i,x,groundY(x,z)-.55,z);const c=new THREE.Color(coverColor(x,z));colors.push(c.r,c.g,c.b);}geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.receiveShadow=true;this.scene.add(mesh);this.tiles.set(key,mesh);}
 update(time:number){if(!this.alive||time-this.lastScan<350)return;this.lastScan=time;const center=this.center(),radius=Math.min(2300,Math.max(320,this.camera.position.distanceTo(center)*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*Math.max(1,this.camera.aspect)*1.35));this.camera.updateMatrixWorld();this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);const candidates:{key:string;distance:number}[]=[];
  for(let x=Math.floor((center.x-radius)/CHUNK_SIZE);x<=Math.floor((center.x+radius)/CHUNK_SIZE);x++)for(let z=Math.floor((center.z-radius)/CHUNK_SIZE);z<=Math.floor((center.z+radius)/CHUNK_SIZE);z++){const box=new THREE.Box3(new THREE.Vector3(x*CHUNK_SIZE,-30,z*CHUNK_SIZE),new THREE.Vector3((x+1)*CHUNK_SIZE,150,(z+1)*CHUNK_SIZE));if(!this.frustum.intersectsBox(box))continue;const key=`${x},${z}`;this.terrain(key);if(!this.loaded.has(key)&&!this.failed.has(key))candidates.push({key,distance:Math.hypot((x+.5)*CHUNK_SIZE-center.x,(z+.5)*CHUNK_SIZE-center.z)});}
  // The queue always follows the current viewport, so dragging cancels queued
  // off-screen requests. Finished geometry stays resident and is reused.
  candidates.sort((a,b)=>a.distance-b.distance);this.queue=candidates.map(c=>c.key);this.pump();this.publish();
 }
 pump(){if(!this.alive||this.inFlight||!this.queue.length)return;const key=this.queue.shift()!;if(this.loaded.has(key)||this.failed.has(key)){this.pump();return;}this.inFlight++;const cached=mapCache.memory.has(key);mapCache.get(key).then(data=>{if(!this.alive)return;this.attach(data.features);this.loaded.add(key);if(cached)this.reused++;}).catch(()=>{if(this.alive)this.failed.add(key);}).finally(()=>{if(!this.alive)return;this.inFlight--;this.publish();setTimeout(()=>this.pump(),300);});}
 publish(){const value={loaded:this.loaded.size,loading:this.inFlight+this.queue.length,failed:this.failed.size,reused:this.reused};const signature=JSON.stringify(value);if(signature!==this.lastSignature){this.lastSignature=signature;this.status(value);}}
 retry(){this.failed.clear();this.lastScan=0;this.update(performance.now());}
 destroy(){this.alive=false;this.queue=[];/* Scene owner disposes meshes once. */}
}
