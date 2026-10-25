import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-sheet w-full ${sizeClasses[size]} max-h-[92dvh] flex flex-col animate-sheet-up sm:animate-scale-in overflow-hidden relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet grab handle (mobile) */}
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 shrink-0" />
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0 bg-white">
            <h3 className="font-display text-lg font-extrabold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-1 overscroll-contain text-sm">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3 pb-safe border-t border-slate-100 bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
