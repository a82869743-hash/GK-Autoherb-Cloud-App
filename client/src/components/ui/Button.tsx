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
    'bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white shadow-lg shadow-[#D32F2F]/20 hover:shadow-xl hover:shadow-[#D32F2F]/30 hover:-translate-y-0.5',
  secondary:
    'bg-[#e5e2e1] text-[#1c1b1b] hover:bg-[#dcd9d9] border border-transparent hover:border-gray-300',
  danger:
    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300',
  ghost:
    'bg-transparent text-[#5f5e5e] hover:bg-gray-100 hover:text-[#1c1b1b] relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[2px] after:bg-[#D32F2F] hover:after:w-3/4 after:transition-all after:duration-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-bold rounded uppercase tracking-wider transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
