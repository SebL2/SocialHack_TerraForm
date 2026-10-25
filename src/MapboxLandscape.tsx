import {useEffect,useRef,useState,type ComponentProps} from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {SFGrid} from './SFGrid';
import {geographicGrid,cellAtCoordinate} from './mapGrid';
import {BBOX,cellLocation,curveNumber,runoffMm} from './simulation';
import {CHOICE_COLORS} from './sfChoices';

type Props=ComponentProps<typeof SFGrid>;
const names={restore:'Trees',retrofit:'Rain garden',housing:'Porous path',protect:'Protected'};
export function MapboxLandscape(props:Props&{token:string}){
 const host=useRef<HTMLDivElement>(null),mapRef=useRef<mapboxgl.Map|null>(null),latest=useRef(props);
 latest.current=props;
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[satellite,setSatellite]=useState(true),[grid,setGrid]=useState(true),[elevation,setElevation]=useState<number|null>(null);
 const imageryStyle=useRef(true);
 const [serviceNotice,setServiceNotice]=useState('');
 const update=()=>{
  const map=mapRef.current,p=latest.current;
  if(!map?.getSource('game-grid'))return;
  const data=geographicGrid(p.state),plans=new Map((p.preview?p.plans||[]:[]).map(v=>[v.id,v.action]));
  for(const f of data.features){
   const c=p.state.cells[Number(f.id)],action=plans.get(c.id)||c.intervention||c.project?.action||(c.protected?'protect':null);
   const runoff=runoffMm(p.rainMm||35,curveNumber(c))/(p.rainMm||35);
   Object.assign(f.properties!,{selected:c.id===p.selected,changed:!!action,label:action?names[action]:'',color:action?CHOICE_COLORS[action]:p.layer==='runoff'?`hsl(${Math.round(130-runoff*110)}, 48%, 48%)`:'#d7e5ca',opacity:action ? .52 : p.layer==='runoff' ? .5 : .035});
  }
  (map.getSource('game-grid') as mapboxgl.GeoJSONSource).setData(data);
  const points={type:'FeatureCollection' as const,features:data.features.filter(f=>f.properties?.changed).map(f=>({type:'Feature' as const,properties:f.properties,geometry:{type:'Point' as const,coordinates:[cellLocation(p.state.cells[Number(f.id)]).lng,cellLocation(p.state.cells[Number(f.id)]).lat]}}))};
  (map.getSource('game-pieces') as mapboxgl.GeoJSONSource).setData(points);
  map.setPaintProperty('game-grid-lines','line-opacity',p.highlightPieces ? 1 : grid ? .55 : 0);
  map.setPaintProperty('game-grid-lines','line-width',p.highlightPieces?2:1);
 };
 const updateRef=useRef(update);updateRef.current=update;
 useEffect(()=>{
  if(!host.current)return;
  setReady(false);setError('');
  let map:mapboxgl.Map;
  try{
   map=new mapboxgl.Map({container:host.current,accessToken:props.token,style:'mapbox://styles/mapbox/standard-satellite',center:[(BBOX[0]+BBOX[2])/2,(BBOX[1]+BBOX[3])/2],zoom:18,pitch:props.view==='bev'?0:55,bearing:-25,antialias:true,config:{basemap:{lightPreset:'day',showPointOfInterestLabels:false,showTransitLabels:false,showRoadLabels:true}},attributionControl:true});
  }catch{setError('Mapbox could not start. Your browser may not support WebGL.');return;}
  mapRef.current=map;
  const resize=new ResizeObserver(()=>map.resize());resize.observe(host.current);
  map.on('style.load',()=>{
   if(!mapRef.current)return;
   map.setConfigProperty('basemap','lightPreset','day');
   map.setConfigProperty('basemap','showPointOfInterestLabels',false);
   map.setConfigProperty('basemap','showTransitLabels',false);
   map.addSource('real-terrain',{type:'raster-dem',url:'mapbox://mapbox.mapbox-terrain-dem-v1',tileSize:512,maxzoom:14});
   map.setTerrain({source:'real-terrain',exaggeration:1});
   map.addSource('game-grid',{type:'geojson',data:geographicGrid(latest.current.state)});
   map.addLayer({id:'game-grid-fill',type:'fill',source:'game-grid',slot:'middle',paint:{'fill-color':['get','color'],'fill-opacity':['get','opacity']}});
   map.addLayer({id:'game-grid-lines',type:'line',source:'game-grid',slot:'middle',paint:{'line-color':'#edf5df','line-width':1,'line-opacity':.55}});
   map.addLayer({id:'game-selection',type:'line',source:'game-grid',slot:'top',filter:['==',['get','selected'],true],paint:{'line-color':'#ffce55','line-width':3}});
   map.addSource('game-pieces',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   map.addLayer({id:'game-piece-labels',type:'symbol',source:'game-pieces',slot:'top',layout:{'text-field':['get','label'],'text-size':12,'text-allow-overlap':false},paint:{'text-color':'#17383c','text-halo-color':'#fff8dc','text-halo-width':2}});
   updateRef.current();setReady(true);
  });
  map.on('click',e=>{const id=cellAtCoordinate(e.lngLat.lng,e.lngLat.lat);if(id!==null)latest.current.onSelect(id);});
  map.on('mousemove',e=>{map.getCanvas().style.cursor=cellAtCoordinate(e.lngLat.lng,e.lngLat.lat)!==null?'crosshair':'';});
  map.on('error',e=>{
   const status=(e.error as Error & {status?:number}).status;
   if(status===429&&String((e as unknown as {sourceId?:string}).sourceId||e.error).includes('satellite')){
    setServiceNotice('Satellite imagery is rate-limited by Mapbox. Showing the 3D map.');setSatellite(false);
   }else if(status===401||status===403)setError('A Mapbox request was denied. Check token permissions and allowed URLs.');
   else setError('Some map data is unavailable. You can continue with the map or illustrated grid.');
  });
  map.on('idle',()=>{
   const p=latest.current;if(p.selected===null)return;
   const pos=cellLocation(p.state.cells[p.selected]);
   setElevation(map.queryTerrainElevation([pos.lng,pos.lat],{exaggerated:false})??null);
  });
  return()=>{resize.disconnect();mapRef.current=null;map.remove();};
 },[props.token]);
 useEffect(()=>{if(ready)updateRef.current();},[ready,props.state,props.selected,props.layer,props.plans,props.preview,props.highlightPieces,props.rainMm,grid]);
 useEffect(()=>{const m=mapRef.current;if(!ready||!m||imageryStyle.current===satellite)return;imageryStyle.current=satellite;setReady(false);setError('');m.setStyle(satellite?'mapbox://styles/mapbox/standard-satellite':'mapbox://styles/mapbox/standard');},[ready,satellite]);
 useEffect(()=>{const m=mapRef.current;if(!ready||!m)return;m.easeTo({pitch:props.view==='bev'?0:55,duration:700});},[ready,props.view]);
 useEffect(()=>{const m=mapRef.current;if(ready&&m)m.easeTo({zoom:18+Math.log2(props.zoom),duration:250});},[ready,props.zoom]);
 useEffect(()=>{if(ready)mapRef.current?.easeTo({center:[(BBOX[0]+BBOX[2])/2,(BBOX[1]+BBOX[3])/2],zoom:18,bearing:-25,duration:600});},[props.recenter]);
 useEffect(()=>{
  const m=mapRef.current;if(!ready||!m)return;
  if(props.selected===null){setElevation(null);return;}
  const pos=cellLocation(props.state.cells[props.selected]);setElevation(m.queryTerrainElevation([pos.lng,pos.lat],{exaggerated:false})??null);
 },[ready,props.selected,props.state]);
 return <><div className="mapbox-landscape" ref={host} aria-label="Real geographic landscape with selectable game tiles"/>
  <div className="mapbox-options"><button aria-pressed={satellite} onClick={()=>setSatellite(v=>!v)}>{satellite?'Satellite':'Map'} · switch</button><label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>Grid</label></div>
  <div className="mapbox-data-note" role="status">{error||(!ready?'Loading real landscape…':props.selected===null?'Real terrain · select a tile to inspect elevation':`Tile ${props.selected+1} · ${elevation===null?'elevation loading':`${elevation.toFixed(1)} m terrain elevation`}`)}{serviceNotice&&<small>{serviceNotice}</small>}<small>Land cover: ESA + OSM · elevation: Mapbox · game outcomes: illustrative</small></div>
 </>;
}
