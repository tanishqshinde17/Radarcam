import type { SpeedCamera, RouteInfo } from '../types';
import { calculateDistanceMeters } from './radarData';

// Polyline decoder for Google Maps encoded polylines
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export interface RouteOption {
  id: string;
  title: string;
  distanceMeters: number;
  durationSeconds: number;
  tollCount: number;
  cameraCount: number;
  coordinates: [number, number][];
  steps: Array<{ instruction: string; distance: number }>;
}

// Count how many cameras lie within 50 meters of the route polyline
function countCamerasOnRoute(coords: [number, number][], cameras: SpeedCamera[]): number {
  let count = 0;
  for (const cam of cameras) {
    let near = false;
    for (const [lat, lng] of coords) {
      if (calculateDistanceMeters(lat, lng, cam.lat, cam.lng) < 50) {
        near = true;
        break;
      }
    }
    if (near) count++;
  }
  return count;
}

export async function fetchRoutes(
  origin: { lat: number; lng: number },
  destinationQuery: string,
  cameras: SpeedCamera[],
  apiKey?: string
): Promise<RouteOption[]> {
  // If no Google API key is provided, fall back to OSRM (completely free public routing API)
  if (!apiKey) {
    return fetchOSRMRoute(origin, destinationQuery, cameras);
  }

  try {
    // 1. Geocode destination query
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destinationQuery)}&key=${apiKey}`);
    const geoJson = await geoRes.json();
    if (!geoJson.results || geoJson.results.length === 0) throw new Error('Destination not found');
    const destLoc = geoJson.results[0].geometry.location;

    // 2. Fetch routes (standard + avoid tolls)
    const fetchRouteWithConfig = async (avoidTolls: boolean, id: string, title: string) => {
      const avoidParam = avoidTolls ? '&avoid=tolls' : '';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destLoc.lat},${destLoc.lng}&alternatives=true${avoidParam}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.routes || json.routes.length === 0) return null;

      const route = json.routes[0];
      const leg = route.legs[0];
      const coords = decodePolyline(route.overview_polyline.points);
      const cameraCount = countCamerasOnRoute(coords, cameras);
      const tollCount = avoidTolls ? 0 : (JSON.stringify(route).toLowerCase().includes('toll') ? 1 : 0);

      return {
        id,
        title,
        distanceMeters: leg.distance.value,
        durationSeconds: leg.duration.value,
        tollCount,
        cameraCount,
        coordinates: coords,
        steps: leg.steps.map((s: any) => ({ instruction: s.html_instructions.replace(/<[^>]*>?/gm, ''), distance: s.distance.value }))
      };
    };

    const fastest = await fetchRouteWithConfig(false, 'fastest', 'Fastest Route');
    const cheap = await fetchRouteWithConfig(true, 'cheap', 'Cheapest / Avoid Tolls');

    return [fastest, cheap].filter(Boolean) as RouteOption[];
  } catch (err) {
    console.warn('Google Routes API error, falling back to OSRM:', err);
    return fetchOSRMRoute(origin, destinationQuery, cameras);
  }
}

// Free public OSRM fallback so routing works instantly without requiring an immediate paid Google API key
async function fetchOSRMRoute(
  origin: { lat: number; lng: number },
  destinationQuery: string,
  cameras: SpeedCamera[]
): Promise<RouteOption[]> {
  // Simple geocode using Nominatim (free OSM)
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}`);
  const geoJson = await geoRes.json();
  if (!geoJson || geoJson.length === 0) throw new Error('Destination not found');
  const destLat = parseFloat(geoJson[0].lat);
  const destLng = parseFloat(geoJson[0].lon);

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(osrmUrl);
  const json = await res.json();
  if (!json.routes || json.routes.length === 0) throw new Error('Could not calculate route');

  const route = json.routes[0];
  // OSRM returns coordinates as [lng, lat], convert to [lat, lng]
  const coords: [number, number][] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  const cameraCount = countCamerasOnRoute(coords, cameras);

  return [
    {
      id: 'fastest',
      title: 'Fastest Route',
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      tollCount: 0,
      cameraCount,
      coordinates: coords,
      steps: route.legs[0].steps.map((s: any) => ({ instruction: s.maneuver.type + ' onto ' + (s.name || 'road'), distance: s.distance }))
    }
  ];
}
