// Distance and unit helpers

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
