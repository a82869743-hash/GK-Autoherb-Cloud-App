import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white shadow-sm shadow-[#D32F2F]/20 hover:shadow-md hover:shadow-[#D32F2F]/30 hover:-translate-y-0.5',
  secondary:
    'bg-[#f0ece9] text-[#1c1b1b] hover:bg-[#e4dfdc] border border-gray-200/60',
  danger:
    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300',
  ghost:
    'bg-transparent text-[#5f5e5e] hover:bg-gray-100/80 hover:text-[#1c1b1b]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
