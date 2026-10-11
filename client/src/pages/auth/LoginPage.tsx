import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smartphone, Lock, ArrowRight, ShieldCheck, RefreshCw, Sparkles, User, Car } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // ─── OTP Login State ─────────────────────────────────
  const [otpMobile, setOtpMobile] = useState('');
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle standard password login
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

  const handleQuickLogin = async (mobile: string, pass: string) => {
    setActiveTab('password');
    setValue('mobile', mobile);
    setValue('password', pass);
    await onSubmit({ mobile, password: pass });
  };

  // ─── OTP FLOW HANDLERS ────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMobile = otpMobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await api.post('/auth/otp/send', { mobile: cleanMobile, purpose: 'login' });
      toast.success(res.data?.message || 'Verification code sent via SMS');
      setOtpStep('verify');
      setCountdown(res.data?.cooldown_seconds || 45);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send OTP code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleanChar = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);

    // Auto advance
    if (cleanChar && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      toast.error('Please enter complete 6-digit verification code');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const res = await api.post('/auth/otp/verify', {
        mobile: otpMobile,
        otp: fullOtp,
        name: customerName,
        vehicle_brand: vehicleBrand,
        vehicle_model: vehicleModel,
        vehicle_number: vehicleNumber,
      });

      const result = res.data?.data;
      if (result && result.token) {
        login(result.token, result.user);
        toast.success(result.is_new_customer
          ? `Welcome to GK AutoHerb, ${result.user.name}!`
          : `Welcome back, ${result.user.name}!`
        );
        navigate('/customer');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Verification failed. Please check code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f5] flex">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#111111] relative overflow-hidden items-center justify-center pattern-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D32F2F]/15 via-transparent to-[#D32F2F]/5 animate-gradient-shift" />
        <div className="relative z-10 px-16 max-w-md">
          <div className="mb-6">
            <img src="/assets/logo.png" alt="GK Auto Herb" className="w-48 h-auto drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
            GK AutoHerb
          </h1>
          <div className="w-12 h-1 bg-gradient-to-r from-[#D32F2F] to-[#FF5252] mt-4 mb-4 rounded-full" />
          <p className="text-gray-400 text-sm leading-relaxed font-normal">
            Premium car detailing studio management. Track jobs, manage inventory,
            book appointments, and delight customers — all from one command center.
          </p>
          <div className="mt-8 space-y-2.5">
            {['SMS OTP Instant Customer Access', 'Automated Service & Wash Reminders', 'Live Delivery & Job Tracking'].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 opacity-0 animate-fade-in-up" style={{ animationDelay: `${0.5 + i * 0.15}s`, animationFillMode: 'forwards' }}>
                <div className="w-7 h-7 rounded-full bg-[#D32F2F]/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={14} className="text-[#D32F2F]" />
                </div>
                <span className="text-gray-300 text-xs font-medium">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-8 font-medium">
            Gotri - Vasna - Bhayli Road, Vadodara, Gujarat
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/50 to-transparent" />
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile brand header */}
          <div className="lg:hidden text-center mb-6">
            <img src="/assets/logo.png" alt="GK Auto Herb" className="w-32 h-auto mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-[#1c1b1b] tracking-tight">GK AutoHerb</h1>
            <div className="w-10 h-0.5 bg-[#D32F2F] mx-auto mt-2 rounded-full" />
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D32F2F] mb-1">
              Welcome Back
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1c1b1b] tracking-tight">
              Sign In to GK AutoHerb
            </h2>
            <p className="text-xs text-[#5f5e5e] mt-0.5 font-normal">
              Access your studio garage, appointments, and membership perks
            </p>
          </div>

          {/* Tab Selector: Password vs OTP Login */}
          <div className="flex rounded-xl bg-slate-200/70 p-1 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock size={13} />
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'otp'
                  ? 'bg-white text-[#D32F2F] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone size={13} />
              Login with SMS OTP
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-red-100 text-[#D32F2F] rounded">New</span>
            </button>
          </div>

          {/* Quick Demo Login Switcher (visible for password tab) */}
          {activeTab === 'password' && (
            <div className="mb-5 p-3 bg-white/90 backdrop-blur rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5f5e5e] flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ⚡ 1-Click Quick Demo Login
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Auto-fill</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin('9000000001', 'admin123')}
                  className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100/80 border border-red-200/80 text-[#D32F2F] transition-all flex flex-col items-center justify-center text-center active:scale-95 disabled:opacity-50"
                >
                  <span className="text-xs font-bold">Admin</span>
                  <span className="text-[9px] text-gray-600 font-mono">9000000001</span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin('9876543210', 'staff123')}
                  className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 text-blue-700 transition-all flex flex-col items-center justify-center text-center active:scale-95 disabled:opacity-50"
                >
                  <span className="text-xs font-bold">Staff</span>
                  <span className="text-[9px] text-gray-600 font-mono">9876543210</span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickLogin('9000000002', 'customer123')}
                  className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-700 transition-all flex flex-col items-center justify-center text-center active:scale-95 disabled:opacity-50"
                >
                  <span className="text-xs font-bold">Customer</span>
                  <span className="text-[9px] text-gray-600 font-mono">9000000002</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 1: PASSWORD LOGIN FORM ─────────────────── */}
          {activeTab === 'password' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    +91
                  </span>
                  <input
                    {...register('mobile')}
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile"
                    className="w-full h-10 pl-12 pr-4 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                  />
                </div>
                {errors.mobile && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.mobile.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    className="w-full h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.password.message}</p>
                )}
                <div className="flex justify-end mt-1.5">
                  <Link to="/forgot-password" className="text-xs text-[#D32F2F] font-bold hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.99] transition-all uppercase tracking-wider"
              >
                {isPending ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ─── TAB 2: SMS OTP LOGIN FORM ──────────────────── */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              {otpStep === 'send' ? (
                // Step 1: Request OTP
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Customer Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        autoFocus
                        placeholder="Enter 10-digit mobile"
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full h-10 pl-12 pr-4 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      We'll send a 6-digit one-time code to this number. New customers will be registered automatically!
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp || otpMobile.length !== 10}
                    className="w-full h-10 bg-[#D32F2F] hover:bg-[#b71c1c] disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    {isSendingOtp ? 'Sending Code...' : (
                      <>
                        <span>Get Verification Code</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Step 2: 6-Digit OTP Verification
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Enter Verification Code</p>
                      <p className="text-[11px] text-slate-500">Sent to +91 {otpMobile}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpStep('send')}
                      className="text-xs text-[#D32F2F] font-semibold hover:underline"
                    >
                      Change Number
                    </button>
                  </div>

                  {/* 6 Box OTP Input */}
                  <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputsRef.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 sm:w-12 h-12 text-center text-base font-mono font-bold rounded-lg border border-slate-200 bg-white focus:border-[#D32F2F] focus:ring-1 focus:ring-red-500/20 transition-all text-slate-900"
                      />
                    ))}
                  </div>

                  {/* Optional New Customer Details (Collapsed unless desired) */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      New Customer Profile (Optional):
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="col-span-2">
                        <input
                          placeholder="Your Full Name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <input
                          placeholder="Vehicle Brand (e.g. Hyundai)"
                          value={vehicleBrand}
                          onChange={(e) => setVehicleBrand(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <input
                          placeholder="Registration (e.g. GJ06AB1234)"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                    className="w-full h-10 bg-[#D32F2F] hover:bg-[#b71c1c] disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.99] transition-all uppercase tracking-wider"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify & Enter Garage'}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Didn't receive code?</span>
                    {countdown > 0 ? (
                      <span className="text-slate-500 font-mono font-medium">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-[#D32F2F] font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#5f5e5e] font-medium">
              Want to set a permanent password?{' '}
              <Link to="/register" className="text-[#D32F2F] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              GK AutoHerb Detailing Studio · Vadodara, Gujarat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
