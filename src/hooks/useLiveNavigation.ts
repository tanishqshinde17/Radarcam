import { useState, useEffect } from 'react';
import type { UserLocation } from '../types';
import type { RouteOption } from '../services/googleRouting';

export function useLiveNavigation(
  activeRoute: RouteOption | undefined,
  currentLocation: UserLocation,
  isNavigating: boolean,
  updateLocation: React.Dispatch<React.SetStateAction<UserLocation>>
) {
  useEffect(() => {
    if (!isNavigating || !activeRoute || activeRoute.coordinates.length < 2) return;

    let progress = 0;
    const interval = setInterval(() => {
      // Simulate movement along the route coordinates
      if (progress < activeRoute.coordinates.length - 1) {
        progress += 0.2; // Adjust step for speed
        const [lat, lng] = activeRoute.coordinates[Math.floor(progress)];
        updateLocation(prev => ({ ...prev, lat, lng, speed: 60 }));
      } else {
        progress = 0; // Loop or end logic
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isNavigating, activeRoute, updateLocation]);
}
