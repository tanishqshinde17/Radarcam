import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Settings, Plus, Minus, LocateFixed, Radio, Satellite, FlaskConical, TriangleAlert, Check } from 'lucide-react';
import type { AppSettings, SpeedCamera, HazardReport, UserLocation, ProximityAlert, CameraType } from './types';
import { generateNearbyCameras, generateInitialHazards, calculateDistanceMeters, formatDistance, formatSpeed } from './services/radarData';
import { soundService } from './services/soundService';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';

// Shared surface style for floating map UI
const panel = 'bg-[#141925]/90 backdrop-blur-md border border-white/[0.07] shadow-xl shadow-black/40';

const CAMERA_LABELS: Record<CameraType, string> = {
  fixed: 'Fixed camera',
  mobile: 'Mobile radar',
  red_light: 'Red light camera',
  average_speed: 'Average speed zone',
  tunnel: 'Tunnel camera',
  traffic: 'Traffic camera'
};

const START = { lat: 40.7128, lng: -74.006 };

const userIcon = L.divIcon({ className: 'map-marker', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

// Cache divIcons so markers don't get rebuilt on every location tick
const iconCache = new Map<string, L.DivIcon>();
function poiIcon(label: string, ring: string, fill = '#fff', text = '#111827'): L.DivIcon {
  const key = `${label}|${ring}|${fill}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: 'map-marker',
      html: `<div class="poi-dot" style="background:${fill};color:${text};box-shadow:0 0 0 2px ${ring},0 1px 4px rgba(0,0,0,.5)">${label}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function isCameraVisible(cam: SpeedCamera, s: AppSettings): boolean {
  switch (cam.type) {
    case 'mobile': return s.filterMobile;
    case 'red_light': return s.filterRedLight;
    case 'average_speed': return s.filterAverage;
    default: return s.filterFixed;
  }
}

const App: React.FC = () => {
  const [location, setLocation] = useState<UserLocation>({ ...START, speed: 0, heading: 0, accuracy: 10, altitude: 0 });
  const [cameras, setCameras] = useState<SpeedCamera[]>(() => generateNearbyCameras(START.lat, START.lng));
  const [hazards, setHazards] = useState<HazardReport[]>(() => generateInitialHazards(START.lat, START.lng));
  const [settings, setSettings] = useState<AppSettings>({
    speedUnit: 'kmh',
    detectionRadius: 1000,
    soundAlerts: true,
    voiceAlerts: true,
    overspeedBeep: true,
    theme: 'dark',
    filterFixed: true,
    filterMobile: true,
    filterRedLight: true,
    filterAverage: true,
    filterHazards: true,
    autoCenterMap: true,
    mapStyle: 'dark'
  });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ProximityAlert[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Simulation mode toggle (default false so speed stays constant at 0 when not moving)
  const [isSimulating, setIsSimulating] = useState(false);

  const visibleCameras = useMemo(() => cameras.filter(c => isCameraVisible(c, settings)), [cameras, settings]);

  // Proximity alerts and Speed logic
  useEffect(() => {
    const alerts: ProximityAlert[] = [];
    visibleCameras.forEach(cam => {
      const dist = calculateDistanceMeters(location.lat, location.lng, cam.lat, cam.lng);
      if (dist < settings.detectionRadius) {
        const isOverSpeed = location.speed > cam.speedLimit;
        alerts.push({ camera: cam, distance: dist, isOverSpeed });

        // Alert sound triggers
        if (settings.soundAlerts && dist < settings.detectionRadius * 0.5) {
          if (isOverSpeed && settings.overspeedBeep) soundService.playOverspeedAlarm();
          else soundService.playWarningBeep();
        }

        // Voice triggers
        if (settings.voiceAlerts && dist < 400 && dist > 300) {
          soundService.speak(`Speed camera ahead in ${Math.round(dist)} meters. Speed limit ${cam.speedLimit} ${settings.speedUnit === 'kmh' ? 'kilometers per hour' : 'miles per hour'}.`);
        }
      }
    });
    alerts.sort((a, b) => a.distance - b.distance);
    setActiveAlerts(alerts);
  }, [location, visibleCameras, settings]);

  // Geolocation or Simulation movement
  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setLocation(prev => ({
          ...prev,
          lat: prev.lat + 0.00002,
          lng: prev.lng + 0.00002,
          speed: 60 // Constant stable test speed when simulating
        }));
      }, 2000);
      return () => clearInterval(interval);
    } else {
      if (!('geolocation' in navigator)) {
        console.warn('Geolocation not supported');
        return;
      }
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const speedKmh = pos.coords.speed !== null ? pos.coords.speed * 3.6 : 0;
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: Math.max(0, speedKmh),
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude
          });
        },
        (err) => {
          console.warn('Geolocation error or permission denied:', err);
          // Keep location static with 0 speed when stationary or GPS unavailable
          setLocation(prev => ({ ...prev, speed: 0 }));
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isSimulating]);

  // Keep the map following the driver
  useEffect(() => {
    if (map && settings.autoCenterMap) map.panTo([location.lat, location.lng], { animate: true });
  }, [map, location.lat, location.lng, settings.autoCenterMap]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const speed = formatSpeed(location.speed, settings.speedUnit);
  const nearest = activeAlerts[0];
  const nearestLimit = nearest ? formatSpeed(nearest.camera.speedLimit, settings.speedUnit) : null;
  const overLimit = nearest?.isOverSpeed ?? false;

  return (
    <div className="relative w-full h-full overflow-hidden font-sans text-gray-200">
      {/* Map */}
      <MapContainer
        ref={setMap}
        center={[location.lat, location.lng]}
        zoom={15}
        zoomControl={false}
        className="absolute inset-0 z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[location.lat, location.lng]} icon={userIcon} zIndexOffset={1000}>
          <Popup>You are here · {speed.value} {speed.label}</Popup>
        </Marker>
        {visibleCameras.map(cam => {
          const limit = formatSpeed(cam.speedLimit, settings.speedUnit).value;
          return (
            <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={poiIcon(String(limit), cam.type === 'mobile' ? '#f97316' : '#ef4444')}>
              <Popup>
                <div className="font-semibold text-white">{CAMERA_LABELS[cam.type]}</div>
                <div className="text-gray-400">{cam.roadName} · limit {limit} {settings.speedUnit === 'kmh' ? 'km/h' : 'mph'}</div>
                {cam.isCommunityReport && <div className="text-xs text-gray-500 mt-1">Community report</div>}
              </Popup>
            </Marker>
          );
        })}
        {settings.filterHazards && hazards.map(h => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={poiIcon('!', '#0a0d14', '#f59e0b', '#111827')}>
            <Popup>
              <div className="font-semibold text-white">{h.title}</div>
              <div className="text-gray-400">{h.confirmations} confirmations</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
        <div className={`${panel} pointer-events-auto flex items-center gap-2 rounded-xl px-3 h-11`}>
          <Radio className="w-5 h-5 text-blue-400" />
          <span className="font-bold tracking-tight text-white max-[380px]:hidden">Pulse<span className="text-blue-400">Nav</span></span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className={`${panel} flex rounded-xl p-1 h-11`} role="group" aria-label="Location source">
            <button
              onClick={() => setIsSimulating(false)}
              aria-pressed={!isSimulating}
              className={`flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${!isSimulating ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Satellite className="w-3.5 h-3.5" />
              GPS
            </button>
            <button
              onClick={() => setIsSimulating(true)}
              aria-pressed={isSimulating}
              title="Simulate driving at 60 km/h for testing"
              className={`flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${isSimulating ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-white'}`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Demo
            </button>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className={`${panel} grid place-items-center w-11 h-11 rounded-xl text-gray-300 hover:text-white transition-colors`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Map controls */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
        <div className={`${panel} flex flex-col rounded-xl overflow-hidden`}>
          <button onClick={() => map?.zoomIn()} aria-label="Zoom in" className="grid place-items-center w-11 h-11 text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <div className="h-px bg-white/[0.07]" />
          <button onClick={() => map?.zoomOut()} aria-label="Zoom out" className="grid place-items-center w-11 h-11 text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => map?.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15))}
          aria-label="Center on my location"
          className={`${panel} grid place-items-center w-11 h-11 rounded-xl text-blue-400 hover:text-blue-300 transition-colors`}
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom dashboard */}
      <div className="absolute inset-x-0 bottom-0 z-40 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="mx-auto w-full max-w-md flex flex-col gap-2 pointer-events-auto">
          {toast && (
            <div className={`${panel} anim-rise self-center flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white`}>
              <Check className="w-4 h-4 text-emerald-400" />
              {toast}
            </div>
          )}

          {nearest && (
            <div className={`anim-rise flex items-center gap-3 rounded-2xl px-4 py-3 border shadow-xl shadow-black/40 backdrop-blur-md ${overLimit ? 'bg-red-600/95 border-red-400/40' : 'bg-[#141925]/90 border-red-500/30'}`}>
              <TriangleAlert className={`w-5 h-5 shrink-0 ${overLimit ? 'text-white' : 'text-red-400'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{CAMERA_LABELS[nearest.camera.type]} ahead</div>
                <div className={`text-xs truncate ${overLimit ? 'text-red-100' : 'text-gray-400'}`}>
                  {formatDistance(nearest.distance, settings.speedUnit)} · {nearest.camera.roadName}
                </div>
              </div>
              {overLimit && <span className="text-xs font-bold uppercase tracking-wide text-white">Slow down</span>}
            </div>
          )}

          <div className={`${panel} flex items-center gap-4 rounded-2xl px-5 py-4`}>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Speed</div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-5xl font-extrabold tabular-nums leading-none transition-colors ${overLimit ? 'text-red-400' : 'text-white'}`}>{speed.value}</span>
                <span className="text-sm font-medium text-gray-400">{speed.label}</span>
              </div>
            </div>

            {nearestLimit && (
              <div className="grid place-items-center w-14 h-14 rounded-full bg-white border-[5px] border-red-500 text-gray-900 text-lg font-extrabold tabular-nums" title="Speed limit">
                {nearestLimit.value}
              </div>
            )}

            <button
              onClick={() => setIsReportOpen(true)}
              aria-label="Report camera or hazard"
              className="grid place-items-center w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white shadow-lg shadow-blue-500/25 transition"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportCamera={(type, speedLimit, name) => {
          setCameras(prev => [...prev, {
            id: `user_${Date.now()}`,
            lat: location.lat,
            lng: location.lng,
            type,
            speedLimit,
            name,
            roadName: 'Reported by you',
            verifiedCount: 1,
            lastReported: 'just now',
            isCommunityReport: true
          }]);
          setToast('Camera reported');
        }}
        onReportHazard={(type, title) => {
          setHazards(prev => [...prev, {
            id: `user_${Date.now()}`,
            lat: location.lat,
            lng: location.lng,
            type,
            title,
            timestamp: Date.now(),
            confirmations: 1
          }]);
          setToast('Hazard reported');
        }}
        currentLat={location.lat}
        currentLng={location.lng}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newS) => setSettings(prev => ({ ...prev, ...newS }))}
      />
    </div>
  );
};

export default App;
