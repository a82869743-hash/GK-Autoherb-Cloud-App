interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <div className="border-l-[3px] border-[#D32F2F] pl-3.5">
        <h2 className="text-xl sm:text-[22px] font-semibold tracking-tight text-[#1c1b1b]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[#5f5e5e] text-xs sm:text-[13px] font-normal mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
    </header>
  );
}
