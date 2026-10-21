import React from 'react';
import type { AppSettings } from '../types';
import { soundService } from '../services/soundService';
import { Volume2, Eye, Bell, Shield, Sliders, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  const testAudio = () => {
    soundService.playWarningBeep();
    setTimeout(() => {
      soundService.speak("Test: Speed camera ahead in 500 meters. Speed limit 80 kilometers per hour.", true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900/90 backdrop-blur z-10">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Radar & Navigation Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Audio & Alert Preferences */}
          <div>
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Alert Notifications</span>
            </h4>
            <div className="space-y-3 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Audio Chimes</div>
                  <div className="text-xs text-gray-400">Play alert sounds when approaching radar cameras</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ soundAlerts: !settings.soundAlerts })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    settings.soundAlerts ? 'bg-indigo-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Voice Speech Alerts</div>
                  <div className="text-xs text-gray-400">Spoken voice warnings ("Fixed camera in 400m")</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ voiceAlerts: !settings.voiceAlerts })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    settings.voiceAlerts ? 'bg-indigo-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Overspeed Beep</div>
                  <div className="text-xs text-gray-400">Pulsing warning when exceeding current road speed limit</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ overspeedBeep: !settings.overspeedBeep })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    settings.overspeedBeep ? 'bg-indigo-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>

              <button
                type="button"
                onClick={testAudio}
                className="w-full mt-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-indigo-300 rounded-lg transition flex items-center justify-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Test Audio & Voice Alert Sample</span>
              </button>
            </div>
          </div>

          {/* Units & Radius */}
          <div>
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Speed & Distance Measurement</span>
            </h4>
            <div className="space-y-4 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Speed Unit</span>
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                  <button
                    onClick={() => onUpdateSettings({ speedUnit: 'kmh' })}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                      settings.speedUnit === 'kmh' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    km/h
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ speedUnit: 'mph' })}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                      settings.speedUnit === 'mph' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    mph
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-white">Detection Warning Radius</span>
                  <span className="text-indigo-400 font-bold">{settings.detectionRadius} meters</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="2000"
                  step="100"
                  value={settings.detectionRadius}
                  onChange={(e) => onUpdateSettings({ detectionRadius: Number(e.target.value) })}
                  className="w-full accent-indigo-500 bg-gray-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>300m</span>
                  <span>1000m</span>
                  <span>2000m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Camera Filter Toggles */}
          <div>
            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Detection Filters</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'filterFixed', label: 'Fixed Speed Cameras' },
                { key: 'filterMobile', label: 'Mobile Radar Traps' },
                { key: 'filterRedLight', label: 'Red Light Cameras' },
                { key: 'filterAverage', label: 'Average Speed Zones' },
                { key: 'filterHazards', label: 'Traffic & Road Hazards' }
              ].map((item) => {
                const active = (settings as any)[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onUpdateSettings({ [item.key]: !active })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition ${
                      active
                        ? 'border-indigo-500/70 bg-indigo-950/40 text-indigo-200'
                        : 'border-gray-800 bg-gray-900/60 text-gray-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-400' : 'bg-gray-700'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-950/60 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
