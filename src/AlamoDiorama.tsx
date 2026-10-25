import {useEffect,useRef,useState,type ComponentProps} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import polygonClipping from 'polygon-clipping';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {SFGrid} from './SFGrid';
import {buildings,local,geo,paths,steiner,park} from './neighborhood';
import {groundY,surfaceAt,localCellAt,localCellBounds,interventionSamples} from './alamoLayout';
import {canAct,curveNumber,runoffMm,type Cell,type Action} from './simulation';
import {CHOICE_COLORS} from './sfChoices';
type Props=ComponentProps<typeof SFGrid>;
const colors={lawn:'#829d62',path:'#e4cfac',street:'#989c91',pavement:'#d9c7a9',building:'#ccbaa1'};
const material=(color:string,extra:THREE.MeshStandardMaterialParameters={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
function dispose(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
class AlamoWorld{
 scene=new THREE.Scene();renderer:THREE.WebGLRenderer;camera:THREE.PerspectiveCamera;controls:OrbitControls;terrain:THREE.Mesh;occluders:THREE.Object3D[]=[];dynamic=new THREE.Group();grid=new THREE.Group();selection=new THREE.Group();rain:THREE.Points;frame=0;observer:ResizeObserver;ray=new THREE.Raycaster();pointer=new THREE.Vector2();down={x:0,y:0};hover:number|null=null;transition=false;targetPos=new THREE.Vector3();targetLook=new THREE.Vector3(20,2,0);stormEnd=0;gridVisible=true;disposed=false;
 constructor(public host:HTMLDivElement,public props:Props,public onHover:(id:number|null)=>void){
  this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(host.clientWidth,host.clientHeight);this.renderer.setClearColor('#eee1c9');this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;host.appendChild(this.renderer.domElement);
  this.camera=new THREE.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.5,1400);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=55;this.controls.maxDistance=430;this.controls.maxPolarAngle=Math.PI*.46;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;this.controls.addEventListener('start',()=>this.transition=false);
  this.scene.fog=new THREE.Fog('#eee1c9',340,850);this.scene.add(new THREE.HemisphereLight('#fff4db','#8a9471',1.4));
  const sun=new THREE.DirectionalLight('#ffdbac',2.0);sun.position.set(-90,150,-80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-160;sun.shadow.camera.right=160;sun.shadow.camera.top=150;sun.shadow.camera.bottom=-150;sun.shadow.camera.far=500;sun.shadow.normalBias=.12;sun.shadow.bias=-.00015;sun.shadow.radius=4;this.scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),material('#e8d7bb'));floor.rotation.x=-Math.PI/2;floor.position.y=-13;floor.receiveShadow=true;this.scene.add(floor);
  const base=this.box(this.scene,2.5,-12,0,209,7,182,'#c9b28c',3);base.receiveShadow=true;
  const geoGround=new THREE.PlaneGeometry(205,178,230,200);geoGround.rotateX(-Math.PI/2);geoGround.translate(2.5,0,0);
  const pos=geoGround.getAttribute('position'),vertexColors=[];
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);const cx=Math.max(-84,Math.min(89,x)),cz=Math.max(-73,Math.min(73,z)),dx=x-cx,dz=z-cz,len=Math.hypot(dx,dz);if(len>16){x=cx+dx/len*16;z=cz+dz/len*16;}pos.setXYZ(i,x,groundY(x,z),z);const surface=surfaceAt(x,z);const c=new THREE.Color(colors[surface==='path'?'lawn':surface==='street'?'pavement':surface]);const noise=Math.sin(x*.35+z*.19)*.025+Math.cos(z*.23-x*.11)*.018;c.offsetHSL(.003,0,noise);vertexColors.push(c.r,c.g,c.b);}
  geoGround.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));geoGround.computeVertexNormals();this.terrain=new THREE.Mesh(geoGround,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));this.terrain.receiveShadow=true;this.scene.add(this.terrain);
  this.createRibbons();this.createHouses();this.createPark();this.scene.add(this.dynamic,this.grid,this.selection);this.createGrid();
  const rainGeometry=new THREE.BufferGeometry(),rainPos=new Float32Array(600*3);for(let i=0;i<600;i++){rainPos[i*3]=-75+(i*37.37)%180;rainPos[i*3+1]=(i*13.7)%90;rainPos[i*3+2]=-80+(i*19.7)%160;}rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPos,3));this.rain=new THREE.Points(rainGeometry,new THREE.PointsMaterial({color:'#fbefd9',size:.4,transparent:true,opacity:.7}));this.rain.visible=false;this.scene.add(this.rain);
  const canvas=this.renderer.domElement;canvas.addEventListener('pointerdown',this.pointerDown);canvas.addEventListener('pointerup',this.pointerUp);canvas.addEventListener('pointermove',this.pointerMove);canvas.addEventListener('pointerleave',this.pointerLeave);
  this.observer=new ResizeObserver(()=>{if(!host.clientWidth||!host.clientHeight)return;this.renderer.setSize(host.clientWidth,host.clientHeight);this.camera.aspect=host.clientWidth/host.clientHeight;this.camera.updateProjectionMatrix();});this.observer.observe(host);
  this.setView(true);this.update(props);this.animate();
 }
 box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string,r=.15){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),material(color));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 blob(parent:THREE.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string){const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material(color));m.position.set(x,y,z);m.scale.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 branch(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number){const delta=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r*.65,r,delta.length(),8),material('#8e7958'));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;parent.add(m);}
 tree(parent:THREE.Object3D,x:number,z:number,h:number,seed=0,small=false){const y=groundY(x,z);this.branch(parent,new THREE.Vector3(x,y,z),new THREE.Vector3(x+.5,y+h*.72,z),h*.045);for(let k=0;k<5;k++){const a=k*2.399+seed,rad=h*(k===0?.08:.24),xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad,yy=y+h*(.72+(k%3)*.1);this.branch(parent,new THREE.Vector3(x,y+h*.46,z),new THREE.Vector3(xx,yy,zz),h*.025);this.blob(parent,xx,yy,zz,h*.28,h*(small?.29:.2),h*.27,['#6f8957','#8c9d64','#a5af73','#788f57','#96a166'][(k+seed)%5]);}}
 createRibbons(){
  const extent:polygonClipping.Polygon=[[[-98,-85],[103,-85],[103,85],[-98,85],[-98,-85]]];
  for(const [features,width,color]of [[steiner,8,'#969c91'],[paths,3,'#e0c9a5']] as const){const polygons:polygonClipping.Polygon[]=[];
   for(const f of features){const points=f.geometry.map(p=>local(p.lon,p.lat));
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Math.min(a.x,b.x)>115||Math.max(a.x,b.x)< -115||Math.min(a.z,b.z)>100||Math.max(a.z,b.z)< -100)continue;const length=Math.hypot(b.x-a.x,b.z-a.z);if(!length)continue;const nx=-(b.z-a.z)/length*width,nz=(b.x-a.x)/length*width;
     polygons.push([[[a.x+nx,a.z+nz],[a.x-nx,a.z-nz],[b.x-nx,b.z-nz],[b.x+nx,b.z+nz],[a.x+nx,a.z+nz]]]);
     for(const p of [a,b]){const ring:polygonClipping.Pair[]=[];for(let k=0;k<=20;k++){const t=k/20*Math.PI*2;ring.push([p.x+Math.cos(t)*width,p.z+Math.sin(t)*width]);}ring[ring.length-1]=ring[0];polygons.push([ring]);}
    }
   }
   if(!polygons.length)continue;
   let merged=polygonClipping.intersection(polygonClipping.union(polygons[0],...polygons.slice(1)),extent);
   if(width===3){const boundary:polygonClipping.Pair[]=park.geometry.map(p=>{const q=local(p.lon,p.lat);return[q.x,q.z];});merged=polygonClipping.intersection(merged,[boundary]);}
   for(const polygon of merged){const shape=new THREE.Shape(polygon[0].map(p=>new THREE.Vector2(p[0],-p[1])));for(const hole of polygon.slice(1))shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p[0],-p[1]))));let geometry:THREE.BufferGeometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry=new TessellateModifier(2,6).modify(geometry);const positions=geometry.getAttribute('position');for(let i=0;i<positions.count;i++)positions.setY(i,groundY(positions.getX(i),positions.getZ(i))+.09);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material(color,{side:THREE.DoubleSide}));mesh.receiveShadow=true;this.scene.add(mesh);}
  }
 }
 createHouses(){
  const houses=buildings.filter(f=>f.tags['addr:street']==='Steiner Street'&&['710','712','714','716','718','720','722'].includes(f.tags['addr:housenumber'])).sort((a,b)=>Number(a.tags['addr:housenumber'])-Number(b.tags['addr:housenumber']));
  const palette=['#e4ba91','#b8d0c3','#e8d7ad','#e1c48f','#c8c3d2','#dfbba0','#b6c397'];
  houses.forEach((f,i)=>{
   const pts=f.geometry.map(p=>local(p.lon,p.lat)),xs=pts.map(p=>p.x),zs=pts.map(p=>p.z),xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs),x=(xmin+xmax)/2,z=(zmin+zmax)/2,w=(zmax-zmin)*.9,d=(xmax-xmin)*.94,base=groundY(x,z),height=Number(f.tags.height)||12,bodyH=height-3,color=palette[i],group=new THREE.Group();group.position.set(x,base,z);group.rotation.y=-.16;this.scene.add(group);
   const body=this.box(group,0,0,0,d,bodyH,w,color,.3);this.occluders.push(body);
   // Gables run along house depth; façades face the park (west).
   const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,3.1);shape.lineTo(w/2,0);shape.closePath();const roofGeo=new THREE.ExtrudeGeometry(shape,{depth:d+1,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:2,steps:1});roofGeo.rotateY(-Math.PI/2);const roof=new THREE.Mesh(roofGeo,material('#b27f5e'));roof.position.set(d/2+.5,bodyH,-.0);roof.castShadow=true;group.add(roof);this.occluders.push(roof);
   this.box(group,-d/2-.15,bodyH-.25,0,.35,.42,w+.35,'#fff0ce');this.box(group,-d/2-.22,4.7,0,.48,.25,w+.3,'#f5e4c5');
   const front=-d/2-.22;
   // Cream trim and projecting bay windows give the row its recognizable rhythm.
   for(const floor of [1.9,5.2])for(const zz of [-w*.27,w*.27]){this.box(group,front-.5,floor-.2,zz,1,2.8,w*.27,'#f8e8c9',.08);this.box(group,front-1.03,floor,zz,.1,2.2,w*.19,'#6f9691',.03);this.box(group,front-1.11,floor,zz,.12,2.2,.1,'#f7e7c9',.02);this.box(group,front-1.12,floor+1,zz,.13,.1,w*.19,'#f7e7c9',.02);this.box(group,front-.6,floor+2.35,zz,1.25,.2,w*.32,'#fff0d3',.04);}
   this.box(group,front-.1,.6,0,.22,2.7,1.05,'#718f80');this.box(group,front-.24,3.15,0,.35,.3,1.4,'#f9e9cb');for(let step=0;step<4;step++)this.box(group,front-2+step*.4,0,0,.48,.2*(step+1),1.4,'#dac9ab',.04);
   const gable=new THREE.Shape();gable.moveTo(-w/2+.35,0);gable.lineTo(0,2.6);gable.lineTo(w/2-.35,0);gable.closePath();const gm=new THREE.Mesh(new THREE.ShapeGeometry(gable),material(color));gm.rotation.y=-Math.PI/2;gm.position.set(front-.02,bodyH+.1,0);group.add(gm);
   this.box(group,front-.16,bodyH+.65,0,.18,1.05,1.25,'#f7e7c9');this.box(group,front-.28,bodyH+.8,0,.08,.75,.9,'#7e9a91');
   this.box(group,d*.23,bodyH+1.6,w*.32,1.1,2.4,.85,'#dcc4a5');this.box(group,d*.23,bodyH+3.9,w*.32,1.35,.23,1.1,'#f4dfbd');
   for(const zz of [-w*.48,w*.48])this.box(group,front-.12,.5,zz,.25,bodyH-.5,.23,'#f5e4c5',.04);
   this.blob(this.scene,xmin-3,groundY(xmin-3,z)+.8,z+w*.38,1.5,.85,1.2,'#94a365');
  });
  // A few quiet background buildings; all remain outside the editable lawn.
  for(let i=0;i<8;i++){const x=94+(i%2)*10,z=-70+i*18;this.box(this.scene,x,groundY(x,z),z,13,8+(i%3)*2,13,['#d9c9af','#d1c8b4','#dfc9b3'][i%3],.5);}
 }
 createPark(){
  for(const [x,z,h,seed]of [[-63,-54,21,1],[-82,21,24,2],[-55,60,22,3],[-22,-65,18,4],[-73,-12,17,0],[0,66,17,2]] as number[][]){if(surfaceAt(x,z)==='lawn')this.tree(this.scene,x,z,h,seed);}
  // Grounded tufts and flowers stay off mapped paving and building footprints.
  const tuftGeo=new THREE.ConeGeometry(.17,.65,3),tuftMat=material('#869b5c'),tufts=new THREE.InstancedMesh(tuftGeo,tuftMat,500),dummy=new THREE.Object3D();let count=0;
  for(let i=0;i<900&&count<500;i++){const x=-95+((i*41.731)%135),z=-80+((i*29.137)%159);if(surfaceAt(x,z)!=='lawn')continue;dummy.position.set(x,groundY(x,z)+.3,z);dummy.rotation.y=i;dummy.scale.setScalar(.6+(i%5)*.12);dummy.updateMatrix();tufts.setMatrixAt(count++,dummy.matrix);}tufts.count=count;tufts.castShadow=false;this.scene.add(tufts);
  for(const [x,z]of [[-25,35],[-36,-37],[-62,42]]){if(surfaceAt(x,z)==='lawn'){this.picnic(x,z);}}
  for(const [x,z]of [[-8,30],[-18,-37]]){const group=new THREE.Group();group.position.set(x,groundY(x,z),z);group.rotation.y=.4;this.scene.add(group);for(let j=0;j<3;j++)this.box(group,j*.38,.9,0,.28,.18,3,'#ad8258',.06);for(const zz of [-1,1]){this.box(group,.35,0,zz,.15,.95,.15,'#6c7864',.03);this.box(group,.8,.7,zz,.15,1.1,.15,'#6c7864',.03);}this.box(group,.85,1.3,0,.15,.75,3,'#bb9160',.05);}
 }
 picnic(x:number,z:number){const y=groundY(x,z);this.box(this.scene,x,y+.05,z,3.7,.06,2.8,'#dcaf8a',.03);this.person(x-.8,z,.9,'#789b9c');this.person(x+1,z+.4,.8,'#deb979');}
 person(x:number,z:number,s:number,color:string){const y=groundY(x,z);this.blob(this.scene,x,y+.8*s,z,.43*s,.65*s,.38*s,color);this.blob(this.scene,x,y+1.65*s,z,.32*s,.34*s,.32*s,'#d9b38a');this.blob(this.scene,x,y+1.85*s,z-.02,.34*s,.18*s,.33*s,'#6b6050');}
 skyline(){const group=new THREE.Group();group.position.set(240,-13,-130);this.scene.add(group);for(let i=0;i<26;i++){const z=(i-13)*13,h=14+(Math.sin(i*17)+1)*17;this.box(group,(i%3)*12,0,z,9,h,10,'#d8c7b0',.6);}const spire=new THREE.Mesh(new THREE.ConeGeometry(7,29,4),material('#cebaa3'));spire.position.set(-4,43,-15);group.add(spire);}
 createGrid(){const pts:number[]=[];for(const c of this.props.state.cells){const b=localCellBounds(c);for(const [a,d]of [[[b.west,b.north],[b.east,b.north]],[[b.west,b.north],[b.west,b.south]],...(c.x===11?[[[b.east,b.north],[b.east,b.south]]]:[]),...(c.y===11?[[[b.west,b.south],[b.east,b.south]]]:[])] as number[][][]){for(let i=0;i<6;i++){const x1=a[0]+(d[0]-a[0])*i/6,z1=a[1]+(d[1]-a[1])*i/6,x2=a[0]+(d[0]-a[0])*(i+1)/6,z2=a[1]+(d[1]-a[1])*(i+1)/6;pts.push(x1,groundY(x1,z1)+.1,z1,x2,groundY(x2,z2)+.1,z2);}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));this.grid.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#fff4cd',transparent:true,opacity:.28,depthWrite:false})));}
 outline(id:number,color:string,opacity=1){const c=this.props.state.cells[id];if(!c)return;const b=localCellBounds(c),pts:THREE.Vector3[]=[];for(const [a,d]of [[[b.west,b.north],[b.east,b.north]],[[b.east,b.north],[b.east,b.south]],[[b.east,b.south],[b.west,b.south]],[[b.west,b.south],[b.west,b.north]]])for(let i=0;i<=8;i++){const x=a[0]+(d[0]-a[0])*i/8,z=a[1]+(d[1]-a[1])*i/8;pts.push(new THREE.Vector3(x,groundY(x,z)+.22,z));}const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));this.selection.add(m);}
 patch(c:Cell,action:Action,ghost:boolean){const samples=interventionSamples(c,action);if(!samples.length)return;const positions:number[]=[],pColors:number[]=[];const color=new THREE.Color(action==='housing'?'#eadbbc':action==='retrofit'?'#9a8b66':action==='restore'?'#a1b777':'#acc47e');for(const p of samples){const corners=[[p.x-p.dx/2,p.z-p.dz/2],[p.x+p.dx/2,p.z-p.dz/2],[p.x+p.dx/2,p.z+p.dz/2],[p.x-p.dx/2,p.z+p.dz/2]];for(const i of [0,2,1,0,3,2]){const [x,z]=corners[i];positions.push(x,groundY(x,z)+.13,z);pColors.push(color.r,color.g,color.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(pColors,3));g.computeVertexNormals();const patch=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,transparent:ghost,opacity:ghost?.7:1}));patch.receiveShadow=true;this.dynamic.add(patch);
  const center=samples.reduce((s,p)=>({x:s.x+p.x/samples.length,z:s.z+p.z/samples.length}),{x:0,z:0});const chosen=samples.reduce((best,p)=>Math.hypot(p.x-center.x,p.z-center.z)<Math.hypot(best.x-center.x,best.z-center.z)?p:best,samples[0]);
  if(action==='restore')this.tree(this.dynamic,chosen.x,chosen.z,ghost?5:3+Math.min(1,c.age/60)*5,c.id%5,true);
  if(action==='retrofit')samples.filter((_,i)=>i%4===0).forEach((p,i)=>{this.blob(this.dynamic,p.x,groundY(p.x,p.z)+.5,p.z,.5,.65,.5,i%3?'#8b9e64':'#c5b77c');});
  if(action==='housing')samples.filter((_,i)=>i%2===0).forEach(p=>{this.box(this.dynamic,p.x,groundY(p.x,p.z)+.15,p.z,p.dx*.8,.08,p.dz*.8,'#f2e1bd',.04);});
 }
 redrawSelection(){dispose(this.selection);this.selection.clear();if(this.props.selected!==null)this.outline(this.props.selected,'#fff1a6');if(this.hover!==null&&this.hover!==this.props.selected)this.outline(this.hover,'#fff8df',.85);if(this.props.highlightPieces)for(const c of this.props.state.cells)if(c.intervention||c.project||this.props.plans?.some(p=>p.id===c.id))this.outline(c.id,'#ffe09c');}
 update(props:Props){const before=this.props;this.props=props;if(props.view!==before.view||props.recenter!==before.recenter)this.setView();if(props.zoom!==before.zoom){this.camera.fov=36/props.zoom;this.camera.updateProjectionMatrix();}if(props.storm!==before.storm)this.stormEnd=performance.now()+3300;
  dispose(this.dynamic);this.dynamic.clear();for(const c of props.state.cells){if(c.intervention)this.patch(c,c.intervention,false);else if(c.project)this.patch(c,c.project.action,true);if(props.layer==='runoff'){const samples=interventionSamples(c,'protect',3);const color=new THREE.Color('#88bda0').lerp(new THREE.Color('#d79c79'),runoffMm(props.rainMm||35,curveNumber(c))/(props.rainMm||35));for(const p of samples){const m=new THREE.Mesh(new THREE.PlaneGeometry(p.dx,p.dz),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(p.x,groundY(p.x,p.z)+.22,p.z);this.dynamic.add(m);}}}
  for(const p of props.preview?props.plans||[]:[])this.patch(props.state.cells[p.id],p.action,true);this.redrawSelection();this.grid.visible=this.gridVisible;
 }
 setView(immediate=false){this.targetLook.set(19,2,0);this.targetPos.copy(this.props.view==='bev'?new THREE.Vector3(19,240,.1):new THREE.Vector3(-86,82,115));if(immediate){this.camera.position.copy(this.targetPos);this.controls.target.copy(this.targetLook);this.controls.update();}else this.transition=true;}
 hit(e:PointerEvent){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects([this.terrain,...this.occluders],false)[0];if(!hit||hit.object!==this.terrain)return null;return localCellAt(hit.point.x,hit.point.z);}
 pointerDown=(e:PointerEvent)=>{this.down={x:e.clientX,y:e.clientY};};
 pointerUp=(e:PointerEvent)=>{if(e.button!==0||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5)return;const id=this.hit(e);if(id!==null)this.props.onSelect(id);};
 pointerMove=(e:PointerEvent)=>{if(e.buttons)return;const id=this.hit(e);if(id===this.hover)return;this.hover=id;this.renderer.domElement.style.cursor=id===null?'grab':'pointer';this.onHover(id);this.redrawSelection();};
 pointerLeave=()=>{this.hover=null;this.onHover(null);this.redrawSelection();};
 animate=()=>{if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);if(this.transition){this.camera.position.lerp(this.targetPos,.08);this.controls.target.lerp(this.targetLook,.08);if(this.camera.position.distanceTo(this.targetPos)<.25)this.transition=false;}this.controls.update();this.rain.visible=performance.now()<this.stormEnd;if(this.rain.visible){const p=this.rain.geometry.getAttribute('position');for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)<0?80:p.getY(i)-.8);p.needsUpdate=true;}this.renderer.render(this.scene,this.camera);};
 destroy(){this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();const c=this.renderer.domElement;c.removeEventListener('pointerdown',this.pointerDown);c.removeEventListener('pointerup',this.pointerUp);c.removeEventListener('pointermove',this.pointerMove);c.removeEventListener('pointerleave',this.pointerLeave);dispose(this.scene);this.renderer.dispose();c.remove();}
}
export function AlamoDiorama(props:Props){const host=useRef<HTMLDivElement>(null),world=useRef<AlamoWorld|null>(null),latest=useRef(props),[hover,setHover]=useState<number|null>(null),[grid,setGrid]=useState(true);latest.current=props;
 useEffect(()=>{if(!host.current)return;const w=new AlamoWorld(host.current,{...props,onSelect:id=>latest.current.onSelect(id)},setHover);world.current=w;return()=>{world.current=null;w.destroy();};},[]);
 useEffect(()=>{world.current?.update({...props,onSelect:id=>latest.current.onSelect(id)});},[props.state,props.selected,props.action,props.view,props.layer,props.storm,props.zoom,props.preview,props.highlightPieces,props.plans,props.planningState,props.rainMm,props.recenter]);
 useEffect(()=>{if(world.current){world.current.gridVisible=grid;world.current.grid.visible=grid;}},[grid]);
 const id=props.selected??hover,cell=id===null?null:props.state.cells[id],reason=cell?canAct(props.planningState||props.state,cell.id,props.action):null;
 return <><div className="alamo-diorama" ref={host} role="img" aria-label="Warm illustrated 3D Alamo Square lawn and Painted Ladies, with a geographically aligned selectable grid"/><div className="diorama-location"><span>SAN FRANCISCO · ALAMO SQUARE</span><strong>A little room to grow.</strong><small>The lawn across from the Painted Ladies</small></div><div className="diorama-controls"><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>Planning grid</label><span>{cell?`Tile ${cell.x+1}, ${cell.y+1}${props.plans?.some(p=>p.id===cell.id)?' · planned':cell.locked?' · preserved building':reason?' · inspect this ground':' · ready to place'}`:'Choose a patch of the park'}</span></div><div className="diorama-footnote">Mapped layout · illustrated terrain & details</div></>;
}
