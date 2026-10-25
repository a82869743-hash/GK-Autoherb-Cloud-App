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
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('otp');
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
    <div className="min-h-[100dvh] bg-white lg:bg-[#f3f4f6] lg:flex">
      {/* Hero (top on phones, left half on desktop) */}
      <div className="relative h-[42dvh] min-h-[280px] lg:h-auto lg:min-h-[100dvh] lg:w-1/2 overflow-hidden">
        <img src="/services/gk/foam_wash_premium.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />
        <div className="relative z-10 h-full flex flex-col justify-between p-6 pt-safe text-white">
          <div className="flex items-center gap-2 pt-4">
            <img src="/assets/logo.png" alt="GK AutoHerb" className="h-10 w-10 rounded-xl bg-white p-1" />
            <span className="font-display text-lg font-extrabold">GK AutoHerb</span>
          </div>
          <div className="pb-10 lg:pb-16">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#ff8a80]">Car detailing studio · Vadodara</p>
            <h1 className="font-display text-[32px] lg:text-[44px] font-extrabold leading-[1.05] mt-2">At your time.<br />At your place.</h1>
            <p className="text-sm text-white/75 mt-2 max-w-sm">Book washes, coatings & PPF, track your car live, and earn 10% back on every service.</p>
          </div>
        </div>
      </div>

      {/* Sign-in sheet */}
      <div className="relative -mt-7 lg:mt-0 lg:w-1/2 lg:flex lg:items-center lg:justify-center">
        <div className="bg-white rounded-t-[28px] lg:rounded-3xl lg:shadow-app-lg min-h-[60dvh] lg:min-h-0 w-full lg:max-w-md px-5 pt-6 pb-10 lg:p-8 animate-fade-in-up">
          <h2 className="font-display text-[22px] font-extrabold text-slate-900">Log in or sign up</h2>
          <p className="text-sm text-slate-500 mt-0.5">New here? Your account is created automatically with OTP.</p>

          <div className="flex rounded-2xl bg-slate-100 p-1 mt-5 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`flex-1 h-10 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 font-display ${activeTab === 'otp' ? 'bg-white text-slate-900 shadow-app' : 'text-slate-500'}`}
            >
              <Smartphone size={15} /> Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 h-10 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 font-display ${activeTab === 'password' ? 'bg-white text-slate-900 shadow-app' : 'text-slate-500'}`}
            >
              <Lock size={15} /> Password
            </button>
          </div>

          {/* Demo accounts — local development only, never shown in the live app */}
          {import.meta.env.DEV && activeTab === 'password' && (
            <div className="mb-4 rounded-2xl border border-dashed border-slate-300 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dev quick login</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Admin', m: '9000000001', p: 'admin123' },
                  { label: 'Staff', m: '9876543210', p: 'staff123' },
                  { label: 'Customer', m: '9000000002', p: 'customer123' },
                ].map((d) => (
                  <button key={d.label} type="button" disabled={isPending} onClick={() => handleQuickLogin(d.m, d.p)} className="h-9 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="app-label">Mobile number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] font-semibold">+91</span>
                  <input {...register('mobile')} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" className="app-input pl-14" />
                </div>
                {errors.mobile && <p className="text-xs text-red-600 mt-1">{errors.mobile.message}</p>}
              </div>
              <div>
                <label className="app-label">Password</label>
                <div className="relative">
                  <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Your password" className="app-input pr-16" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                <div className="flex justify-end mt-2">
                  <Link to="/forgot-password" className="text-[13px] text-[#D32F2F] font-bold">Forgot password?</Link>
                </div>
              </div>
              <button type="submit" disabled={isPending} className="app-btn-primary w-full">
                {isPending ? 'Signing in…' : 'Log in'}
              </button>
            </form>
          )}

          {activeTab === 'otp' && (
            <div className="space-y-4">
              {otpStep === 'send' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="app-label">Mobile number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] font-semibold">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        autoFocus
                        placeholder="10-digit mobile"
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="app-input pl-14 text-[17px] tracking-wide"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={isSendingOtp || otpMobile.length !== 10} className="app-btn-primary w-full">
                    {isSendingOtp ? 'Sending code…' : <>Continue <ArrowRight size={17} /></>}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">We'll send a 6-digit code by SMS. By continuing you agree to our terms & privacy policy.</p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-slate-900">Enter the 6-digit code</p>
                      <p className="text-xs text-slate-500">Sent to +91 {otpMobile}</p>
                    </div>
                    <button type="button" onClick={() => setOtpStep('send')} className="text-[13px] text-[#D32F2F] font-bold">Change</button>
                  </div>

                  <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputsRef.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-display font-extrabold rounded-xl border border-slate-200 bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-red-500/15 outline-none"
                      />
                    ))}
                  </div>

                  <input
                    placeholder="Your name (for new customers)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="app-input"
                  />

                  <button type="submit" disabled={isVerifyingOtp || otpDigits.join('').length !== 6} className="app-btn-primary w-full">
                    {isVerifyingOtp ? 'Verifying…' : 'Verify & continue'}
                  </button>

                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-slate-400">Didn't get it?</span>
                    {countdown > 0 ? (
                      <span className="text-slate-500 font-medium">Resend in {countdown}s</span>
                    ) : (
                      <button type="button" onClick={() => handleSendOtp()} className="text-[#D32F2F] font-bold flex items-center gap-1">
                        <RefreshCw size={13} /> Resend code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-[13px] text-slate-500">
            Prefer a password?{' '}
            <Link to="/register" className="text-[#D32F2F] font-bold">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
