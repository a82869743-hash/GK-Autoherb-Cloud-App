import { Menu } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminTopBar({ title, subtitle, actions }: AdminTopBarProps) {

  return (
    <header className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
      <div className="flex items-start gap-4">

        <div className="border-l-4 pl-6" style={{ borderImage: 'linear-gradient(to bottom, #af101a, #D32F2F) 1' }}>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1b1b] uppercase">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[#5f5e5e] text-sm font-medium mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex gap-3 ml-auto">{actions}</div>}
    </header>
  );
}
