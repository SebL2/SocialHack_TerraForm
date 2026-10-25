import type {Feature} from './neighborhood';
import {geo} from './neighborhood';
export const CHUNK_SIZE=256;
export type ChunkData={key:string;features:Feature[]};
export type ChunkStatus={loaded:number;loading:number;failed:number;reused:number};
export const chunkKey=(x:number,z:number)=>`${Math.floor(x/CHUNK_SIZE)},${Math.floor(z/CHUNK_SIZE)}`;
export function chunkBounds(key:string){const [x,z]=key.split(',').map(Number);const nw=geo(x*CHUNK_SIZE,z*CHUNK_SIZE),se=geo((x+1)*CHUNK_SIZE,(z+1)*CHUNK_SIZE);return {minX:x*CHUNK_SIZE,minZ:z*CHUNK_SIZE,maxX:(x+1)*CHUNK_SIZE,maxZ:(z+1)*CHUNK_SIZE,bbox:[nw.lng,se.lat,se.lng,nw.lat]};}
async function db(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('test-game-map-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('chunks',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function stored(key:string):Promise<ChunkData|null>{try{const conn=await db();return await new Promise((resolve,reject)=>{const transaction=conn.transaction('chunks'),request=transaction.objectStore('chunks').get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);transaction.oncomplete=()=>conn.close();});}catch{return null;}}
async function persist(data:ChunkData){try{const conn=await db();const tx=conn.transaction('chunks','readwrite');tx.objectStore('chunks').put(data);tx.oncomplete=()=>conn.close();}catch{/* In-memory caching remains available. */}}
export function parseMapXml(xml:string):Feature[]{const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid map response');const nodes=new Map<string,{lat:number;lon:number}>();doc.querySelectorAll('osm > node').forEach(n=>nodes.set(n.id,{lat:Number(n.getAttribute('lat')),lon:Number(n.getAttribute('lon'))}));const result:Feature[]=[];doc.querySelectorAll('osm > way').forEach(w=>{const tags:Record<string,string>={};w.querySelectorAll('tag').forEach(t=>{tags[t.getAttribute('k')!]=t.getAttribute('v')!;});if(!tags.building&&!tags.highway&&!tags.leisure)return;const geometry=Array.from(w.querySelectorAll('nd')).map(n=>nodes.get(n.getAttribute('ref')!)).filter((n):n is {lat:number;lon:number}=>!!n);if(geometry.length>1)result.push({id:w.id,tags,geometry});});return result;}
export class ChunkCache{
 memory=new Map<string,ChunkData>();pending=new Map<string,Promise<ChunkData>>();
 constructor(private read:(key:string)=>Promise<ChunkData|null>=stored,private write:(data:ChunkData)=>Promise<void>=persist,private fetchChunk:(key:string)=>Promise<ChunkData>=async key=>{const response=await fetch(`/api/map-chunk?key=${encodeURIComponent(key)}`);if(!response.ok)throw new Error(`Map request failed (${response.status})`);return {key,features:parseMapXml(await response.text())};}){}
 get(key:string):Promise<ChunkData>{if(this.memory.has(key))return Promise.resolve(this.memory.get(key)!);if(this.pending.has(key))return this.pending.get(key)!;const promise=(async()=>{const cached=await this.read(key);const data=cached||await this.fetchChunk(key);this.memory.set(key,data);if(!cached)void this.write(data);return data;})().finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;}
}
export const mapCache=new ChunkCache();
