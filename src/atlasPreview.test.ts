import {describe,it,expect} from 'vitest';
import {atlasPreviewLayout} from './atlasPreview';
import {CHAPTERS} from './globalChapters';
describe('atlas hover connectors',()=>{
 for(const size of [{width:1330,height:665,top:90,viewport:900},{width:342,height:171,top:300,viewport:844}])for(const chapter of CHAPTERS){
  it(`anchors ${chapter.name} to its preview at ${size.width}px`,()=>{
   const cardWidth=size.width>700?250:230,cardHeight=240,nodeX=size.width*chapter.left/100,nodeY=size.height*chapter.top/100,radius=16;
   const p=atlasPreviewLayout({boardWidth:size.width,boardTop:size.top,viewportHeight:size.viewport,nodeX,nodeY,radius,cardWidth,cardHeight});
   expect(p.left).toBeGreaterThanOrEqual(0);expect(p.left+cardWidth).toBeLessThanOrEqual(size.width);
   expect(p.top+size.top).toBeGreaterThanOrEqual(70);expect(p.top+size.top+cardHeight).toBeLessThanOrEqual(size.viewport);
   expect(Math.hypot(p.tip.x-nodeX,p.tip.y-nodeY)).toBeCloseTo(radius);
   if(p.edge==='left'||p.edge==='right'){const x=p.left+(p.edge==='right'?cardWidth:0);expect(p.a.x).toBe(x);expect(p.b.x).toBe(x);}else{const y=p.top+(p.edge==='bottom'?cardHeight:0);expect(p.a.y).toBe(y);expect(p.b.y).toBe(y);}
  });
 }
});
