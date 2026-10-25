import React from 'react';
import type { RouteOption } from '../services/googleRouting';
import { Navigation, ShieldAlert, DollarSign, X } from 'lucide-react';

interface GuidanceHUDProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  onCancel: () => void;
}

export const GuidanceHUD: React.FC<GuidanceHUDProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  onCancel,
}) => {
  const selected = routes.find(r => r.id === selectedRouteId) || routes[0];
  if (!selected) return null;

  const formatEta = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rmins = mins % 60;
    return `${hrs}h ${rmins}m`;
  };

  const formatDist = (meters: number) => {
    return meters > 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  return (
    <div className="absolute inset-x-0 bottom-24 z-40 px-3 sm:px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-md flex flex-col gap-2.5">
        {/* Next Maneuver HUD Card */}
        <div className="bg-[#141925]/95 backdrop-blur-md border border-blue-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="grid place-items-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {selected.steps[0]?.instruction || 'Proceed on route'}
            </div>
            <div className="text-xs text-blue-300 flex items-center gap-3 mt-0.5">
              <span>{formatDist(selected.distanceMeters)} remaining</span>
              <span>·</span>
              <span className="font-bold">{formatEta(selected.durationSeconds)} ETA</span>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel navigation"
            className="press p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternative Routes bar (showing tolls & speed cameras) */}
        {routes.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {routes.map(r => {
              const active = r.id === selectedRouteId;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRoute(r.id)}
                  className={`press p-3 rounded-xl border text-left backdrop-blur-md transition-colors ${
                    active
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-[#141925]/90 border-white/[0.07] text-gray-300 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex justify-between items-center">
                    <span>{r.title}</span>
                    <span>{formatEta(r.durationSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      {r.cameraCount} cameras
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      {r.tollCount > 0 ? `${r.tollCount} tolls` : 'No tolls'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
