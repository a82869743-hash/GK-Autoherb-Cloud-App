import { LucideIcon, Inbox } from 'lucide-react';
import Button from '../ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button onClick={onAction} size="sm" variant="primary">{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
