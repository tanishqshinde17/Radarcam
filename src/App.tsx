import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Settings, Plus, Minus, LocateFixed, Radio, Satellite, FlaskConical, TriangleAlert, Check, LoaderCircle, Navigation } from 'lucide-react';
import type { AppSettings, SpeedCamera, HazardReport, UserLocation, ProximityAlert, CameraType } from './types';
import { calculateDistanceMeters, formatDistance, formatSpeed } from './services/radarData';
import { loadCamerasAround, RELOAD_DISTANCE_M } from './services/cameraTiles';
import { soundService } from './services/soundService';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';
import { Segmented } from './components/Segmented';
import { usePresence } from './hooks/usePresence';
import { useLiveNavigation } from './hooks/useLiveNavigation';
import { DestinationSearch } from './components/DestinationSearch';
import { GuidanceHUD } from './components/GuidanceHUD';
import { fetchRoutes, type RouteOption } from './services/googleRouting';

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

// Markers are only drawn for cameras in view, and only when zoomed in enough to read them
const MIN_MARKER_ZOOM = 10;
const MAX_MARKERS = 500;
const RETRY_AFTER_MS = 15_000;

type CameraStatus = { state: 'loading' | 'ready' | 'error'; count: number };

const userIcon = L.divIcon({ className: 'map-marker', html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

// Semantic colors: Blue = at/below the limit, Red = above the limit
const BLUE = '#3b82f6';
const RED = '#ef4444';

// Cache divIcons so markers don't get rebuilt on every location tick
const iconCache = new Map<string, L.DivIcon>();

// Camera badge. `over` means the driver is currently above this camera's limit -> red ring.
function camIcon(limit: number, over: boolean): L.DivIcon {
  const ring = over ? RED : BLUE;
  const key = `cam|${limit}|${over}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const html = limit > 0
      ? `<div class="cam-badge" style="--cam-ring:${ring}">${limit}</div>`
      : `<div class="cam-dot" style="--cam-ring:${ring}"></div>`;
    const size = limit > 0 ? 24 : 12;
    icon = L.divIcon({ className: 'map-marker', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    iconCache.set(key, icon);
  }
  return icon;
}

function hazardIcon(): L.DivIcon {
  let icon = iconCache.get('hazard');
  if (!icon) {
    icon = L.divIcon({ className: 'map-marker', html: '<div class="hazard-dot">!</div>', iconSize: [20, 20], iconAnchor: [10, 10] });
    iconCache.set('hazard', icon);
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
  const [osmCameras, setOsmCameras] = useState<SpeedCamera[]>([]);
  const [reportedCameras, setReportedCameras] = useState<SpeedCamera[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>({ state: 'loading', count: 0 });
  const [view, setView] = useState<{ bounds: L.LatLngBounds; zoom: number } | null>(null);
  const loadCenter = useRef<{ lat: number; lng: number } | null>(null);
  const lastError = useRef(0);
  // Bumped after a failed load so it retries even while the driver is standing still
  const [retryTick, setRetryTick] = useState(0);
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
  const [lastAlert, setLastAlert] = useState<ProximityAlert | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number }>({ text: '', id: 0 });
  const [toastOpen, setToastOpen] = useState(false);

  // Navigation & routing state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('fastest');
  const [isNavigating, setIsNavigating] = useState(false);

  // Active route derived from the selected option
  const activeRoute = useMemo(() => routes.find(r => r.id === selectedRouteId), [routes, selectedRouteId]);

  // Live Navigation Simulation along the route polyline
  useLiveNavigation(activeRoute, location, isNavigating, setLocation);

  const handleSearchDestination = async (query: string) => {
    setIsSearchOpen(false);
    showToast('Calculating routes…');
    try {
      const found = await fetchRoutes({ lat: location.lat, lng: location.lng }, query, cameras);
      setRoutes(found);
      setSelectedRouteId(found[0]?.id || 'fastest');
      setIsNavigating(true);
      showToast(`Found ${found.length} route options`);
    } catch (err) {
      console.error(err);
      showToast('Could not find destination');
    }
  };

  // Simulation mode toggle (default false so speed stays constant at 0 when not moving)
  const [isSimulating, setIsSimulating] = useState(false);

  const cameras = useMemo(() => [...osmCameras, ...reportedCameras], [osmCameras, reportedCameras]);
  const visibleCameras = useMemo(() => cameras.filter(c => isCameraVisible(c, settings)), [cameras, settings]);

  // Load real cameras within 200 km, and again whenever the driver moves far enough away
  useEffect(() => {
    const here = { lat: location.lat, lng: location.lng };
    const last = loadCenter.current;
    if (last && calculateDistanceMeters(last.lat, last.lng, here.lat, here.lng) < RELOAD_DISTANCE_M) return;
    if (Date.now() - lastError.current < RETRY_AFTER_MS) return;

    loadCenter.current = here;
    setCameraStatus(prev => ({ ...prev, state: 'loading' }));
    loadCamerasAround(here.lat, here.lng)
      .then(found => {
        if (loadCenter.current !== here) return; // a newer load superseded this one
        setOsmCameras(found);
        setCameraStatus({ state: 'ready', count: found.length });
      })
      .catch(err => {
        console.warn('Could not load speed cameras:', err);
        if (loadCenter.current !== here) return;
        loadCenter.current = last;
        lastError.current = Date.now();
        setCameraStatus(prev => ({ ...prev, state: 'error' }));
        setTimeout(() => setRetryTick(t => t + 1), RETRY_AFTER_MS + 250);
      });
  }, [location.lat, location.lng, retryTick]);

  // Track the visible map area so only on-screen cameras get markers
  useEffect(() => {
    if (!map) return;
    const update = () => setView({ bounds: map.getBounds().pad(0.2), zoom: map.getZoom() });
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  const markerCameras = useMemo(() => {
    if (!view || view.zoom < MIN_MARKER_ZOOM) return [];
    const center = view.bounds.getCenter();
    const inView = visibleCameras.filter(c => view.bounds.contains([c.lat, c.lng]));
    if (inView.length <= MAX_MARKERS) return inView;
    return inView
      .map(c => ({ c, d: calculateDistanceMeters(center.lat, center.lng, c.lat, c.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_MARKERS)
      .map(x => x.c);
  }, [view, visibleCameras]);

  // Proximity alerts and Speed logic
  useEffect(() => {
    const alerts: ProximityAlert[] = [];
    visibleCameras.forEach(cam => {
      const dist = calculateDistanceMeters(location.lat, location.lng, cam.lat, cam.lng);
      if (dist < settings.detectionRadius) {
        const isOverSpeed = cam.speedLimit > 0 && location.speed > cam.speedLimit;
        alerts.push({ camera: cam, distance: dist, isOverSpeed });
      }
    });
    alerts.sort((a, b) => a.distance - b.distance);
    setActiveAlerts(alerts);
    if (alerts.length) setLastAlert(alerts[0]);

    // Only the nearest camera makes sound, so a cluster doesn't stack beeps
    const first = alerts[0];
    if (!first) return;
    if (settings.soundAlerts && first.distance < settings.detectionRadius * 0.5) {
      if (first.isOverSpeed && settings.overspeedBeep) soundService.playOverspeedAlarm();
      else soundService.playWarningBeep();
    }
    if (settings.voiceAlerts && first.distance < 400 && first.distance > 300) {
      const metric = settings.speedUnit === 'kmh';
      const distance = metric ? `${Math.round(first.distance)} meters` : `${Math.round(first.distance * 3.28084)} feet`;
      const limit = first.camera.speedLimit > 0
        ? ` Speed limit ${formatSpeed(first.camera.speedLimit, settings.speedUnit).value} ${metric ? 'kilometers per hour' : 'miles per hour'}.`
        : '';
      soundService.speak(`${first.camera.name} ahead in ${distance}.${limit}`);
    }
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

  // Force re-render of map tiles if they go missing
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => map.invalidateSize(), 500);
    return () => clearTimeout(timer);
  }, [map]);

  // Keep the map following the driver
  useEffect(() => {
    if (!map || !settings.autoCenterMap) return;
    const center = map.getCenter();
    // Jump on big moves (like the first GPS fix); a long animated pan can be cut off midway
    if (calculateDistanceMeters(center.lat, center.lng, location.lat, location.lng) > 5_000) {
      map.setView([location.lat, location.lng], map.getZoom(), { animate: false });
    } else {
      map.panTo([location.lat, location.lng], { animate: true, duration: 0.8, easeLinearity: 0.5 });
    }
  }, [map, location.lat, location.lng, settings.autoCenterMap]);

  const showToast = (text: string) => {
    setToast(prev => ({ text, id: prev.id + 1 }));
    setToastOpen(true);
  };

  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 2500);
    return () => clearTimeout(t);
  }, [toastOpen, toast.id]);

  const speed = formatSpeed(location.speed, settings.speedUnit);
  const nearest = activeAlerts[0];
  const nearestLimit = nearest?.camera.speedLimit ? formatSpeed(nearest.camera.speedLimit, settings.speedUnit) : null;
  const overLimit = nearest?.isOverSpeed ?? false;

  // Fall back to the last alert so its content stays put while the card animates out
  const shownAlert = nearest ?? lastAlert;
  const shownLimit = shownAlert?.camera.speedLimit ? formatSpeed(shownAlert.camera.speedLimit, settings.speedUnit) : nearestLimit;
  const unitLabel = settings.speedUnit === 'kmh' ? 'km/h' : 'mph';

  const alertCard = usePresence(!!nearest, 250);
  const limitSign = usePresence(!!nearestLimit, 200);
  const toastPresence = usePresence(toastOpen, 400);

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
        {markerCameras.map(cam => {
          const limit = cam.speedLimit > 0 ? formatSpeed(cam.speedLimit, settings.speedUnit).value : 0;
          const over = cam.speedLimit > 0 && location.speed > cam.speedLimit;
          return (
            <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={camIcon(limit, over)}>
              <Popup>
                <div className="font-semibold text-white">{CAMERA_LABELS[cam.type]}</div>
                <div className="text-gray-400">{limit ? `Limit ${limit} ${unitLabel}` : 'Speed limit not recorded'}</div>
                <div className="text-xs text-gray-500 mt-1">{cam.isCommunityReport ? 'Reported by you' : 'Source: OpenStreetMap'}</div>
              </Popup>
            </Marker>
          );
        })}
        {settings.filterHazards && hazards.map(h => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={hazardIcon()}>
            <Popup>
              <div className="font-semibold text-white">{h.title}</div>
              <div className="text-gray-400">{h.confirmations} confirmations</div>
            </Popup>
          </Marker>
        ))}

        {isNavigating && activeRoute && (
          <Polyline positions={activeRoute.coordinates} color="#3b82f6" weight={5} opacity={0.7} />
        )}
      </MapContainer>

      {isSearchOpen && <DestinationSearch onSearch={handleSearchDestination} onClose={() => setIsSearchOpen(false)} />}
      {isNavigating && activeRoute && (
        <GuidanceHUD
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          onCancel={() => setIsNavigating(false)}
        />
      )}

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
        <div className={`${panel} enter-down pointer-events-auto flex items-center gap-2 rounded-xl px-3 h-11`}>
          <Radio className="w-5 h-5 text-blue-400" />
          <span className="font-bold tracking-tight text-white max-[380px]:hidden">Radar<span className="text-blue-400">cam</span></span>
        </div>
        <div className="enter-down pointer-events-auto flex items-center gap-2" style={{ '--delay': '60ms' } as React.CSSProperties}>
          <Segmented
            ariaLabel="Location source"
            value={isSimulating ? 'demo' : 'gps'}
            onChange={(v) => {
              setIsSimulating(v === 'demo');
              // Show the simulated speed immediately instead of waiting for the first tick
              if (v === 'demo') setLocation(prev => ({ ...prev, speed: 60 }));
            }}
            className={`${panel} h-11 rounded-xl`}
            indicatorClass={(v) => (v === 'demo' ? 'bg-amber-500/25' : 'bg-white/10')}
            options={[
              { value: 'gps', label: <><Satellite className="w-3.5 h-3.5" />GPS</> },
              { value: 'demo', label: <><FlaskConical className="w-3.5 h-3.5" />Demo</> }
            ]}
          />
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search destination"
            className={`${panel} press grid place-items-center w-11 h-11 rounded-xl text-blue-400 hover:text-blue-300`}
          >
            <Navigation className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className={`${panel} press grid place-items-center w-11 h-11 rounded-xl text-gray-300 hover:text-white`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Camera data status */}
      <div
        className="enter-down absolute left-3 sm:left-4 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] sm:top-[calc(max(1rem,env(safe-area-inset-top))+3.25rem)] z-30 pointer-events-none"
        style={{ '--delay': '90ms' } as React.CSSProperties}
      >
        <div role="status" className={`${panel} flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-medium text-gray-400`}>
          {cameraStatus.state === 'loading' && <><LoaderCircle className="w-3.5 h-3.5 animate-spin text-blue-400" />Loading cameras…</>}
          {cameraStatus.state === 'error' && <span className="text-amber-300">Camera servers busy · retrying</span>}
          {cameraStatus.state === 'ready' && (
            <span>
              {cameraStatus.count.toLocaleString()} cameras within 200 km
              {view && view.zoom < MIN_MARKER_ZOOM && cameraStatus.count > 0 && ' · zoom in to see them'}
            </span>
          )}
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30">
        <div className="enter-up flex flex-col gap-2" style={{ '--delay': '120ms' } as React.CSSProperties}>
        <div className={`${panel} flex flex-col rounded-xl overflow-hidden`}>
          <button onClick={() => map?.zoomIn()} aria-label="Zoom in" className="press grid place-items-center w-11 h-11 text-gray-300 hover:text-white hover:bg-white/5">
            <Plus className="w-5 h-5" />
          </button>
          <div className="h-px bg-white/[0.07]" />
          <button onClick={() => map?.zoomOut()} aria-label="Zoom out" className="press grid place-items-center w-11 h-11 text-gray-300 hover:text-white hover:bg-white/5">
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => map?.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15), { duration: 0.8 })}
          aria-label="Center on my location"
          className={`${panel} press grid place-items-center w-11 h-11 rounded-xl text-blue-400 hover:text-blue-300`}
        >
          <LocateFixed className="w-5 h-5" />
        </button>
        </div>
      </div>

      {/* Bottom dashboard */}
      <div className="absolute inset-x-0 bottom-0 z-40 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="enter-up relative mx-auto w-full max-w-md flex flex-col gap-2 pointer-events-auto" style={{ '--delay': '180ms' } as React.CSSProperties}>
          {/* Toast floats above the stack so it never shifts the cards */}
          {toastPresence.mounted && (
            <div className="absolute bottom-full inset-x-0 mb-2 flex justify-center pointer-events-none">
              <div key={toast.id} data-state={toastPresence.state} role="status" className={`${panel} toast flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white`}>
                <Check className="w-4 h-4 text-emerald-400" />
                {toast.text}
              </div>
            </div>
          )}

          {alertCard.mounted && shownAlert && (
            <div
              data-state={alertCard.state}
              role="alert"
              className={`slide-up flex items-center gap-3 rounded-2xl px-4 py-3 border shadow-xl shadow-black/40 backdrop-blur-md ${overLimit ? 'bg-red-500/15 border-red-500/40' : 'bg-blue-500/10 border-blue-500/30'}`}
            >
              <TriangleAlert className={`w-5 h-5 shrink-0 transition-colors duration-200 ${overLimit ? 'text-red-400' : 'text-blue-400'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{CAMERA_LABELS[shownAlert.camera.type]} ahead</div>
                <div className={`text-xs truncate tabular-nums transition-colors duration-200 ${overLimit ? 'text-red-300' : 'text-blue-300'}`}>
                  {formatDistance(shownAlert.distance, settings.speedUnit)}
                  {shownAlert.camera.speedLimit > 0 ? ` · limit ${formatSpeed(shownAlert.camera.speedLimit, settings.speedUnit).value} ${unitLabel}` : ''}
                </div>
              </div>
              <span
                data-state={overLimit ? 'open' : 'closed'}
                className="pop text-xs font-bold uppercase tracking-wide text-red-400"
                aria-hidden={!overLimit}
              >
                Slow down
              </span>
            </div>
          )}

          <div className={`${panel} flex items-center gap-4 rounded-2xl px-5 py-4`}>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Speed</div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-5xl font-extrabold tabular-nums leading-none transition-colors duration-200 ${overLimit ? 'text-red-500' : 'text-blue-400'}`}>{speed.value}</span>
                <span className="text-sm font-medium text-gray-400">{speed.label}</span>
              </div>
            </div>

            {limitSign.mounted && shownLimit && (
              <div
                data-state={limitSign.state}
                className={`pop grid place-items-center w-14 h-14 rounded-full bg-white border-[5px] text-gray-900 text-lg font-extrabold tabular-nums transition-colors duration-200 ${overLimit ? 'border-red-500' : 'border-blue-500'}`}
                title="Speed limit"
              >
                {shownLimit.value}
              </div>
            )}

            <button
              onClick={() => setIsReportOpen(true)}
              aria-label="Report camera or hazard"
              className="press grid place-items-center w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25"
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
          setReportedCameras(prev => [...prev, {
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
          showToast('Camera reported');
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
          showToast('Hazard reported');
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
