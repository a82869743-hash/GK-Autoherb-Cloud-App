import { SelectHTMLAttributes, forwardRef } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-[15px] sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-red-500/15 focus:border-[#D32F2F] transition-all ${
            error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
