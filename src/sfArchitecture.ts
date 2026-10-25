import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {mappedBuildings,GridPolygon} from './gridLandscape';
type Building=typeof mappedBuildings[number];
type Painter=(color:THREE.ColorRepresentation,extra?:THREE.MeshStandardMaterialParameters)=>THREE.Material;
const palettes:Record<string,{body:string;trim:string;accent:string;roof:string}>={
 '710':{body:'#c9b085',trim:'#eee0c2',accent:'#867252',roof:'#79746c'},
 '712':{body:'#cad8d5',trim:'#f5e9cf',accent:'#75948b',roof:'#747772'},
 '714':{body:'#dadbde',trim:'#faf0d8',accent:'#9e8d98',roof:'#b37962'},
 '716':{body:'#e4c78b',trim:'#f9edce',accent:'#a08755',roof:'#a69579'},
 '718':{body:'#d4ceb0',trim:'#f3e9c8',accent:'#8a9479',roof:'#74796d'},
 '720':{body:'#d5c09d',trim:'#f6e6c7',accent:'#9c7c60',roof:'#77766c'},
 '722':{body:'#96a55b',trim:'#ecdfaf',accent:'#68774c',roof:'#95846b'},
};
/** Authored Victorian details sit on source footprints. Colors and roof forms
 * use the mapped tags; trim, railings and gates are illustrative architecture. */
