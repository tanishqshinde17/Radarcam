// No changes needed, but let's check it again.
export type CameraType =
  | 'fixed'
  | 'mobile'
  | 'red_light'
  | 'average_speed'
  | 'tunnel'
  | 'traffic';

export type HazardType =
  | 'police'
  | 'accident'
  | 'traffic_jam'
  | 'roadwork'
  | 'hazard';

export interface SpeedCamera {
  id: string;
  lat: number;
  lng: number;
  type: CameraType;
  speedLimit: number; // in km/h, 0 when unknown
  direction?: number; // 0-360 degrees
  name: string;
  roadName: string;
  verifiedCount: number;
  lastReported?: string;
  isCommunityReport?: boolean;
}

export interface HazardReport {
  id: string;
  lat: number;
  lng: number;
  type: HazardType;
  title: string;
  description?: string;
  timestamp: number;
  confirmations: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  speed: number; // in km/h
  heading: number | null;
  accuracy: number;
  altitude: number | null;
}

export interface ProximityAlert {
  camera: SpeedCamera;
  distance: number; // in meters
  isOverSpeed: boolean;
  timeToCamera?: number; // in seconds
}

export interface AppSettings {
  speedUnit: 'kmh' | 'mph';
  detectionRadius: number; // in meters (e.g. 500, 1000)
  soundAlerts: boolean;
  voiceAlerts: boolean;
  overspeedBeep: boolean;
  theme: 'dark' | 'light' | 'oled' | 'hud';
  filterFixed: boolean;
  filterMobile: boolean;
  filterRedLight: boolean;
  filterAverage: boolean;
  filterHazards: boolean;
  autoCenterMap: boolean;
  mapStyle: 'streets' | 'dark' | 'satellite';
}

export interface RouteInfo {
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  steps: Array<{
    instruction: string;
    distance: number;
  }>;
}
