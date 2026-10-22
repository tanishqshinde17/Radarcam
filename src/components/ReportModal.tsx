import React, { useState } from 'react';
import type { CameraType, HazardType } from '../types';
import { Camera, TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { fieldLabel, choiceClass, primaryButton } from './styles';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCamera: (type: CameraType, speedLimit: number, name: string) => void;
  onReportHazard: (type: HazardType, title: string) => void;
  currentLat: number;
  currentLng: number;
}

const CAMERA_OPTIONS: { id: CameraType; label: string }[] = [
  { id: 'mobile', label: 'Mobile trap' },
  { id: 'fixed', label: 'Fixed camera' },
  { id: 'red_light', label: 'Red light' },
  { id: 'average_speed', label: 'Average speed' },
  { id: 'tunnel', label: 'Tunnel' },
  { id: 'traffic', label: 'Traffic' }
];

const HAZARD_OPTIONS: { id: HazardType; label: string; title: string }[] = [
  { id: 'police', label: 'Police', title: 'Police checkpoint' },
  { id: 'accident', label: 'Accident', title: 'Road accident' },
  { id: 'traffic_jam', label: 'Traffic jam', title: 'Heavy traffic' },
  { id: 'roadwork', label: 'Roadworks', title: 'Roadworks & lane closure' },
  { id: 'hazard', label: 'Debris', title: 'Object on road' }
];

const SPEED_LIMITS = [30, 50, 60, 80, 100, 120];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onReportCamera,
  onReportHazard
}) => {
  const [tab, setTab] = useState<'camera' | 'hazard'>('camera');
  const [camType, setCamType] = useState<CameraType>('mobile');
  const [speedLimit, setSpeedLimit] = useState<number>(50);
  const [hazardType, setHazardType] = useState<HazardType>('police');

  const handleSubmit = () => {
    if (tab === 'camera') {
      const label = CAMERA_OPTIONS.find(o => o.id === camType)?.label ?? 'Camera';
      onReportCamera(camType, speedLimit, label);
    } else {
      const title = HAZARD_OPTIONS.find(o => o.id === hazardType)?.title ?? 'Road hazard';
      onReportHazard(hazardType, title);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report at your location"
      footer={
        <button onClick={handleSubmit} className={primaryButton}>
          {tab === 'camera' ? 'Report camera' : 'Report hazard'}
        </button>
      }
    >
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-white/[0.04]">
        {([
          { id: 'camera', label: 'Speed camera', Icon: Camera },
          { id: 'hazard', label: 'Road hazard', Icon: TriangleAlert }
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`h-9 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'camera' ? (
        <div className="space-y-5">
          <div>
            <label className={fieldLabel}>Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CAMERA_OPTIONS.map(item => (
                <button key={item.id} type="button" onClick={() => setCamType(item.id)} className={choiceClass(camType === item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Speed limit (km/h)</label>
            <div className="grid grid-cols-6 gap-2">
              {SPEED_LIMITS.map(limit => (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setSpeedLimit(limit)}
                  className={`aspect-square rounded-full text-sm font-bold tabular-nums transition ${
                    speedLimit === limit
                      ? 'bg-white text-gray-900 ring-4 ring-red-500'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white ring-1 ring-white/10'
                  }`}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className={fieldLabel}>Type</label>
          <div className="grid grid-cols-3 gap-2">
            {HAZARD_OPTIONS.map(item => (
              <button key={item.id} type="button" onClick={() => setHazardType(item.id)} className={choiceClass(hazardType === item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
