// Adapted from Aceternity UI's globe registry for Vite, React 19 and TerraForm.
// Keep the ThreeGlobe/R3F globe; use our own HTML chapter pins instead of demo arcs/points.
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {Color,Mesh,Quaternion,Vector3,type MeshPhongMaterial} from 'three';
import ThreeGlobe from 'three-globe';
import countries from '@/data/globe.json';
import {GLOBE_LOCATIONS,globeVector} from '@/globeLocations';
import type {ChapterId} from '@/globalChapters';
export type GlobeConfig={globeColor:string;polygonColor:string;atmosphereColor:string;atmosphereAltitude:number;emissive:string;emissiveIntensity:number;shininess:number;autoRotateSpeed:number};
export const terraformGlobeConfig:GlobeConfig={globeColor:'#244d56',polygonColor:'#88ab78',atmosphereColor:'#79b6ae',atmosphereAltitude:.12,emissive:'#163f48',emissiveIntensity:.35,shininess:.25,autoRotateSpeed:.45};
type Props={fromLevel?:boolean;title:boolean;idle?:boolean;paused:boolean;focus:ChapterId|null;focusKey:number;launching:boolean;onArrival:()=>void;captureFrame:RefObject<(()=>string)|null>;nodeElements:RefObject<Partial<Record<ChapterId,HTMLDivElement>>>};
function Globe({fromLevel=false,title,idle=title,paused,focus,focusKey,launching,onArrival,nodeElements,captureFrame}:Props){
 const [globe,setGlobe]=useState<ThreeGlobe|null>(null),controls=useRef<OrbitControlsImpl>(null);
 const {camera,size,gl,scene}=useThree(),motion=useRef<{start:number;from:Vector3;to:Vector3;zoom:boolean}|null>(null),arrived=useRef(false),lastView=useRef<{focus:ChapterId|null;focusKey:number;title:boolean;distance:number}|null>(null);
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const baseDistance=Math.max(310,310/Math.min(1,size.width/size.height));
 useEffect(()=>{captureFrame.current=()=>{gl.render(scene,camera);const canvas=document.createElement('canvas');canvas.width=Math.min(1600,window.innerWidth);canvas.height=Math.round(canvas.width*gl.domElement.height/gl.domElement.width);canvas.getContext('2d')?.drawImage(gl.domElement,0,0,canvas.width,canvas.height);const still=canvas.toDataURL('image/webp',.92);canvas.width=canvas.height=1;return still;};return()=>{captureFrame.current=null;};},[captureFrame,gl,scene,camera]);

 useEffect(()=>{
  const g=new ThreeGlobe({animateIn:false}).hexPolygonsData(countries.features).hexPolygonResolution(3).hexPolygonMargin(.16).hexPolygonColor(()=>terraformGlobeConfig.polygonColor).showAtmosphere(true).atmosphereColor(terraformGlobeConfig.atmosphereColor).atmosphereAltitude(terraformGlobeConfig.atmosphereAltitude);
  const m=g.globeMaterial() as MeshPhongMaterial;m.color=new Color(terraformGlobeConfig.globeColor);m.emissive=new Color(terraformGlobeConfig.emissive);m.emissiveIntensity=terraformGlobeConfig.emissiveIntensity;m.shininess=terraformGlobeConfig.shininess;
  setGlobe(g);return()=>{g._destructor();g.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});};
 },[]);
 useEffect(()=>{
  if(launching)return;
  const previous=lastView.current,first=previous===null,aimChanged=first||previous.focus!==focus||previous.focusKey!==focusKey;
  lastView.current={focus,focusKey,title,distance:baseDistance};
  const p=focus?GLOBE_LOCATIONS[focus]:{lat:20,lng:-30};
  if(first){camera.position.copy(new Vector3(...globeVector(p.lat,p.lng,fromLevel&&!title?108:baseDistance)));camera.lookAt(0,0,0);controls.current?.update();}
  // Changing the title UI must not reset the current idle-spin orientation.
  if(previous&&previous.title!==title)motion.current=null;
  if(!title&&focus&&aimChanged){motion.current={start:performance.now(),from:camera.position.clone(),to:new Vector3(...globeVector(p.lat,p.lng,baseDistance)),zoom:false};}
  else if(previous&&previous.distance!==baseDistance){camera.position.setLength(baseDistance);camera.lookAt(0,0,0);controls.current?.update();}
 },[focus,focusKey,title,baseDistance,camera,fromLevel]);
 useEffect(()=>{if(!launching||!focus)return;arrived.current=false;const p=GLOBE_LOCATIONS[focus];motion.current={start:performance.now(),from:camera.position.clone(),to:new Vector3(...globeVector(p.lat,p.lng,108)),zoom:true};},[launching,focus,camera]);
 useFrame(()=>{
  const m=motion.current;if(m){const t=Math.min(1,(performance.now()-m.start)/(reducedMotion?1:m.zoom?1250:1150)),e=t*t*(3-2*t);
  const from=m.from.clone().normalize(),to=m.to.clone().normalize(),q=new Quaternion().setFromUnitVectors(from,to);from.applyQuaternion(new Quaternion().slerp(q,e));camera.position.copy(from.multiplyScalar(m.from.length()+(m.to.length()-m.from.length())*e));camera.lookAt(0,0,0);controls.current?.update();
  if(t===1){motion.current=null;if(m.zoom&&!arrived.current){arrived.current=true;onArrival();}}}
  for(const id of Object.keys(GLOBE_LOCATIONS) as ChapterId[]){const element=nodeElements.current[id];if(!element)continue;const p=GLOBE_LOCATIONS[id],point=new Vector3(...globeVector(p.lat,p.lng)),visible=point.dot(camera.position)>10000;point.project(camera);element.style.left=`${(point.x*.5+.5)*size.width}px`;element.style.top=`${(-point.y*.5+.5)*size.height}px`;element.style.visibility=!title&&!launching&&visible&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1?'visible':'hidden';}
 });
 return <><ambientLight color="#d0dfb3" intensity={1.4}/><directionalLight position={[-200,300,400]} color="#f4e4bb" intensity={2.1}/><directionalLight position={[200,-100,-100]} color="#4d8b8d" intensity={1}/>{globe&&<primitive object={globe}/>}
 <OrbitControls ref={controls} enablePan={false} enableZoom={false} enableRotate={!idle&&!paused&&!launching} autoRotate={idle&&!paused&&!reducedMotion} autoRotateSpeed={terraformGlobeConfig.autoRotateSpeed} minPolarAngle={.06} maxPolarAngle={Math.PI-.06} enableDamping={!idle} dampingFactor={.08}/></>;
}
export function World(props:Props){return <div className="globe-canvas" role="region" aria-label="Interactive world globe" tabIndex={props.title?-1:0} aria-keyshortcuts="ArrowLeft ArrowRight"><Canvas dpr={[1,1.75]} camera={{position:[0,80,310],fov:45,near:1,far:2000}} gl={{alpha:true,antialias:true}}><Globe {...props}/></Canvas></div>;}
