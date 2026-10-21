import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Settings, ShieldAlert, Zap, Radio } from 'lucide-react';
import type { AppSettings, SpeedCamera, UserLocation, ProximityAlert } from './types';
import { generateNearbyCameras, generateInitialHazards, calculateDistanceMeters, formatDistance, formatSpeed } from './services/radarData';
import { soundService } from './services/soundService';
import { ReportModal } from './components/ReportModal';
import { SettingsModal } from './components/SettingsModal';

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const App: React.FC = () => {
  const [location, setLocation] = useState<UserLocation>({ lat: 40.7128, lng: -74.006, speed: 0, heading: 0, accuracy: 10, altitude: 0 });
  const [cameras, setCameras] = useState<SpeedCamera[]>([]);
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

  // Simulation mode
  const [isSimulating] = useState(true);

  // Initialize data
  useEffect(() => {
    setCameras(generateNearbyCameras(location.lat, location.lng));
    generateInitialHazards(location.lat, location.lng);
  }, []);

  // Proximity alerts and Speed logic
  useEffect(() => {
    const alerts: ProximityAlert[] = [];
    cameras.forEach(cam => {
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
    setActiveAlerts(alerts);
  }, [location, cameras, settings]);

  // Simulate movement
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setLocation(prev => ({
        ...prev,
        lat: prev.lat + (Math.random() - 0.5) * 0.0001,
        lng: prev.lng + (Math.random() - 0.5) * 0.0001,
        speed: Math.floor(Math.random() * 110)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col font-sans text-gray-200">
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800 p-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Radio className="w-6 h-6 animate-pulse" />
          <span className="font-bold text-lg tracking-tight text-white">Pulse<span className="text-indigo-400">Nav</span></span>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
             <Settings className="w-5 h-5 text-gray-300" />
           </button>
        </div>
      </div>

      {/* Main Map */}
      <MapContainer center={[location.lat, location.lng]} zoom={14} className="flex-grow">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark theme tile
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* User */}
        <Marker position={[location.lat, location.lng]}>
          <Popup>Current Location</Popup>
        </Marker>
        {/* Cameras */}
        {cameras.filter(c => (settings.filterFixed && c.type === 'fixed') || (settings.filterMobile && c.type === 'mobile')).map(cam => (
          <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={L.divIcon({ className: 'bg-red-500 rounded-full w-4 h-4 border-2 border-white' })}>
            <Popup>
               <div className="text-xs font-bold">{cam.name}</div>
               <div className="text-gray-400">{cam.roadName}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Speedometer Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-40 flex flex-col items-center space-y-4">
        {activeAlerts.length > 0 && (
          <div className="w-full bg-red-900/90 border border-red-500/50 rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-8 h-8 text-red-100" />
              <div>
                <div className="text-sm font-bold text-red-50">Camera Ahead: {activeAlerts[0].camera.name}</div>
                <div className="text-xs text-red-200">Distance: {formatDistance(activeAlerts[0].distance, settings.speedUnit)}</div>
              </div>
            </div>
            <div className="text-2xl font-black text-white">{activeAlerts[0].camera.speedLimit} <span className="text-sm">km/h</span></div>
          </div>
        )}

        <div className="w-full bg-gray-900/95 border border-gray-800 rounded-3xl p-6 flex justify-between items-center shadow-2xl backdrop-blur">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Speed</span>
            <div className="text-6xl font-black text-white tabular-nums">{formatSpeed(location.speed, settings.speedUnit).value}</div>
            <span className="text-sm font-semibold text-indigo-400">{formatSpeed(location.speed, settings.speedUnit).label}</span>
          </div>

          <button
             onClick={() => setIsReportOpen(true)}
             className="p-5 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full shadow-lg shadow-indigo-600/30 hover:scale-105 transition"
          >
            <Zap className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportCamera={(t, s, n) => console.log('Reported', t, s, n)}
        onReportHazard={(t, title) => console.log('Reported', t, title)}
        currentLat={location.lat}
        currentLng={location.lng}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newS) => setSettings({...settings, ...newS})}
      />
    </div>
  );
};

export default App;
