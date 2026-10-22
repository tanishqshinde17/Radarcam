import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Bottom sheet on mobile, centered dialog on larger screens
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="anim-rise w-full sm:max-w-md max-h-[90dvh] flex flex-col bg-[#11151f] border border-white/[0.07] rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06] shrink-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-9 h-9 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-white/[0.06] shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
};
