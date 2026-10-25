import { STATUS_COLORS } from '../../utils/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status || ''] || 'bg-gray-100 text-gray-700 border-gray-200/50';
  const label = (status || '').replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize border ${colorClass} ${className}`}>
      {label}
    </span>
  );
}
