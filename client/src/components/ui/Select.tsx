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
          <label htmlFor={selectId} className="block text-xs font-medium text-[#5f5e5e] mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-[#1c1b1b] text-sm font-normal focus:outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] transition-all ${
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
