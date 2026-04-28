import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  mobile: z.string().regex(/^[0-9]{10}$/, 'Enter valid 10-digit mobile number'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsPending(true);
      const response = await api.post('/auth/login', {
        mobile: data.mobile,
        password: data.password,
      });

      const result = response.data.data || response.data;


      login(result.token, result.user);

      toast.success(`Welcome back, ${result.user?.name || 'User'}!`);
      const redirects: Record<string, string> = {
        admin: '/admin',
        customer: '/customer',
        staff: '/staff/job-carts',
      };
      navigate(redirects[result.user?.role] || '/');
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Invalid credentials';
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f5] flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex w-1/2 bg-[#111111] relative overflow-hidden items-center justify-center pattern-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D32F2F]/15 via-transparent to-[#D32F2F]/5 animate-gradient-shift" />
        <div className="relative z-10 px-16 max-w-md">
          <div className="mb-6">
            <img src="/assets/logo.png" alt="GK Auto Herb" className="w-48 h-auto drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            GK AutoHerb
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-[#D32F2F] to-[#FF5252] mt-6 mb-6 rounded-full" />
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            Premium car detailing studio management. Track jobs, manage inventory,
            book appointments, and delight customers — all from one command center.
          </p>
          <div className="mt-10 space-y-3">
            {['Track jobs & invoices in real-time', 'Manage inventory & staff efficiently', 'Delight customers with premium service'].map((item, i) => (
              <div key={i} className="flex items-center gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: `${0.5 + i * 0.15}s`, animationFillMode: 'forwards' }}>
                <div className="w-8 h-8 rounded-full bg-[#D32F2F]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#D32F2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-10 font-bold">
            Vadodara, Gujarat
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/50 to-transparent" />
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full border border-white/5 animate-float" />
        <div className="absolute bottom-20 right-20 w-24 h-24 rounded-full border border-[#D32F2F]/10" />
        <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-[#D32F2F]/30 animate-pulse-glow" />
      </div>

      {/* Right — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile brand header */}
          <div className="lg:hidden text-center mb-10">
            <img src="/assets/logo.png" alt="GK Auto Herb" className="w-36 h-auto mx-auto mb-3" />
            <h1 className="text-3xl font-black text-[#1c1b1b] tracking-tight">GK AutoHerb</h1>
            <div className="w-12 h-1 bg-[#D32F2F] mx-auto mt-3 rounded-full" />
          </div>

          <div className="mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D32F2F] mb-2">
              Welcome Back
            </p>
            <h2 className="text-3xl font-extrabold text-[#1c1b1b] tracking-tight">
              Sign In
            </h2>
            <p className="text-sm text-[#5f5e5e] mt-2 font-medium">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Mobile Number */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f5e5e] text-sm font-semibold">
                  +91
                </span>
                <input
                  {...register('mobile')}
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile"
                  className={`w-full pl-14 pr-4 py-4 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 placeholder:text-[#8f6f6c]/60 transition-all duration-200 ${
                    errors.mobile ? 'ring-2 ring-red-400 border-red-400' : ''
                  }`}
                  autoComplete="tel"
                />
              </div>
              {errors.mobile && (
                <p className="text-[11px] text-red-600 mt-1.5 font-medium">{errors.mobile.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  className={`w-full px-4 py-4 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 placeholder:text-[#8f6f6c]/60 transition-all duration-200 pr-12 ${
                    errors.password ? 'ring-2 ring-red-400 border-red-400' : ''
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f5e5e] hover:text-[#1c1b1b] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.462 6.462M9.878 9.878l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-600 mt-1.5 font-medium">{errors.password.message}</p>
              )}
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-[#D32F2F] font-bold hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white font-bold rounded-lg shadow-lg shadow-[#D32F2F]/20 hover:shadow-xl hover:shadow-[#D32F2F]/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 uppercase tracking-wider text-sm"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#5f5e5e] font-medium">
              New customer?{' '}
              <Link to="/register" className="text-[#D32F2F] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[10px] text-[#5f5e5e] font-medium">
              GK AutoHerb v1.0 · Vadodara, Gujarat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
