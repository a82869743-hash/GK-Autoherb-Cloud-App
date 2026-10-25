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
          <label htmlFor={inputId} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          list={autoListId}
          className={`w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-[15px] sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-red-500/15 focus:border-[#D32F2F] placeholder:text-gray-400 transition-all duration-150 ${
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
