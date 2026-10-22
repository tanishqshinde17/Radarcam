import React from 'react';

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly [{ value: T; label: React.ReactNode }, { value: T; label: React.ReactNode }];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  // Optional per-option classes for the sliding indicator (e.g. a different tint)
  indicatorClass?: (value: T) => string;
  buttonClass?: string;
}

// Two-option switch with an indicator that slides between segments
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  indicatorClass = () => 'bg-white/10',
  buttonClass = 'px-3 text-xs font-semibold'
}: SegmentedProps<T>) {
  const second = value === options[1].value;
  return (
    <div role="group" aria-label={ariaLabel} className={`relative grid grid-cols-2 p-1 ${className}`}>
      <span
        aria-hidden
        data-second={second}
        className={`segmented-indicator absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg ${indicatorClass(value)}`}
      />
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`press relative z-10 flex items-center justify-center gap-1.5 rounded-lg transition-colors ${buttonClass} ${active ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
