import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { ToastType } from '../../types';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-green-500 shrink-0" />,
  error: <XCircle size={16} className="text-red-500 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
  info: <Info size={16} className="text-blue-500 shrink-0" />,
};

const BG_CLASSES: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-white rounded-lg shadow-md shadow-black/5 border border-gray-100 border-l-[3px] ${BG_CLASSES[toast.type]} px-3.5 py-2.5 flex items-start gap-2.5 animate-slide-in`}
        >
          {ICONS[toast.type]}
          <p className="text-xs sm:text-[13px] font-normal text-[#1c1b1b] flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
