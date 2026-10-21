import React, { useState } from 'react';
import type { CameraType, HazardType } from '../types';
import { ShieldAlert, Camera, AlertTriangle, X, Check } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCamera: (type: CameraType, speedLimit: number, name: string) => void;
  onReportHazard: (type: HazardType, title: string) => void;
  currentLat: number;
  currentLng: number;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onReportCamera,
  onReportHazard
}) => {
  const [tab, setTab] = useState<'camera' | 'hazard'>('camera');
  const [camType, setCamType] = useState<CameraType>('mobile');
  const [speedLimit, setSpeedLimit] = useState<number>(50);
  const [camName, setCamName] = useState<string>('Mobile Speed Trap');

  const [hazardType, setHazardType] = useState<HazardType>('police');
  const [hazardTitle, setHazardTitle] = useState<string>('Police Patrol Checkpoint');

  if (!isOpen) return null;

  const handleCameraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportCamera(camType, speedLimit, camName);
    onClose();
  };

  const handleHazardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReportHazard(hazardType, hazardTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
            <h3 className="text-lg font-bold text-white">Community Alert Report</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-2 bg-gray-950/60 border-b border-gray-800">
          <button
            onClick={() => setTab('camera')}
            className={`py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              tab === 'camera'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Speed Camera</span>
          </button>
          <button
            onClick={() => setTab('hazard')}
            className={`py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              tab === 'hazard'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Road Hazard</span>
          </button>
        </div>

        <div className="p-6">
          {tab === 'camera' ? (
            <form onSubmit={handleCameraSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Camera Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mobile', label: 'Mobile Trap' },
                    { id: 'fixed', label: 'Fixed Cam' },
                    { id: 'red_light', label: 'Red Light' },
                    { id: 'average_speed', label: 'Average Speed' },
                    { id: 'tunnel', label: 'Tunnel Cam' },
                    { id: 'traffic', label: 'Traffic Cam' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCamType(item.id as CameraType);
                        setCamName(item.label);
                      }}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition text-center ${
                        camType === item.id
                          ? 'border-red-500 bg-red-500/15 text-white'
                          : 'border-gray-800 bg-gray-800/50 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Speed Limit ({speedLimit} km/h)
                </label>
                <input
                  type="range"
                  min="20"
                  max="140"
                  step="10"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(Number(e.target.value))}
                  className="w-full accent-red-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>20</span>
                  <span>50</span>
                  <span>80</span>
                  <span>110</span>
                  <span>140</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Description / Label
                </label>
                <input
                  type="text"
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. Hidden police patrol behind bush"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Broadcast Camera Alert</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleHazardSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Hazard Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'police', label: 'Police Checkpoint', title: 'Police Patrol Checkpoint' },
                    { id: 'mobile', label: 'Hidden Speed Trap', title: 'Hidden Radar Trap' },
                    { id: 'accident', label: 'Accident / Crash', title: 'Road Accident' },
                    { id: 'traffic_jam', label: 'Traffic Jam', title: 'Heavy Traffic Congestion' },
                    { id: 'roadwork', label: 'Roadworks', title: 'Roadworks & Lane Closure' },
                    { id: 'hazard', label: 'Debris / Hazard', title: 'Road Hazard Object' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setHazardType(item.id as HazardType);
                        setHazardTitle(item.title);
                      }}
                      className={`py-2.5 px-3 text-xs font-medium rounded-xl border transition text-center ${
                        hazardType === item.id
                          ? 'border-amber-500 bg-amber-500/15 text-white'
                          : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Hazard Title
                </label>
                <input
                  type="text"
                  value={hazardTitle}
                  onChange={(e) => setHazardTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center justify-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Broadcast Hazard Alert</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
