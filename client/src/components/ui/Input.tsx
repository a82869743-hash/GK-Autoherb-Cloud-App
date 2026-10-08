import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  listOptions?: string[];
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, listOptions, className = '', id, list, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const autoListId = listOptions ? `${inputId}-list` : list;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#5f5e5e] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          list={autoListId}
          className={`w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-[#1c1b1b] text-sm font-normal focus:outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] placeholder:text-gray-400 transition-all duration-150 ${
            error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''
          } ${className}`}
          {...props}
        />
        {listOptions && (
          <datalist id={autoListId}>
            {listOptions.map((opt, idx) => (
              <option key={idx} value={opt} />
            ))}
          </datalist>
        )}
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-[11px] text-[#8f6f6c] mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
