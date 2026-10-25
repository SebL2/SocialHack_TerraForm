import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {BBOX,WIDTH,HEIGHT,cellLocation,curveNumber,runoffMm,type GameState,type Layer,type Cell} from './simulation';

class LandscapeScene extends Phaser.Scene {
 state:GameState; selected:number|null; layer:Layer; onSelect:(id:number)=>void;
 terrain!:Phaser.GameObjects.Graphics; overlay!:Phaser.GameObjects.Graphics; atmosphere!:Phaser.GameObjects.Graphics;
 labels:Phaser.GameObjects.Text[]=[]; tw=14; th=7; ox=0; oy=0; hover:number|null=null; stormUntil=0; zoomLevel=1; panX=0;panY=0; start:{x:number;y:number;px:number;py:number}|null=null; dragged=false;
 constructor(state:GameState,selected:number|null,layer:Layer,onSelect:(id:number)=>void){super('landscape');this.state=state;this.selected=selected;this.layer=layer;this.onSelect=onSelect;}
 create(){
  this.terrain=this.add.graphics();this.overlay=this.add.graphics();this.atmosphere=this.add.graphics();
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.start={x:p.x,y:p.y,px:this.panX,py:this.panY};this.dragged=false;});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.isDown&&this.start){if(Math.hypot(p.x-this.start.x,p.y-this.start.y)>5)this.dragged=true;if(this.dragged){this.panX=this.start.px+p.x-this.start.x;this.panY=this.start.py+p.y-this.start.y;this.renderMap();return;}}this.hover=this.hit(p.x,p.y);this.drawOverlay();});
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(!this.dragged){const id=this.hit(p.x,p.y);if(id!==null)this.onSelect(id);}this.start=null;});
  this.input.on('pointerout',()=>{this.hover=null;this.start=null;this.drawOverlay();});
  this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>{this.zoomLevel=Phaser.Math.Clamp(this.zoomLevel-dy*.001, .75,2.3);this.renderMap();});
  this.scale.on('resize',()=>this.renderMap());this.renderMap();
  void document.fonts.load('10px "TF2 Secondary"').then(()=>{if(this.sys?.isActive())this.renderMap();});
 }
 elevation(c:Cell){if(c.use==='water')return 0;const p=cellLocation(c);const hill=(lng:number,lat:number,spread:number,height:number)=>height*Math.exp(-((p.lng-lng)**2+(p.lat-lat)**2)/spread);return (12+hill(-122.449,37.752,.00015,33)+hill(-122.466,37.794,.00025,23)+hill(-122.505,37.827,.0003,45))*this.tw/14;}
 point(x:number,y:number,z=0){return{x:this.ox+(x-y)*this.tw/2,y:this.oy+(x+y)*this.th/2-z};}
 geo(lng:number,lat:number,z=0){return this.point((lng-BBOX[0])/(BBOX[2]-BBOX[0])*WIDTH,(BBOX[3]-lat)/(BBOX[3]-BBOX[1])*HEIGHT,z);}
 polygon(g:Phaser.GameObjects.Graphics,points:{x:number;y:number}[],color:number,alpha=1){g.fillStyle(color,alpha);g.fillPoints(points,true);}
 diamond(g:Phaser.GameObjects.Graphics,c:Cell,z:number,color:number){const p=[this.point(c.x,c.y,z),this.point(c.x+1,c.y,z),this.point(c.x+1,c.y+1,z),this.point(c.x,c.y+1,z)];this.polygon(g,p,color);return p;}
 hit(x:number,y:number){
  // Pick raised terrain in reverse draw order, rather than the flat water plane.
  for(let sum=WIDTH+HEIGHT-2;sum>=0;sum--){for(let cx=Math.max(0,sum-HEIGHT+1);cx<=Math.min(WIDTH-1,sum);cx++){const cy=sum-cx,c=this.state.cells[cy*WIDTH+cx];if(c.use==='water')continue;const p=this.point(cx+.5,cy+.5,this.elevation(c));if(Math.abs((x-p.x)/(this.tw/2))+Math.abs((y-p.y)/(this.th/2))<=1.1)return c.id;}}
  return null;
 }
 setData(state:GameState,selected:number|null,layer:Layer){this.state=state;this.selected=selected;this.layer=layer;if(this.terrain)this.renderMap();}
 setZoom(level:number){this.zoomLevel=level;this.panX=0;this.panY=0;if(this.terrain)this.renderMap();}
 renderMap(){
  const w=this.scale.width,h=this.scale.height;
  this.tw=Math.min((w-Math.min(75,w*.12))*2/(WIDTH+HEIGHT),(h-Math.min(115,h*.25))*4/(WIDTH+HEIGHT))*this.zoomLevel;this.th=this.tw*.52;
  this.ox=w/2-(WIDTH-HEIGHT)*this.tw/4+this.panX;this.oy=h*.51-(WIDTH+HEIGHT)*this.th/4+this.panY;
  const g=this.terrain;g.clear();
  const corners=[this.point(0,0),this.point(WIDTH,0),this.point(WIDTH,HEIGHT),this.point(0,HEIGHT)];
  this.polygon(g,corners.map(p=>({x:p.x+10,y:p.y+29})),0x0c2d35,.23);
  this.polygon(g,[corners[1],corners[2],{x:corners[2].x,y:corners[2].y+23},{x:corners[1].x,y:corners[1].y+23}],0x1b6876);
  this.polygon(g,[corners[2],corners[3],{x:corners[3].x,y:corners[3].y+23},{x:corners[2].x,y:corners[2].y+23}],0x235c68);
  this.polygon(g,corners,0x3d8f9a);
  // Faceted water and elevated terrain form a stylized diorama, not a DEM.
  for(let sum=0;sum<WIDTH+HEIGHT-1;sum++)for(let cx=Math.max(0,sum-HEIGHT+1);cx<=Math.min(WIDTH-1,sum);cx++){
   const cy=sum-cx,c=this.state.cells[cy*WIDTH+cx],seed=(c.id*2654435761)>>>0;
   if(c.use==='water'){
    if(seed%4===0){const p=this.point(cx+.5,cy+.5);g.lineStyle(1,0x8ac7c6,.25);g.lineBetween(p.x-this.tw*.25,p.y,p.x+this.tw*.25,p.y);}
    if(seed%5===0)this.diamond(g,c,0,seed%2?0x418f9b:0x398591);
    continue;
   }
   const z=this.elevation(c),p=[this.point(cx,cy,z),this.point(cx+1,cy,z),this.point(cx+1,cy+1,z),this.point(cx,cy+1,z)],ground=p.map(a=>({x:a.x,y:a.y+z+9}));
   const edgeRight=cx===WIDTH-1||this.state.cells[c.id+1]?.use==='water';
   const edgeFront=cy===HEIGHT-1||this.state.cells[c.id+WIDTH]?.use==='water';
   this.polygon(g,[p[1],p[2],ground[2],ground[1]],edgeRight?0x987953:0x6a8060);
   this.polygon(g,[p[2],p[3],ground[3],ground[2]],edgeFront?0x775d40:0x526c50);
   const colors={urban:[0xa8b798,0xb8c3a7,0xb1bda0],grass:[0x8eaf5d,0xa5bf6f,0x9ab967],trees:[0x77a34f,0x88ad58,0x6c9949],bare:[0xb9a778,0xc5b486,0xb4a279],retrofit:[0x8eb96b,0x9bc57b,0x7fa95f],water:[0x3d8f9a]};
   let col=colors[c.use][seed%3];
   if(this.layer==='runoff'){const t=runoffMm(35,curveNumber(c))/35;const a=Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(113,177,133),new Phaser.Display.Color(219,126,75),100,t*100);col=Phaser.Display.Color.GetColor(a.r,a.g,a.b);}
   this.polygon(g,p,col);if(seed%2===0)this.polygon(g,[p[0],p[1],p[2]],0xffffff,.04);
   const mid=this.point(cx+.5,cy+.5,z);
   if(this.layer==='land'){
    if(c.use==='urban'&&seed%3!==0){
     const loc=cellLocation(c),downtown=Math.exp(-((loc.lng+122.405)**2+(loc.lat-37.787)**2)/.00012);
     const bh=(3+seed%7+downtown*(10+seed%20))*this.tw/14,bw=this.tw*.50,bdepth=this.th*.5;
     this.building(g,mid.x,mid.y,bw,bdepth,bh,seed);
    }
    if(c.use==='trees'&&seed%2===0){const growth=c.original==='trees'?1:.35+.65*Math.min(1,c.age/60)*c.condition;this.tree(g,mid.x,mid.y,this.tw*(.8+seed%4*.12)*growth,seed);}
    if(c.use==='retrofit'){this.building(g,mid.x-1,mid.y,this.tw*.36,this.th*.4,4*this.tw/14,seed);this.tree(g,mid.x+this.tw*.25,mid.y+1,this.tw*.75,seed);}
   }
   if(c.project){g.lineStyle(1.3,0xffcd69);g.strokePoints([...p,p[0]],false);if(seed%2===0){g.lineStyle(1,0xf4d28c,.65);g.lineBetween(p[0].x,p[0].y,p[2].x,p[2].y);}}
   if(c.protected){g.lineStyle(1,0xb7f4a5,.9);g.strokePoints([...p,p[0]],false);}
  }
  this.bridge(g);
  this.labels.forEach(l=>l.destroy());this.labels=[];
  const label=(text:string,lng:number,lat:number,z=20)=>{if(h<400)return;const p=this.geo(lng,lat,z*this.tw/14);const l=this.add.text(p.x,p.y,text,{fontFamily:'TF2 Secondary, Arial, sans-serif',fontSize:9,color:'#fff2d4',backgroundColor:'#214c4bc9',padding:{x:8,y:5}}).setOrigin(.5).setAlpha(.92);l.setLetterSpacing(1.7);this.labels.push(l);};
  label('GOLDEN GATE',-122.491,37.817,38);label('PRESIDIO',-122.464,37.796,40);label('GOLDEN GATE PARK',-122.478,37.768,20);label('DOWNTOWN',-122.402,37.785,65);label('TWIN PEAKS',-122.451,37.751,56);
  this.drawOverlay();
 }
 building(g:Phaser.GameObjects.Graphics,x:number,y:number,bw:number,bd:number,h:number,seed:number){
  const a={x,y:y-bd/2},b={x:x+bw/2,y},c={x,y:y+bd/2},d={x:x-bw/2,y};
  const top=[a,b,c,d].map(p=>({x:p.x,y:p.y-h}));
  const roofs=[0xe6d9b4,0xf0e8cd,0xd1d9cb,0xc4d9ce,0xe3b88e];
  this.polygon(g,[b,c,top[2],top[1]],0x8e9d92);this.polygon(g,[c,d,top[3],top[2]],0xb7bdac);this.polygon(g,top,roofs[seed%roofs.length]);
  if(h>10){g.lineStyle(.7,0x6c8c87,.8);for(let i=4;i<h-1;i+=4)g.lineBetween(x+1,y-i,x+bw*.32,y-i-bd*.2);}
 }
 tree(g:Phaser.GameObjects.Graphics,x:number,y:number,size:number,seed:number){
  g.fillStyle(0x2d6249,.22);g.fillEllipse(x+size*.13,y+1,size*.65,size*.25);
  g.lineStyle(1.3,0x795a38);g.lineBetween(x,y,x,y-size*.5);
  for(let k=0;k<3;k++){const base=y-size*.12-k*size*.2,half=size*(.32-k*.065);this.polygon(g,[{x,y:base-size*.57},{x:x+half,y:base},{x:x-half,y:base}],seed%3===0?0x426f42:0x365f3c);this.polygon(g,[{x,y:base-size*.57},{x,y:base},{x:x-half,y:base}],0x81ad58);}
 }
 bridge(g:Phaser.GameObjects.Graphics){
  const a=this.geo(-122.4783,37.8105,20*this.tw/14),b=this.geo(-122.4783,37.832,20*this.tw/14);
  g.lineStyle(5*this.tw/14,0x8f8170);g.lineBetween(a.x,a.y,b.x,b.y);g.lineStyle(1,0xe4b382);g.lineBetween(a.x,a.y,b.x,b.y);
  const towers=[];for(const t of [.22,.76]){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,h=40*this.tw/14;towers.push({x,y:y-h});g.lineStyle(3*this.tw/14,0xd66c42);g.lineBetween(x-3,y+6,x-3,y-h);g.lineBetween(x+3,y+6,x+3,y-h);g.lineStyle(2,0xec9961);g.lineBetween(x-3,y-h+6,x+3,y-h+6);g.lineBetween(x-3,y-h*.55,x+3,y-h*.55);}
  g.lineStyle(1.2,0xe99563);g.beginPath();g.moveTo(a.x,a.y);for(let i=0;i<=24;i++){const t=i/24,peak=t<.22?t/.22:t>.76?(1-t)/.24:1-.45*Math.sin((t-.22)/.54*Math.PI);const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-peak*40*this.tw/14;g.lineTo(x,y);if(i%2===0){g.lineBetween(x,y,x,a.y+(b.y-a.y)*t);}}g.lineTo(b.x,b.y);g.strokePath();
 }
 drawOverlay(){if(!this.overlay)return;const g=this.overlay;g.clear();for(const[id,active]of[[this.hover,false],[this.selected,true]]as const){if(id===null)continue;const c=this.state.cells[id];if(!c||c.use==='water')continue;const z=this.elevation(c)+1,p=[this.point(c.x,c.y,z),this.point(c.x+1,c.y,z),this.point(c.x+1,c.y+1,z),this.point(c.x,c.y+1,z)];this.polygon(g,p,0xffe4a1,active?.55:.25);g.lineStyle(active?2:1.2,active?0xffd778:0xffffff);g.strokePoints([...p,p[0]],false);if(active){const m=this.point(c.x+.5,c.y+.5,z);g.lineStyle(2,0xffd778);g.lineBetween(m.x,m.y-6,m.x,m.y-32);g.fillStyle(0xffd778);g.fillCircle(m.x,m.y-35,4);}}}
 update(time:number){
  if(!this.atmosphere)return;const g=this.atmosphere;g.clear();const w=this.scale.width,h=this.scale.height;
  // A small boat and birds keep the world alive between turns.
  const boat=this.geo(-122.511+Math.sin(time/24000)*.008,37.752+Math.cos(time/26000)*.012);
  g.lineStyle(1,0xa1ddda,.5);g.lineBetween(boat.x-11,boat.y+5,boat.x-28,boat.y+7);this.polygon(g,[{x:boat.x-7,y:boat.y},{x:boat.x+8,y:boat.y},{x:boat.x+3,y:boat.y+4},{x:boat.x-4,y:boat.y+4}],0xf4e8c8);g.lineStyle(1,0xe6d5b2);g.lineBetween(boat.x,boat.y,boat.x,boat.y-14);this.polygon(g,[{x:boat.x-1,y:boat.y-14},{x:boat.x-1,y:boat.y-2},{x:boat.x-9,y:boat.y-2}],0xfff2d6);
  for(let i=0;i<4;i++){const x=(time*.013+i*137)%(w+100)-50,y=h*.17+i*13+Math.sin(time*.002+i)*5;g.lineStyle(1.2,0xd9eddf,.65);g.beginPath();g.moveTo(x-5,y+2);g.lineTo(x,y);g.lineTo(x+5,y+2);g.strokePath();}
  if(time>this.stormUntil)return;g.fillStyle(0x163e50,.22);g.fillRect(0,0,w,h);g.lineStyle(1,0xb3dce4,.55);for(let i=0;i<150;i++){const x=(i*113.7+time*.045)%w,y=(i*67.3+time*.35)%h;g.lineBetween(x,y,x-5,y+14);}
 }
}
export function Landscape({state,selected,layer,storm,zoom=1,onSelect}:{state:GameState;selected:number|null;layer:Layer;storm:number;zoom?:number;onSelect:(id:number)=>void}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<LandscapeScene|null>(null),callback=useRef(onSelect);callback.current=onSelect;
 useEffect(()=>{if(!host.current)return;const s=new LandscapeScene(state,selected,layer,id=>callback.current(id));scene.current=s;s.zoomLevel=zoom;const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,transparent:true,antialias:true,scale:{mode:Phaser.Scale.RESIZE,width:host.current.clientWidth,height:host.current.clientHeight},scene:s,render:{pixelArt:false},audio:{noAudio:true}});return()=>{scene.current=null;game.destroy(true);};},[]);
 useEffect(()=>{scene.current?.setData(state,selected,layer);},[state,selected,layer]);
 useEffect(()=>{scene.current?.setZoom(zoom);},[zoom]);
 useEffect(()=>{if(storm&&scene.current)scene.current.stormUntil=scene.current.time.now+3200;},[storm]);
 return <div className="phaser-host" ref={host} role="img" aria-label="Interactive isometric San Francisco diorama. Click terrain to select a plot, drag to pan, or use Find a plot below."/>;
}