export function createSFArchitecture(building:Building,heightAt:(x:number,y:number)=>number,paint:Painter){
 const root=new THREE.Group(),solid:THREE.Mesh[]=[];
 const palette=palettes[building.address]||{body:building.color,trim:'#ece3c9',accent:building.street==='Steiner Street'?'#9b885e':'#81918a',roof:building.roofColor};
 const materials=new Map<string,THREE.Material>();
 const mat=(color:string)=>{if(!materials.has(color))materials.set(color,paint(color));return materials.get(color)!;};
 const addBox=(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string,block=false)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(block)solid.push(m);return m;};
 const cylinder=(parent:THREE.Object3D,x:number,y:number,z:number,r:number,h:number,color:string)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,6),mat(color));m.position.set(x,y+h/2,z);m.castShadow=true;parent.add(m);return m;};
 const shapeOf=(poly:GridPolygon)=>{const ring=(r:number[][])=>r.map(v=>new THREE.Vector2((v[0]-6)*10,-(v[1]-6)*10));const s=new THREE.Shape(ring(poly[0]));poly.slice(1).forEach(h=>s.holes.push(new THREE.Path(ring(h))));return s;};
 for(const polygon of building.shapes){
  const ring=polygon[0],xs=ring.map(v=>(v[0]-6)*10),zs=ring.map(v=>(v[1]-6)*10),xmin=Math.min(...xs),xmax=Math.max(...xs),zmin=Math.min(...zs),zmax=Math.max(...zs),base=Math.max(...ring.map(v=>heightAt(v[0],v[1]))),special=building.special;
  const roofHeight=special?(building.roofHeight||3):0,bodyHeight=Math.max(4,building.height-roofHeight),geo=new THREE.ExtrudeGeometry(shapeOf(polygon),{depth:bodyHeight,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,base,0);const body=new THREE.Mesh(geo,mat(palette.body));body.castShadow=true;body.receiveShadow=true;root.add(body);solid.push(body);
  const flatRoof=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(polygon)),mat(palette.roof));flatRoof.rotation.x=-Math.PI/2;flatRoof.position.y=base+bodyHeight+.03;root.add(flatRoof);solid.push(flatRoof);
  // Local façade coordinates: negative x faces the street; z runs along the front.
  const facade=new THREE.Group();let width=zmax-zmin,depth=xmax-xmin;
  facade.position.set(xmin,base,(zmin+zmax)/2);
  if(!special&&building.street==='Grove Street'){facade.position.set((xmin+xmax)/2,base,zmin);facade.rotation.y=-Math.PI/2;width=xmax-xmin;depth=zmax-zmin;}
  if(!special&&building.street==='Hayes Street'){facade.position.set((xmin+xmax)/2,base,zmax);facade.rotation.y=Math.PI/2;width=xmax-xmin;depth=zmax-zmin;}
  root.add(facade);
  const trim=palette.trim,accent=palette.accent,glass='#688b8a',iron='#5e7268';
  // Painted siding is geometry, keeping the soft pigment shader on every board.
  for(let yy=.7;yy<bodyHeight-.3;yy+=.42)addBox(facade,-.035,yy,0,.055,.035,width*.98,accent);
  addBox(facade,-.12,.45,0,.22,.24,width,trim);addBox(facade,-.16,bodyHeight-.32,0,.32,.3,width+.25,trim);
  const floors=special?2:Math.max(2,Math.min(6,Math.floor(bodyHeight/3.3))),floorGap=special?3.65:(bodyHeight-1.7)/floors;
  for(let f=0;f<floors;f++){
   const yy=1.35+f*floorGap,windowH=special?2.3:Math.min(2.1,floorGap*.68),bayWidth=Math.min(2.8,width*.38),bayZ=special?-width*.18:0;
   if(special){
    // Three-sided projecting bay: each pane has its own surround and mullion.
    const bay=new THREE.Group();bay.position.set(-.22,yy,bayZ);facade.add(bay);
    addBox(bay,-.48,-.2,0,.95,windowH+.55,bayWidth,palette.body);
    for(const [xx,zz,angle,paneWidth]of [[-.99,0,0,bayWidth*.48],[-.77,-bayWidth*.36,-Math.PI/4,bayWidth*.31],[-.77,bayWidth*.36,Math.PI/4,bayWidth*.31]]){
     const pane=new THREE.Group();pane.position.set(xx,0,zz);pane.rotation.y=angle;bay.add(pane);
     addBox(pane,-.04,-.08,0,.12,windowH+.18,paneWidth+.18,trim);addBox(pane,-.115,.06,0,.045,windowH-.12,paneWidth,glass);addBox(pane,-.15,windowH*.48,0,.05,.09,paneWidth+.05,trim);
    }
    addBox(bay,-.55,windowH+.25,0,1.15,.18,bayWidth+.28,trim);addBox(bay,-.56,-.3,0,1.16,.16,bayWidth+.3,accent);
    // A separate narrow sash beside the bay breaks the repeated façade rhythm.
    const sashZ=width*.31;addBox(facade,-.13,yy-.05,sashZ,.23,windowH+.2,width*.18,trim);addBox(facade,-.26,yy+.08,sashZ,.045,windowH-.08,width*.13,glass);addBox(facade,-.3,yy+windowH*.47,sashZ,.05,.1,width*.14,trim);
   }else{
    const count=Math.max(2,Math.min(8,Math.floor(width/2.7)));for(let j=0;j<count;j++){const zz=-width*.43+(j+.5)*width*.86/count,ww=Math.min(1.45,width*.52/count);addBox(facade,-.12,yy,zz,.2,windowH+.18,ww+.23,trim);addBox(facade,-.24,yy+.1,zz,.045,windowH-.06,ww,glass);addBox(facade,-.28,yy+windowH*.48,zz,.05,.09,ww+.06,trim);addBox(facade,-.19,yy+windowH+.17,zz,.35,.13,ww+.4,accent);}
   }
   if(f<floors-1)addBox(facade,-.18,yy+windowH+.55,0,.35,.18,width,trim);
  }
  // Cornice brackets and corner pilasters remain legible from the game camera.
  const brackets=Math.max(3,Math.floor(width/.75));for(let j=0;j<=brackets;j++)addBox(facade,-.23,bodyHeight-.72,-width/2+j*width/brackets,.38,.38,.14,trim);
  for(const zz of [-width*.48,width*.48]){addBox(facade,-.13,.6,zz,.24,bodyHeight-.85,.22,trim);addBox(facade,-.2,bodyHeight-1.05,zz,.38,.24,.35,accent);}
  if(special){
   if(building.roofShape==='hipped'){
    // The larger corner house has a hip roof rather than another repeated gable.
    const vertices=[0,bodyHeight,-width/2,depth,bodyHeight,-width/2,depth,bodyHeight,width/2,0,bodyHeight,width/2,depth*.5,bodyHeight+roofHeight,0],indices=[0,4,1,1,4,2,2,4,3,3,4,0];const rg=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));rg.setIndex(indices);rg.computeVertexNormals();const roof=new THREE.Mesh(rg,mat(palette.roof));roof.castShadow=true;facade.add(roof);
   }else{
    const triangle=new THREE.Shape();triangle.moveTo(-width/2-.15,0);triangle.lineTo(-width*.08,roofHeight);triangle.lineTo(width/2+.15,0);triangle.closePath();const rg=new THREE.ExtrudeGeometry(triangle,{depth:Math.min(depth+.2,22),bevelEnabled:false});rg.rotateY(Math.PI/2);const roof=new THREE.Mesh(rg,mat(palette.roof));roof.position.y=bodyHeight;roof.castShadow=true;facade.add(roof);solid.push(roof);
    const face=new THREE.Mesh(new THREE.ShapeGeometry(triangle),mat(palette.body));face.rotation.y=-Math.PI/2;face.position.set(-.035,bodyHeight,0);facade.add(face);
    // Cream rake trim follows the gable edges.
    for(const [a,b]of [[new THREE.Vector3(-.12,bodyHeight,-width/2-.15),new THREE.Vector3(-.12,bodyHeight+roofHeight,-width*.08)],[new THREE.Vector3(-.12,bodyHeight+roofHeight,-width*.08),new THREE.Vector3(-.12,bodyHeight,width/2+.15)]]){const delta=b.clone().sub(a),beam=new THREE.Mesh(new THREE.BoxGeometry(.18,delta.length(),.16),mat(trim));beam.position.copy(a).add(b).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());facade.add(beam);}
    addBox(facade,-.15,bodyHeight+.45,-width*.08,.18,1.15,1.15,trim);addBox(facade,-.26,bodyHeight+.56,-width*.08,.045,.9,.84,glass);
   }
   const doorZ=width*.3,doorY=.95;
   addBox(facade,-.16,doorY,doorZ,.3,2.55,1.1,trim);addBox(facade,-.33,doorY+.08,doorZ,.06,2.35,.86,accent);addBox(facade,-.38,doorY+1.4,doorZ,.055,.62,.55,glass);
   // Porch and a compact set of front steps, kept on the building's street side.
   addBox(facade,-1.15,.75,doorZ,1.8,.23,1.9,trim);for(let n=0;n<5;n++)addBox(facade,-2.7+n*.35,n*.15,doorZ,.38,.15,1.65,'#c4bda4');
   for(const zz of [doorZ-.78,doorZ+.78]){cylinder(facade,-1.7,1,zz,.065,2.7,trim);addBox(facade,-1.7,1.4,zz,.08,.08,.15,accent);}addBox(facade,-1.1,3.68,doorZ,1.8,.22,2.05,accent);
   // Low iron frontage, with an opening and a little gate on the entry axis.
   const fenceX=-3.05,fenceHeight=1.0,zLeft=-width*.47,zRight=width*.47,gateL=doorZ-.63,gateR=doorZ+.63;
   const fence=(z0:number,z1:number,gate=false)=>{if(z1<=z0)return;addBox(facade,fenceX,.25,z0+(z1-z0)/2,.075,.08,z1-z0,iron);addBox(facade,fenceX,.93,z0+(z1-z0)/2,.075,.07,z1-z0,iron);for(let z=z0;z<=z1;z+=.23){cylinder(facade,fenceX,.22,z,.025,fenceHeight,iron);const tip=new THREE.Mesh(new THREE.ConeGeometry(.05,.14,4),mat(iron));tip.position.set(fenceX,1.28,z);facade.add(tip);}if(gate)addBox(facade,fenceX-.055,.6,z1-.15,.11,.06,.14,'#b8a977');};
   fence(zLeft,Math.min(zRight,gateL));fence(Math.max(zLeft,gateR),zRight);fence(Math.max(zLeft,gateL+.05),Math.min(zRight,gateR-.05),true);for(const z of [zLeft,Math.min(zRight,gateL),Math.min(zRight,gateR),zRight])addBox(facade,fenceX-.01,.05,z,.18,1.3,.18,'#b9baa2');
   // Chimney and ornamental roof cap.
   addBox(facade,Math.min(depth*.6,12),bodyHeight+roofHeight*.5,width*.3,.7,2,.65,'#b7a38b');addBox(facade,Math.min(depth*.6,12),bodyHeight+roofHeight*.5+2,width*.3,.9,.18,.84,trim);
  }
 }
 // Decorations cannot leak beyond the map crop. Clip all architectural materials
 // in the same world coordinates as the grid, including the partial edge houses.
 const planes=[new THREE.Plane(new THREE.Vector3(1,0,0),60),new THREE.Plane(new THREE.Vector3(-1,0,0),60),new THREE.Plane(new THREE.Vector3(0,0,1),60),new THREE.Plane(new THREE.Vector3(0,0,-1),60)];for(const m of materials.values()){m.clippingPlanes=planes;m.clipShadows=true;}
 // Bake the small trim pieces into a few meshes per paint color. This keeps
 // the added detail from becoming thousands of separate draw calls.
 root.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const material=o.material as THREE.Material;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(key!=='position'&&key!=='normal')g.deleteAttribute(key);if(!g.hasAttribute('normal'))g.computeVertexNormals();if(!batches.has(material))batches.set(material,[]);batches.get(material)!.push(g);o.geometry.dispose();});
 root.clear();solid.length=0;for(const [material,geometries]of batches){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);solid.push(mesh);}
 return{root,solid};
}
