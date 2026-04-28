import { CheckCircle, Clock, XCircle, AlertCircle, PlayCircle, Truck, Package, RotateCcw } from 'lucide-react';

export type StatusType = 
  | 'completed' | 'in_progress' | 'open' | 'pending' | 'new' | 'followed_up' | 'converted' 
  | 'in_transit' | 'delivered' | 'cancelled' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    const norm = s.toLowerCase();
    switch (norm) {
      case 'completed':
      case 'converted':
      case 'delivered':
      case 'active':
        return { color: 'bg-green-100 text-green-700 border border-green-200', icon: CheckCircle, label: s.replace('_', ' ') };
      case 'in_progress':
      case 'in_transit':
        return { color: 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse-dot', icon: Truck, label: s.replace('_', ' ') };
      case 'pending':
      case 'open':
        return { color: 'bg-orange-100 text-orange-700 border border-orange-200', icon: Clock, label: s.replace('_', ' ') };
      case 'new':
        return { color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: AlertCircle, label: s.replace('_', ' ') };
      case 'cancelled':
      case 'inactive':
        return { color: 'bg-[#D32F2F]/10 text-[#D32F2F] border border-[#D32F2F]/20', icon: XCircle, label: s.replace('_', ' ') };
      case 'followed_up':
        return { color: 'bg-teal-100 text-teal-700 border border-teal-200', icon: RotateCcw, label: s.replace('_', ' ') };
      default:
        return { color: 'bg-gray-100 text-gray-700 border border-gray-200', icon: Package, label: s.replace('_', ' ') };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.color} ${className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
