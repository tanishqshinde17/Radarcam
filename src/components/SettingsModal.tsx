import React from 'react';
import type { AppSettings } from '../types';
import { soundService } from '../services/soundService';
import { Volume2 } from 'lucide-react';
import { Modal } from './Modal';
import { Segmented } from './Segmented';
import { choiceClass, primaryButton } from './styles';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type BooleanKey = {
  [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never
}[keyof AppSettings];

const ALERT_TOGGLES: { key: BooleanKey; label: string; hint: string }[] = [
  { key: 'soundAlerts', label: 'Alert sounds', hint: 'Chime when approaching a camera' },
  { key: 'voiceAlerts', label: 'Voice alerts', hint: 'Spoken distance and speed limit' },
  { key: 'overspeedBeep', label: 'Overspeed warning', hint: 'Beep when above the limit' },
  { key: 'autoCenterMap', label: 'Follow location', hint: 'Keep the map centered on you' }
];

const FILTERS: { key: BooleanKey; label: string }[] = [
  { key: 'filterFixed', label: 'Fixed cameras' },
  { key: 'filterMobile', label: 'Mobile radar' },
  { key: 'filterRedLight', label: 'Red light' },
  { key: 'filterAverage', label: 'Average speed' },
  { key: 'filterHazards', label: 'Road hazards' }
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
    {children}
  </section>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative w-11 h-6 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-white/15'}`}
  >
    <span data-on={checked} className="switch-thumb absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow" />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  const testAudio = () => {
    soundService.playWarningBeep();
    setTimeout(() => {
      soundService.speak("Test: Speed camera ahead in 500 meters. Speed limit 80 kilometers per hour.", true);
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      footer={<button onClick={onClose} className={primaryButton}>Done</button>}
    >
      <div className="space-y-6">
        <Section title="Alerts">
          <div className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.06]">
            {ALERT_TOGGLES.map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.hint}</div>
                </div>
                <Toggle
                  label={item.label}
                  checked={settings[item.key]}
                  onChange={() => onUpdateSettings({ [item.key]: !settings[item.key] })}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={testAudio}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-white/[0.02] transition-colors rounded-b-xl"
            >
              <Volume2 className="w-4 h-4" />
              Play test alert
            </button>
          </div>
        </Section>

        <Section title="Units & range">
          <div className="rounded-xl border border-white/[0.07] divide-y divide-white/[0.06]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-white">Speed unit</span>
              <Segmented
                ariaLabel="Speed unit"
                value={settings.speedUnit}
                onChange={(unit) => onUpdateSettings({ speedUnit: unit })}
                className="w-32 h-9 rounded-lg bg-white/[0.06]"
                buttonClass="text-xs font-semibold"
                options={[
                  { value: 'kmh', label: 'km/h' },
                  { value: 'mph', label: 'mph' }
                ]}
              />
            </div>
            <div className="px-4 py-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-white">Warning distance</span>
                <span className="text-gray-400 tabular-nums">{settings.detectionRadius} m</span>
              </div>
              <input
                type="range"
                min="300"
                max="2000"
                step="100"
                value={settings.detectionRadius}
                onChange={(e) => onUpdateSettings({ detectionRadius: Number(e.target.value) })}
                aria-label="Warning distance"
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </Section>

        <Section title="Show on map">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(item => (
              <button
                key={item.key}
                type="button"
                aria-pressed={settings[item.key]}
                onClick={() => onUpdateSettings({ [item.key]: !settings[item.key] })}
                className={`${choiceClass(settings[item.key])} rounded-full px-3.5`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </Modal>
  );
};
