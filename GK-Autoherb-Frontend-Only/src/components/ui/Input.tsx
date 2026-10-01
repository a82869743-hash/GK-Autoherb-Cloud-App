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
          <label htmlFor={inputId} className="block text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          list={autoListId}
          className={`w-full px-4 py-3 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 focus:shadow-sm placeholder:text-[#8f6f6c]/60 transition-all duration-200 text-base md:text-sm ${
            error ? 'ring-2 ring-red-400 border-red-400' : ''
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
        {error && <p className="text-[11px] text-red-600 mt-1.5 font-medium">{error}</p>}
        {hint && !error && <p className="text-[11px] text-[#8f6f6c] mt-1.5">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
