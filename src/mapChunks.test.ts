import {describe,it,expect,vi} from 'vitest';
import {ChunkCache,chunkKey,chunkBounds} from './mapChunks';
describe('streaming map cache',()=>{
 it('uses stable chunk coordinates across positive and negative map positions',()=>{expect(chunkKey(10,10)).toBe('0,0');expect(chunkKey(-1,-1)).toBe('-1,-1');expect(chunkBounds('1,0').minX).toBe(chunkBounds('0,0').maxX);});
 it('shares in-flight requests and reuses loaded data on revisit',async()=>{
  const fetchChunk=vi.fn(async key=>({key,features:[]}));const write=vi.fn(async()=>{});const cache=new ChunkCache(async()=>null,write,fetchChunk);
  const [a,b]=await Promise.all([cache.get('0,0'),cache.get('0,0')]);expect(a).toBe(b);expect(await cache.get('0,0')).toBe(a);expect(fetchChunk).toHaveBeenCalledTimes(1);expect(write).toHaveBeenCalledTimes(1);
 });
 it('loads previously persisted chunks without a network request',async()=>{const fetchChunk=vi.fn();const cached={key:'-1,2',features:[]};const cache=new ChunkCache(async()=>cached,async()=>{},fetchChunk);expect(await cache.get('-1,2')).toBe(cached);expect(fetchChunk).not.toHaveBeenCalled();});
 it('allows retrying a failed request instead of caching the failure',async()=>{let calls=0;const cache=new ChunkCache(async()=>null,async()=>{},async key=>{if(++calls===1)throw new Error('offline');return {key,features:[]};});await expect(cache.get('0,0')).rejects.toThrow('offline');await expect(cache.get('0,0')).resolves.toEqual({key:'0,0',features:[]});expect(calls).toBe(2);});
});
