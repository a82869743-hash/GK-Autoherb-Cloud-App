import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Clock, Droplets, CheckCircle2, Car, Sparkles, Activity, Shield } from 'lucide-react';
import api from '../../api/axiosInstance';

const WASH_PHASE_LABELS = {
  pre_wash: 'Pre-Wash',
  foam_apply: 'Soap Foam Apply',
  pressure_rinse: 'Pressure Rinse',
  interior_clean: 'Interior Vacuum',
  dry_polish: 'Dry & Polish',
  complete: 'Wash Completed',
};

const PHASE_DETAILS = {
  pre_wash: 'Initial high-pressure water spray to loosen dirt and road grime.',
  foam_apply: 'Applying premium pH-neutral cleaning foam to dissolve remaining dirt.',
  pressure_rinse: 'Thorough rinsing using high-pressure demineralized water.',
  interior_clean: 'Deep interior vacuuming, dashboard cleaning, and sanitizing.',
  dry_polish: 'Microfiber drying and application of tire polish & paint wax.',
  complete: 'Your vehicle has been washed, dried, polished, and is ready for pickup!',
};

const PHASE_ORDER = ['pre_wash', 'foam_apply', 'pressure_rinse', 'interior_clean', 'dry_polish', 'complete'];

export default function JobTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [washData, setWashData] = useState<{
    id: number;
    current_phase: string;
    phase_updated_at: string;
    wash_status: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhase = async () => {
    try {
      const res = await api.get(`/quick-wash/${id}/phase`);
      if (res.data?.success) {
        setWashData(res.data.data);
      } else {
        setError('Failed to fetch tracking data');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Tracking details not found');
    } finally {
      setLoading(false);
    }
  };

  const [jobPhotos, setJobPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchPhase();
      api.get(`/job-carts/${id}/photos`).then(res => {
        if (res.data?.success) setJobPhotos(res.data.data);
      }).catch(() => {});
    }
  }, [id]);

  // Connect to Socket.io for real-time phase updates
  useEffect(() => {
    if (!id) return;

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    // Connect as guest (no token needed, app.js middleware allows it)
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('Socket connected for live tracking');
    });

    socket.on('wash:phase_updated', (data) => {
      if (data && data.bookingId === Number(id)) {
        setWashData(prev => prev ? {
          ...prev,
          current_phase: data.phase,
          phase_updated_at: data.timestamp,
          wash_status: data.phase === 'complete' ? 'completed' : 'washing'
        } : null);
      }
    });

    socket.on('quick_wash_updated', (data) => {
      if (data && data.bookingId === Number(id)) {
        setWashData(prev => prev ? {
          ...prev,
          wash_status: data.wash_status
        } : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#D32F2F] mx-auto mb-4" />
          <p className="text-sm font-semibold text-gray-500">Connecting to GK AutoHerb tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !washData) {
    return (
      <div className="min-h-screen bg-[#faf7f5] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 card-premium">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-[#1c1b1b] mb-2">Tracking Session Expired</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'This vehicle tracking page does not exist or has expired.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-[#D32F2F] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#b71c1c] shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
          >
            Go to Portal Login
          </button>
        </div>
      </div>
    );
  }

  const currentIdx = PHASE_ORDER.indexOf(washData.current_phase || 'pre_wash');
  const isDone = washData.current_phase === 'complete' || washData.wash_status === 'completed';

  return (
    <div className="min-h-screen bg-[#faf7f5] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* GK Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#1c1b1b]">GK AUTOHERB</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Car Studio Management</p>
        </div>

        {/* Live Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 card-premium">
          {/* Top Banner */}
          <div className="bg-gradient-to-br from-[#1c1b1b] to-[#2c2b2b] p-6 text-center text-white relative">
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              Live Tracking
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Car size={24} className="text-[#D32F2F]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Wash Booking #{washData.id}</h2>
            <p className="text-xs text-gray-400 mt-1">
              Updated: {new Date(washData.phase_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Status box */}
            <div className="bg-[#faf7f5] rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#D32F2F] shrink-0 mt-0.5 animate-bounce">
                {isDone ? <CheckCircle2 size={20} /> : <Activity size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Current Status</p>
                <h4 className="font-extrabold text-lg text-[#1c1b1b]">
                  {isDone ? 'Your vehicle is ready! 🎉' : WASH_PHASE_LABELS[washData.current_phase as keyof typeof WASH_PHASE_LABELS] || 'In Queue'}
                </h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {PHASE_DETAILS[washData.current_phase as keyof typeof PHASE_DETAILS] || 'Your vehicle is queued and will begin washing shortly.'}
                </p>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="relative pl-8 space-y-8 before:absolute before:top-2 before:left-3 before:bottom-2 before:w-[2px] before:bg-gray-100">
              {PHASE_ORDER.map((phaseId, pIdx) => {
                const phaseDone = pIdx < currentIdx;
                const phaseCurrent = pIdx === currentIdx;
                const phaseLabel = WASH_PHASE_LABELS[phaseId as keyof typeof WASH_PHASE_LABELS];

                return (
                  <div key={phaseId} className="relative group/step">
                    {/* Circle Pin */}
                    <div className={`absolute top-0.5 -left-8 w-6.5 h-6.5 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                      phaseDone ? 'bg-[#D32F2F] border-[#D32F2F] text-white shadow-glow-red' :
                      phaseCurrent ? 'bg-white border-[#D32F2F] text-[#D32F2F] ring-4 ring-red-50 scale-110' :
                      'bg-white border-gray-200 text-gray-300'
                    }`}>
                      {phaseDone ? (
                        <CheckCircle2 size={12} className="stroke-[3]" />
                      ) : phaseCurrent ? (
                        <Droplets size={12} className="animate-pulse" />
                      ) : (
                        <span className="text-[9px] font-bold">{pIdx + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div>
                      <h4 className={`text-sm font-extrabold transition-colors duration-200 ${
                        phaseCurrent ? 'text-[#D32F2F]' : phaseDone ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        {phaseLabel}
                      </h4>
                      {phaseCurrent && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed animate-fade-in">
                          {PHASE_DETAILS[phaseId as keyof typeof PHASE_DETAILS]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Before & After Photo Gallery */}
        {jobPhotos.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-[#D32F2F]" />
              <span>Vehicle Before & After Inspection Photos</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Before Service</h4>
                <div className="grid grid-cols-2 gap-2">
                  {jobPhotos.filter(p => p.type === 'before').map(p => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 hover:opacity-90 transition shadow-xs">
                      <img src={p.url} alt="Before Service" className="w-full h-32 object-cover" />
                    </a>
                  ))}
                  {jobPhotos.filter(p => p.type === 'before').length === 0 && (
                    <p className="text-xs text-gray-400 italic col-span-2">No before photos uploaded yet</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">After Service</h4>
                <div className="grid grid-cols-2 gap-2">
                  {jobPhotos.filter(p => p.type === 'after').map(p => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 hover:opacity-90 transition shadow-xs">
                      <img src={p.url} alt="After Service" className="w-full h-32 object-cover" />
                    </a>
                  ))}
                  {jobPhotos.filter(p => p.type === 'after').length === 0 && (
                    <p className="text-xs text-gray-400 italic col-span-2">No after photos uploaded yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} GK AutoHerb. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
