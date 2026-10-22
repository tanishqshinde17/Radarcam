import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { usePresence } from '../hooks/usePresence';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Longest exit: the mobile sheet (see .modal-panel in index.css)
const EXIT_MS = 420;

// Bottom sheet on mobile, centered dialog on larger screens
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const { mounted, state } = usePresence(isOpen, EXIT_MS);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 ${isOpen ? '' : 'pointer-events-none'}`}>
      <div data-state={state} className="modal-backdrop absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-state={state}
        className="modal-panel relative w-full sm:max-w-md max-h-[90dvh] flex flex-col bg-[#11151f] border border-white/[0.07] rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06] shrink-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press grid place-items-center w-9 h-9 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-white/[0.06] shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
};
