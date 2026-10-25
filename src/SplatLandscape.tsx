import {useEffect,useMemo,useRef,useState,type ComponentProps} from 'react';
import * as pc from 'playcanvas';
import {SFGrid} from './SFGrid';
import {cellAtCoordinate} from './mapGrid';
import {cellLocation} from './simulation';
import {CHOICE_COLORS} from './sfChoices';
import {DEMO_SCENE,parseScene,registerScene,type SplatScene} from './splatRegistration';
type Props=ComponentProps<typeof SFGrid>;
export function SplatLandscape(props:Props){
 const [scene,setScene]=useState<SplatScene>(DEMO_SCENE),[status,setStatus]=useState('Loading captured scene…'),[pick,setPick]=useState(''),[help,setHelp]=useState(false),[failure,setFailure]=useState('');
 const host=useRef<HTMLDivElement>(null),latest=useRef(props),world=useRef<{app:pc.Application;camera:pc.Entity;markers:pc.Entity;reset:()=>void;updateCamera:()=>void;setZoom:(value:number)=>void}|null>(null);
 latest.current=props;
 const registration=useMemo(()=>scene.anchors?registerScene(scene.anchors):null,[scene]);
 useEffect(()=>{
  if(!host.current)return;
  const canvas=document.createElement('canvas');host.current.appendChild(canvas);
  let app:pc.Application;
  try{app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:false,alpha:false}});}catch{setFailure('This browser could not start the 3D viewer. Try the illustrated grid.');canvas.remove();return;}
  app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio,1.5);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.gsplat.enableIds=true;
  app.scene.gsplat.splatBudget=3_000_000;
  const camera=new pc.Entity('Scan camera');camera.addComponent('camera',{clearColor:new pc.Color(.12,.2,.23),nearClip:.05,farClip:1000,fov:60});app.root.addChild(camera);
  const markers=new pc.Entity('Linked game placements');app.root.addChild(markers);
  let yaw=0,pitch=.35,distance=20;
  const target=new pc.Vec3(...scene.target),initialOffset=new pc.Vec3(...scene.camera).sub(target);
  const reset=()=>{distance=initialOffset.length();pitch=Math.asin(initialOffset.y/distance);yaw=Math.atan2(initialOffset.x,initialOffset.z);target.set(...scene.target);updateCamera();};
  const updateCamera=()=>{
   const top=latest.current.view==='bev',angle=top?Math.PI/2-.01:pitch;
   camera.setPosition(target.x+distance*Math.sin(yaw)*Math.cos(angle),target.y+distance*Math.sin(angle),target.z+distance*Math.cos(yaw)*Math.cos(angle));camera.lookAt(target);
  };
  world.current={app,camera,markers,reset,updateCamera,setZoom:(value)=>{distance=initialOffset.length()/value;updateCamera();}};reset();
  const resize=()=>{const h=host.current;if(h)app.resizeCanvas(h.clientWidth,h.clientHeight);};
  const observer=new ResizeObserver(resize);observer.observe(host.current);resize();
  setFailure('');setPick('');setStatus('Loading captured scene · about 58 MB for the demo…');
  const asset=new pc.Asset(scene.title,'gsplat',{url:scene.url});app.assets.add(asset);
  let disposed=false;
  asset.ready(()=>{if(disposed)return;const splat=new pc.Entity('Captured environment');splat.setEulerAngles(...scene.rotation);splat.addComponent('gsplat',{asset});app.root.addChild(splat);setStatus('Captured scene ready');});
  asset.on('error',()=>{if(!disposed){setFailure('The scan could not load. Check the asset URL and cross-origin access.');setStatus('Scan unavailable');}});
  app.assets.load(asset);app.start();
  const picker=new pc.Picker(app,1,1,true);
  let start:{x:number;y:number;button:number;yaw:number;pitch:number;target:pc.Vec3}|null=null,dragged=false,picking=false;
  const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY,button:e.button,yaw,pitch,target:target.clone()};dragged=false;canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{
   if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)<4)return;dragged=true;
   if(start.button===2||e.shiftKey){const scale=distance/Math.max(1,canvas.clientHeight);target.copy(start.target).add(camera.right.clone().mulScalar(-dx*scale)).add(camera.up.clone().mulScalar(dy*scale));}
   else{yaw=start.yaw-dx*.007;pitch=Math.max(-.15,Math.min(1.5,start.pitch+dy*.007));}
   updateCamera();
  };
  const up=async(e:PointerEvent)=>{
   const click=start&&!dragged&&start.button===0;start=null;if(!click||picking||disposed)return;
   const r=canvas.getBoundingClientRect(),scale=.5;picker.resize(Math.max(1,Math.round(r.width*scale)),Math.max(1,Math.round(r.height*scale)));
   picking=true;
   try{
    picker.prepare(camera.camera!,app.scene);
    const point=await picker.getWorldPointAsync((e.clientX-r.left)*scale,(e.clientY-r.top)*scale);
    if(disposed||!point)return;
    if(!registration){setPick(`Scene position ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)} · map alignment required`);return;}
    const p=registration.toMap(point.x,point.z),ground=registration.toWorld(p.lng,p.lat);
    if(Math.abs(point.y-ground[1])>1.5){setPick('Select ground near the registered surface, rather than a roof or tree.');return;}
    const id=cellAtCoordinate(p.lng,p.lat);setPick(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}${id===null?' · outside this scenario':` · tile ${id+1}`}`);if(id!==null)latest.current.onSelect(id);
   }catch{if(!disposed)setPick('Could not inspect that surface. Try another point.');}finally{picking=false;}
  };
  const wheel=(e:WheelEvent)=>{e.preventDefault();distance=Math.max(2,Math.min(150,distance*Math.exp(e.deltaY*.001)));updateCamera();};
  const context=(e:Event)=>e.preventDefault();
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',context);
  return()=>{disposed=true;observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',context);picker.destroy();world.current=null;app.destroy();canvas.remove();};
 },[scene,registration]);
 useEffect(()=>{
  const w=world.current;if(!w||!registration)return;
  for(const child of [...w.markers.children])child.destroy();
  const queued=new Map((props.preview?props.plans||[]:[]).map(p=>[p.id,p.action]));
  for(const c of props.state.cells){const action=queued.get(c.id)||c.intervention||c.project?.action||(c.protected?'protect':null);if(!action&&props.selected!==c.id)continue;
   const loc=cellLocation(c),position=registration.toWorld(loc.lng,loc.lat),entity=new pc.Entity(`Tile ${c.id+1}`),material=new pc.StandardMaterial();
   material.diffuse=new pc.Color().fromString(action?CHOICE_COLORS[action]:'#ffce55');material.emissive.copy(material.diffuse);material.useLighting=false;material.update();entity.addComponent('render',{type:'sphere',material});entity.setPosition(position[0],position[1]+.3,position[2]);entity.setLocalScale(props.selected===c.id?.8:.5,.5,props.selected===c.id?.8:.5);w.markers.addChild(entity);
   entity.render!.meshInstances.forEach(m=>m.pick=false);
  }
 },[registration,props.selected,props.state,props.plans,props.preview]);
 useEffect(()=>{world.current?.updateCamera();},[props.view]);
 useEffect(()=>{world.current?.reset();},[props.recenter]);
 useEffect(()=>{world.current?.setZoom(props.zoom);},[props.zoom]);
 const importScene=async(file:File)=>{try{setScene(parseScene(JSON.parse(await file.text())));setHelp(false);}catch(e){setFailure(e instanceof Error?e.message:'Invalid scene configuration.');}};
 return <><div className="splat-landscape" ref={host} aria-label={`${scene.title} captured Gaussian splat scene`}/><div className="splat-site"><strong>{scene.title}</strong><span>{registration?'Linked to map coordinates':'Visual demo · not Alamo Square · not map-aligned'}</span><button onClick={()=>setHelp(v=>!v)}>Link a scan to the map</button></div>
 <div className="splat-status" role="status">{failure||pick||status}<small>Drag to orbit · right-drag / shift-drag to pan · scroll to zoom · click to inspect</small><a href={scene.source} target="_blank" rel="noreferrer">{scene.credit}</a></div>
 {help&&<section className="splat-link-panel"><button className="splat-close" aria-label="Close scan linking" onClick={()=>setHelp(false)}>×</button><strong>Give the scan a real place</strong><p>Use a scene file with three known ground points: each point pairs a position in the scan with longitude and latitude. Those anchors align scan positions to the map and existing game tiles.</p><p>The demo has no verified map anchors. Use the illustrated grid for San Francisco placements while exploring this scan.</p><label>Load scene configuration<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void importScene(file);}}/></label><small>See public/splats/README.md for the scene format. Linking uses an approximate ground plane; detailed terrain picking needs a registered surface mesh.</small></section>}
 </>;
}
