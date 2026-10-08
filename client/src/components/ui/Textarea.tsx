import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-[#5f5e5e] mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={3}
          className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[#1c1b1b] font-normal text-sm focus:outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] placeholder:text-gray-400 transition-all resize-none ${
            error ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
