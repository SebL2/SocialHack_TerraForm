import type {ChapterId} from './globalChapters';
// Exact centers of the existing mapped levels, in geographic degrees.
export const GLOBE_LOCATIONS:Record<ChapterId,{lat:number;lng:number}>={
 sf:{lat:37.77625,lng:-122.4335},
 senegal:{lat:15.8574673,lng:-15.0596902},
 mongolia:{lat:47.76371,lng:105.8779546},
 indonesia:{lat:-2.301,lng:113.906}
};
export function globeVector(lat:number,lng:number,radius=102):[number,number,number]{const phi=(90-lat)*Math.PI/180,theta=(90-lng)*Math.PI/180;return [radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)];}
