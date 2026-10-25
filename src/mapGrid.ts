import {BBOX,WIDTH,HEIGHT,type GameState} from './simulation';
import type {FeatureCollection,Polygon} from 'geojson';

/** Both renderers use these geographic cell boundaries and stable IDs. */
export function cellAtCoordinate(lng:number,lat:number):number|null {
 const [west,south,east,north]=BBOX;
 if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<west||lng>=east||lat<=south||lat>north)return null;
 const x=Math.floor((lng-west)/(east-west)*WIDTH);
 const y=Math.floor((north-lat)/(north-south)*HEIGHT);
 return y*WIDTH+x;
}
export function geographicGrid(state:GameState):FeatureCollection<Polygon> {
 const [west,south,east,north]=BBOX,dx=(east-west)/WIDTH,dy=(north-south)/HEIGHT;
 return {type:'FeatureCollection',features:state.cells.map(c=>{
  const w=west+c.x*dx,e=w+dx,n=north-c.y*dy,s=n-dy;
  return {type:'Feature',id:c.id,properties:{id:c.id},geometry:{type:'Polygon',coordinates:[[[w,n],[w,s],[e,s],[e,n],[w,n]]]}};
 })};
}
