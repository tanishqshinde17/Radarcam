import type { SpeedCamera, HazardReport, CameraType, HazardType } from '../types';

// Generate realistic speed cameras around any given coordinate
export function generateNearbyCameras(centerLat: number, centerLng: number): SpeedCamera[] {
  const types: CameraType[] = ['fixed', 'mobile', 'red_light', 'average_speed', 'tunnel', 'traffic'];
  const roadPrefixes = ['M-40', 'A-6', 'Highway 101', 'I-95', 'Ring Road', 'Expressway North', 'Grand Avenue', 'Coastal Blvd', 'Bypass South'];
  const cameras: SpeedCamera[] = [];

  let idCounter = 1;

  // Generate 25 cameras distributed around the center coordinate in a radius (~10km)
  for (let i = 0; i < 30; i++) {
    // Random offset in degrees (~0.001 to 0.08 degrees roughly 100m to 8km)
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.005 + Math.random() * 0.06;
    const lat = centerLat + Math.cos(angle) * distance;
    const lng = centerLng + Math.sin(angle) * (distance / Math.cos(centerLat * (Math.PI / 180)));

    const type = types[Math.floor(Math.random() * types.length)];
    const speedLimitOptions = [30, 50, 70, 90, 100, 120];
    const speedLimit = speedLimitOptions[Math.floor(Math.random() * speedLimitOptions.length)];
    const roadName = roadPrefixes[Math.floor(Math.random() * roadPrefixes.length)];

    let name = `Speed Camera (${speedLimit} km/h)`;
    if (type === 'mobile') name = `Mobile Radar Trap (${speedLimit} km/h)`;
    else if (type === 'red_light') name = `Red Light & Speed Camera`;
    else if (type === 'average_speed') name = `Average Speed Zone Start (${speedLimit} km/h)`;
    else if (type === 'tunnel') name = `Tunnel Speed Check (${speedLimit} km/h)`;
    else if (type === 'traffic') name = `Traffic Monitoring Camera`;

    cameras.push({
      id: `cam_${idCounter++}`,
      lat,
      lng,
      type,
      speedLimit,
      direction: Math.floor(Math.random() * 360),
      name,
      roadName,
      verifiedCount: Math.floor(5 + Math.random() * 120),
      lastReported: `${Math.floor(1 + Math.random() * 45)} mins ago`,
      isCommunityReport: Math.random() > 0.7
    });
  }

  return cameras;
}

export function generateInitialHazards(centerLat: number, centerLng: number): HazardReport[] {
  const hazardTypes: { type: HazardType; title: string }[] = [
    { type: 'police', title: 'Police Patrol Checkpoint' },
    { type: 'accident', title: 'Road Accident Ahead' },
    { type: 'traffic_jam', title: 'Heavy Traffic Congestion' },
    { type: 'roadwork', title: 'Roadworks & Lane Closure' },
    { type: 'hazard', title: 'Debris on Road' }
  ];

  const hazards: HazardReport[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.003 + Math.random() * 0.04;
    const lat = centerLat + Math.cos(angle) * distance;
    const lng = centerLng + Math.sin(angle) * (distance / Math.cos(centerLat * (Math.PI / 180)));

    const hInfo = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];

    hazards.push({
      id: `haz_${i + 1}`,
      lat,
      lng,
      type: hInfo.type,
      title: hInfo.title,
      description: `Reported by PulseNav driver community`,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000 * 2),
      confirmations: Math.floor(2 + Math.random() * 40)
    });
  }

  return hazards;
}

// Calculate distance between two lat/lng points in meters (Haversine formula)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance nicely
export function formatDistance(meters: number, unit: 'kmh' | 'mph' = 'kmh'): string {
  if (unit === 'mph') {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} mi`;
  } else {
    if (meters < 1000) return `${Math.round(meters)} m`;
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }
}

// Format speed
export function formatSpeed(speedKmh: number, unit: 'kmh' | 'mph' = 'kmh'): { value: number; label: string } {
  if (unit === 'mph') {
    const mph = Math.round(speedKmh * 0.621371);
    return { value: mph, label: 'mph' };
  }
  return { value: Math.round(speedKmh), label: 'km/h' };
}
