import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {BBOX,HEIGHT,WIDTH,canAct,curveNumber,runoffMm,type Action,type Cell,type GameState,type LandUse,type Layer} from './simulation';
import type {PlanItem} from './community';
import {parkShape,roadShape,pathShape,lawnShape,mappedBuildings,gridPatch,patchPoint,type GridPolygon} from './gridLandscape';
import {rotateGrid,unrotateGrid,projectGridSwing,unprojectGridSwing} from './gridRotation';
import {CHOICE_COLORS} from './sfChoices';
export type ViewMode='grid'|'bev';
type Props={state:GameState;selected:number|null;action:Action;view:ViewMode;layer:Layer;storm:number;zoom:number;preview:boolean;thumbnail?:boolean;placementHints?:boolean;eligibleIds?:number[];highlightPieces?:boolean;plans?:PlanItem[];planningState?:GameState;rainMm?:number;recenter?:number;rotation?:number;onSelect:(id:number)=>void;onRemove?:(id:number)=>void};
const toolColors=Object.fromEntries(Object.entries(CHOICE_COLORS).map(([action,color])=>[action,parseInt(color.slice(1),16)])) as Record<Action,number>;
const colors:Record<LandUse,number>={urban:0xa8ad9b,grass:0x9ab769,trees:0x75964f,bare:0xc4ad80,water:0x528e9a,retrofit:0x78aa77};
const triangleCache=new WeakMap<object,{vertices:number[];indices:number[]}>();
function triangulate(polygon:GridPolygon){const cached=triangleCache.get(polygon);if(cached)return cached;const vertices:number[]=[],holes:number[]=[];polygon.forEach((ring,i)=>{if(i)holes.push(vertices.length/2);for(const p of ring){vertices.push(p[0],p[1]);}});const result={vertices,indices:Phaser.Geom.Polygon.Earcut(vertices,holes,2)};triangleCache.set(polygon,result);return result;}
const contains=(points:{x:number;y:number}[],x:number,y:number)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;};
class GridScene extends Phaser.Scene{
 props:Props;terrain!:Phaser.GameObjects.Graphics;objects!:Phaser.GameObjects.Graphics;overlay!:Phaser.GameObjects.Graphics;weather!:Phaser.GameObjects.Graphics;
 lastClick:{id:number;time:number;x:number;y:number}|null=null;
 occlusion:{points:{x:number;y:number}[];id:number|null}[]=[];
 tw=14;th=7;ox=0;oy=0;zoomLevel=1;panX=0;panY=0;focusX=WIDTH/2;focusY=HEIGHT/2;hover:number|null=null;start:{x:number;y:number;px:number;py:number}|null=null;dragged=false;stormUntil=0;camera=0;cameraFrom=0;cameraTarget=0;cameraStarted=0;
 constructor(props:Props){super('sf-grid');this.props=props;this.zoomLevel=props.zoom;this.camera=this.cameraTarget=props.view==='bev'?1:0;this.focusX=WIDTH/2;this.focusY=HEIGHT/2;}
 create(){this.terrain=this.add.graphics().setDepth(0);this.overlay=this.add.graphics().setDepth(1);this.objects=this.add.graphics().setDepth(2);this.weather=this.add.graphics().setDepth(3);this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.start={x:p.x,y:p.y,px:this.panX,py:this.panY};this.dragged=false;});
 this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.isDown&&this.start&&Math.hypot(p.x-this.start.x,p.y-this.start.y)>5)this.dragged=true;if(this.dragged&&this.start){this.panX=this.start.px+p.x-this.start.x;this.panY=this.start.py+p.y-this.start.y;this.renderMap();return;}this.hover=this.hit(p.x,p.y);this.drawOverlay();});
 this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(!this.dragged){const id=this.hit(p.x,p.y);if(id!==null){const last=this.lastClick,now=this.time.now;if(this.props.onRemove&&last?.id===id&&now-last.time<350&&Math.hypot(p.x-last.x,p.y-last.y)<6){this.lastClick=null;this.props.onRemove(id);}else{this.lastClick={id,time:now,x:p.x,y:p.y};this.props.onSelect(id);}}else this.lastClick=null;}else this.lastClick=null;this.start=null;this.dragged=false;});this.input.on('gameout',()=>{this.start=null;this.dragged=false;this.hover=null;this.drawOverlay();});
 this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>{this.zoomLevel=Phaser.Math.Clamp(this.zoomLevel-dy*.001,.6,4);this.renderMap();});this.scale.on('resize',()=>this.renderMap());this.renderMap();}
 rotated(x:number,y:number){return rotateGrid(x,y,this.props.rotation||0,WIDTH,HEIGHT);}
 depth(x:number,y:number){const p=this.rotated(x,y);return p.x+p.y;}
 point(x:number,y:number){const r=this.rotated(x,y),p=projectGridSwing(r.x,r.y,this.camera);return{x:this.ox+p.x*this.tw,y:this.oy+p.y*this.tw};}
 inverse(x:number,y:number){const p=unprojectGridSwing((x-this.ox)/this.tw,(y-this.oy)/this.tw,this.camera);return unrotateGrid(p.x,p.y,this.props.rotation||0,WIDTH,HEIGHT);}
 hit(x:number,y:number){for(let i=this.occlusion.length-1;i>=0;i--)if(contains(this.occlusion[i].points,x,y))return this.occlusion[i].id;const p=this.inverse(x,y),cx=Math.floor(p.x),cy=Math.floor(p.y);return cx>=0&&cx<WIDTH&&cy>=0&&cy<HEIGHT?cy*WIDTH+cx:null;}
 polygon(g:Phaser.GameObjects.Graphics,points:{x:number;y:number}[],color:number,alpha=1){g.fillStyle(color,alpha);g.fillPoints(points,true);}
 diamond(g:Phaser.GameObjects.Graphics,x:number,y:number,color:number,alpha=1){const p=[this.point(x,y),this.point(x+1,y),this.point(x+1,y+1),this.point(x,y+1)];this.polygon(g,p,color,alpha);return p;}
 setProps(next:Props){const previous=this.props;this.props=next;
 if(next.view!==previous.view){this.cameraFrom=this.camera;this.cameraTarget=next.view==='bev'?1:0;this.cameraStarted=this.time.now;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.camera=this.cameraTarget;}
 if(next.zoom!==previous.zoom){this.zoomLevel=next.zoom;}
 if(next.recenter!==previous.recenter){this.panX=0;this.panY=0;this.focusX=WIDTH/2;this.focusY=HEIGHT/2;this.zoomLevel=next.zoom;}
 if(next.storm!==previous.storm&&next.storm)this.stormUntil=this.time.now+3200;if(this.terrain)this.renderMap();}
 shapes(g:Phaser.GameObjects.Graphics,shapes:GridPolygon[],color:number,alpha=1){g.fillStyle(color,alpha);for(const shape of shapes){const {vertices,indices}=triangulate(shape);for(let i=0;i<indices.length;i+=3){const a=this.point(vertices[indices[i]*2],vertices[indices[i]*2+1]),b=this.point(vertices[indices[i+1]*2],vertices[indices[i+1]*2+1]),c=this.point(vertices[indices[i+2]*2],vertices[indices[i+2]*2+1]);g.fillTriangle(a.x,a.y,b.x,b.y,c.x,c.y);}}}
 renderMap(){const w=this.scale.width,h=this.scale.height;if(!this.terrain||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return;const overhead=this.camera>=.9999,corners=[[0,0],[WIDTH,0],[WIDTH,HEIGHT],[0,HEIGHT]].map(([x,y])=>{const r=this.rotated(x,y);return projectGridSwing(r.x,r.y,this.camera);}),spanX=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),spanY=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));this.tw=Math.max(2,Math.min(Math.max(30,w-(this.props.thumbnail?24:60))/spanX,Math.max(30,h-(this.props.thumbnail?32:95))/spanY)*this.zoomLevel);this.th=this.tw*(.5+.5*this.camera);const focus=this.rotated(this.focusX,this.focusY),projected=projectGridSwing(focus.x,focus.y,this.camera);this.ox=w/2-projected.x*this.tw+this.panX;this.oy=h*.55-projected.y*this.tw+this.panY;
 const g=this.terrain;g.clear();this.objects.clear();this.occlusion=[];const decorations:{depth:number;draw:()=>void}[]=[],queued=new Map((this.props.preview?this.props.plans||[]:[]).map(item=>[item.id,item.action]));
 const outline=[this.point(0,0),this.point(WIDTH,0),this.point(WIDTH,HEIGHT),this.point(0,HEIGHT)];
 if(!overhead){const frontCorner=outline.reduce((best,p,i)=>p.y>outline[best].y?i:best,0);for(const offset of [-1,1]){const a=outline[frontCorner],b=outline[(frontCorner+offset+4)%4];this.polygon(g,[a,b,{x:b.x,y:b.y+9*(1-this.camera)},{x:a.x,y:a.y+9*(1-this.camera)}],offset===1?0x687b60:0x53675a);}}
 this.polygon(g,outline,0xc9c6ac);this.shapes(g,parkShape,0x9eaf78);this.shapes(g,lawnShape,0x9eaf78);this.shapes(g,roadShape,0x8c9991);this.shapes(g,pathShape,0xd8cfaa);
 for(const building of mappedBuildings)this.shapes(g,building.shapes,0xb8b59c);
 for(const c of this.props.state.cells){const p=this.point(c.x+.5,c.y+.5);if(p.x< -100||p.x>w+100||p.y< -100||p.y>h+120)continue;
  if(this.props.layer==='runoff'){const t=runoffMm(this.props.rainMm||35,curveNumber(c))/(this.props.rainMm||35),col=Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(113,177,133),new Phaser.Display.Color(219,126,75),100,t*100);this.diamond(g,c.x,c.y,Phaser.Display.Color.GetColor(col.r,col.g,col.b),.7);}
  if(this.props.layer==='land'){
   const action=queued.get(c.id)||c.intervention||c.project?.action,ghost=queued.has(c.id)||!!c.project;
   const position=patchPoint(c,'restore');
   if(position&&(action==='restore'||c.original==='trees'&&c.inPark&&c.id%3===0)){const q=this.point(position.x,position.y),size=this.tw*(action==='restore'?(ghost?.55:.3+Math.min(c.age/60,1)*.35):.62);decorations.push({depth:this.depth(position.x,position.y),draw:()=>this.tree(q.x,q.y,size,ghost,c.id)});}
   // Small grass marks stay on the mapped lawn, not paths or building plots.
   if(position&&c.id%3===1){const q=this.point(position.x,position.y);g.lineStyle(1,0x7e9562,.55);g.lineBetween(q.x-3,q.y,q.x-2,q.y-3);g.lineBetween(q.x+1,q.y+1,q.x+3,q.y-2);}
  }
 }
 // Continuous mapped surfaces cross tile boundaries; the square interaction
 // grid remains visible above them in the original isometric environment.
 for(const c of this.props.state.cells){const points=[this.point(c.x,c.y),this.point(c.x+1,c.y),this.point(c.x+1,c.y+1),this.point(c.x,c.y+1)];g.lineStyle(.7,0x3f6758,.24);g.strokePoints([...points,points[0]],false);}
 if(this.props.layer==='land')for(const building of mappedBuildings){const pts=building.shapes.flatMap(s=>s[0]),depth=Math.max(...pts.map(p=>this.depth(p[0],p[1])));decorations.push({depth,draw:()=>this.building(building)});}
 decorations.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw());g.lineStyle(1.2,0xe1d3a1,.65);g.strokePoints([...outline,outline[0]],false);this.drawOverlay();
 }
 tree(x:number,y:number,size:number,ghost:boolean,id:number){const g=this.objects,alpha=ghost?.73:1,t=this.camera,o=alpha*(1-t);
 if(t>0){g.fillStyle(0x718957,alpha*t);g.fillCircle(x,y,size*.4);g.fillStyle(0xa4b17c,alpha*t);g.fillCircle(x-size*.09,y-size*.1,size*.27);this.occlusion.push({points:[{x:x-size*.4,y:y-size*.4},{x:x+size*.4,y:y-size*.4},{x:x+size*.4,y:y+size*.4},{x:x-size*.4,y:y+size*.4}],id});if(t>=.9999)return;}
 g.fillStyle(0x3f604b,.16);g.fillEllipse(x+size*.18,y+size*.08,size*.9,size*.3);
 g.lineStyle(Math.max(2,size*.11),0x857153,o);g.lineBetween(x,y,x-size*.03,y-size*.72*(1-t));
 const crowns=[{x:x-size*.18,y:y-size*.82*(1-t),w:.65,h:.47,c:0x718957},{x:x+size*.2,y:y-size*.88*(1-t),w:.67,h:.5,c:0x849b62},{x,y:y-size*1.08*(1-t),w:.7,h:.47,c:0xa4b17c}];
 for(const c of crowns){g.fillStyle(c.c,o);g.fillEllipse(c.x,c.y,size*c.w,size*c.h);}this.occlusion.push({points:[{x:x-size*.5,y:y-size*1.3},{x:x+size*.55,y:y-size*1.3},{x:x+size*.55,y},{x:x-size*.5,y}],id});
 }
 building(building:typeof mappedBuildings[number]){const g=this.objects;if(this.camera>=.9999){this.shapes(g,building.shapes,building.special?0xad906d:0x9b9f8c,1);for(const shape of building.shapes){const roof=shape[0].map(p=>this.point(p[0],p[1]));g.lineStyle(1,0xe1d3b1,.8);g.strokePoints(roof,false);this.occlusion.push({points:roof,id:null});}return;}const elevation=Math.cos((30+60*this.camera)*Math.PI/180)/Math.cos(Math.PI/6),bodyH=this.tw*Math.min(1.65,building.height/10)*.61*elevation,roofH=building.special?this.tw*.2*elevation:0,col=building.special?[0xd7c29c,0xc4d1bd,0xd9c7ad,0xd3c9b7,0xe0c99d,0xc0ccbf,0xd5bf9e][Number(building.address.slice(-1))%7]:0xb9c0b0;
 for(const shape of building.shapes){const ring=shape[0],base=ring.map(p=>this.point(p[0],p[1])),top=base.map(p=>({x:p.x,y:p.y-bodyH}));
  // Render the actual footprint as an extrusion instead of snapping a house
  // symbol to a centroid tile. One building can cover multiple squares.
  const sides=base.slice(0,-1).map((p,i)=>({i,depth:(this.depth(ring[i][0],ring[i][1])+this.depth(ring[i+1][0],ring[i+1][1]))/2})).sort((a,b)=>a.depth-b.depth);
  for(const {i}of sides){const face=[base[i],base[i+1],top[i+1],top[i]];this.polygon(g,face,(base[i+1].x-base[i].x)>0?col:Phaser.Display.Color.IntegerToColor(col).darken(13).color);this.occlusion.push({points:face,id:null});}
  this.polygon(g,top,building.special?0xad906d:0x9b9f8c);this.occlusion.push({points:top,id:null});
  if(!building.special)continue;
  const frontEdges=ring.slice(0,-1).map((p,i)=>({i,x:(p[0]+ring[i+1][0])/2,span:Math.abs(p[1]-ring[i+1][1]),dx:Math.abs(p[0]-ring[i+1][0])})).filter(e=>e.span>.25&&e.span>e.dx);
  const front=frontEdges.sort((a,b)=>a.x-b.x||b.span-a.span)[0]?.i||0;
  const a=base[front],b=base[front+1],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<4)continue;const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},peak={x:mid.x,y:mid.y-bodyH-roofH},gable=[top[front],top[front+1],peak];this.polygon(g,gable,col);this.occlusion.push({points:gable,id:null});
  g.lineStyle(Math.max(.8,this.tw*.025),0xf2e5c4,1);g.strokePoints([top[front],peak,top[front+1]],false);g.lineBetween(a.x,a.y-bodyH*.51,b.x,b.y-bodyH*.51);g.lineBetween(a.x,a.y-bodyH+.8,b.x,b.y-bodyH+.8);
  // Small framed windows sit along the geographically mapped park-facing wall.
  for(const t of [.27,.7])for(const floor of [.23,.62]){const xx=a.x+(b.x-a.x)*t,yy=a.y+(b.y-a.y)*t-bodyH*floor,ww=Math.max(2,len*.2),hh=bodyH*.23;g.fillStyle(0xf0e4c9,1);g.fillRoundedRect(xx-ww*.65,yy-hh,ww*1.3,hh+2,1);g.fillStyle(0x608780,1);g.fillRect(xx-ww*.45,yy-hh+1,ww*.9,hh-1);g.lineStyle(.8,0xe7dfc2,1);g.lineBetween(xx,yy-hh+1,xx,yy);}
  g.fillStyle(0x697e69,1);g.fillRect(mid.x-1.5,mid.y-bodyH*.24,3,bodyH*.24);
 }
 }
 patch(c:Cell,action:Action){const g=this.overlay;if(action==='restore')return;const shapes=gridPatch(c,action);this.shapes(g,shapes,toolColors[action],action==='protect'?.45:.9);
  if(action==='housing'){g.lineStyle(.7,0xf0e3be,.8);for(const polygon of shapes){const {vertices,indices}=triangulate(polygon);for(let i=0;i<indices.length;i+=3){if(i%6)continue;const a=this.point(vertices[indices[i]*2],vertices[indices[i]*2+1]),b=this.point(vertices[indices[i+1]*2],vertices[indices[i+1]*2+1]);g.lineBetween(a.x,a.y,b.x,b.y);}}}
  if(action==='retrofit'){const p=patchPoint(c,action);if(p){const q=this.point(p.x,p.y);for(let i=0;i<3;i++){g.fillStyle(i%2?0xb2bc83:0x7f9b69,1);g.fillEllipse(q.x+(i-1)*this.tw*.1,q.y-this.th*.1,this.tw*.15,this.th*.23);}}}
 }
 drawOverlay(){if(!this.overlay)return;const g=this.overlay;g.clear();
 if(this.props.placementHints){const valid=this.props.eligibleIds?new Set(this.props.eligibleIds):null;for(const c of this.props.state.cells){if(valid?!valid.has(c.id):!!canAct(this.props.planningState||this.props.state,c.id,this.props.action))continue;const shapes=gridPatch(c,this.props.action);if(!shapes.length)continue;this.shapes(g,shapes,0xf4d68c,.16);const points=[this.point(c.x,c.y),this.point(c.x+1,c.y),this.point(c.x+1,c.y+1),this.point(c.x,c.y+1)];g.lineStyle(1.5,0xffdf8e,.9);g.strokePoints([...points,points[0]],false);const center=patchPoint(c,this.props.action);if(center){const p=this.point(center.x,center.y);g.fillStyle(0xffe4a2,.9);g.fillCircle(p.x,p.y,2.5);}}}

 if(this.props.layer==='land'){
  const placed=new Map<number,Action>();
  for(const c of this.props.state.cells){const action=c.intervention||c.project?.action||(c.protected?'protect':null);if(action)placed.set(c.id,action);}
  if(this.props.preview)for(const item of this.props.plans||[])placed.set(item.id,item.action);
  for(const [id,action]of placed)this.patch(this.props.state.cells[id],action);
 }
 if(this.props.highlightPieces){
  const pieces=new Set(this.props.state.cells.filter(c=>c.intervention||c.project||c.protected).map(c=>c.id));
  for(const item of this.props.plans||[])pieces.add(item.id);
  for(const id of pieces){const c=this.props.state.cells[id];if(!c)continue;const points=[this.point(c.x,c.y),this.point(c.x+1,c.y),this.point(c.x+1,c.y+1),this.point(c.x,c.y+1)];g.lineStyle(3,0xffe09b,1);g.strokePoints([...points,points[0]],false);}
 }
 // Hover and selection only outline their tile. They never recolour terrain.
 for(const[id,active]of[[this.hover,false],[this.props.selected,true]]as const){if(id===null)continue;const c=this.props.state.cells[id];if(!c)continue;const points=[this.point(c.x,c.y),this.point(c.x+1,c.y),this.point(c.x+1,c.y+1),this.point(c.x,c.y+1)];g.lineStyle(active?2:1,active?0xffe7ab:0xd5e2c5,active?1:.65);g.strokePoints([...points,points[0]],false);}}
 update(time:number){if(!this.weather)return;if(this.camera!==this.cameraTarget){const t=Math.min(1,(time-this.cameraStarted)/850),ease=t*t*(3-2*t);this.camera=this.cameraFrom+(this.cameraTarget-this.cameraFrom)*ease;if(t===1)this.camera=this.cameraTarget;this.renderMap();}this.weather.clear();if(time>this.stormUntil)return;this.weather.fillStyle(0x163e50,.14);this.weather.fillRect(0,0,this.scale.width,this.scale.height);this.weather.lineStyle(1,0xc8e3e6,.5);for(let i=0;i<100;i++){const x=(i*113.7+time*.045)%this.scale.width,y=(i*67.3+time*.35)%this.scale.height;this.weather.lineBetween(x,y,x-4,y+12);}}
}
export function SFGrid(props:Props){const host=useRef<HTMLDivElement>(null),scene=useRef<GridScene|null>(null),callback=useRef(props.onSelect);callback.current=props.onSelect;const removeCallback=useRef(props.onRemove);removeCallback.current=props.onRemove;
 useEffect(()=>{if(!host.current)return;const s=new GridScene({...props,onSelect:id=>callback.current(id),onRemove:id=>removeCallback.current?.(id)});scene.current=s;const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,transparent:true,antialias:true,scale:{mode:Phaser.Scale.RESIZE,width:host.current.clientWidth,height:host.current.clientHeight},scene:s,audio:{noAudio:true}});return()=>{scene.current=null;game.destroy(true);};},[GridScene]);
 useEffect(()=>scene.current?.setProps({...props,onSelect:id=>callback.current(id),onRemove:id=>removeCallback.current?.(id)}),[props.state,props.selected,props.action,props.view,props.layer,props.storm,props.zoom,props.preview,props.recenter,props.plans,props.planningState,props.rainMm,props.highlightPieces,props.rotation,props.placementHints,props.eligibleIds]);
 return <div className="sf-grid-host" ref={host} role="img" aria-label={props.thumbnail?"Alamo Square, mapped land-cover grid.":"Interactive isometric Alamo Square tile grid. Drag to pan, scroll to zoom, use rotation buttons to turn the view, select a tile, then click an option to place a persistent planned change. Double-click a planned piece to remove it."}/>;
}
