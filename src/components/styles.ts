// Shared form styles for modals
export const fieldLabel = 'block text-xs font-medium text-gray-400 mb-2';

export const choiceClass = (active: boolean) =>
  `py-2.5 px-3 text-xs font-medium rounded-lg border text-center press ${
    active ? 'border-blue-500/60 bg-blue-500/10 text-white' : 'border-white/[0.07] bg-white/[0.02] text-gray-400 hover:text-gray-200 hover:border-white/15'
  }`;

export const primaryButton =
  'w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold press';
