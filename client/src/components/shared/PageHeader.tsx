interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div>
        <h2 className="font-display text-[24px] leading-tight font-extrabold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-500 text-[13px] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
    </header>
  );
}
