import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDelivery } from '../../api/hooks/useDeliveries';
import { useAuthStore } from '../../store/authStore';
import io from 'socket.io-client';

export default function TrackingPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { data: delivery, isLoading } = useDelivery(Number(id));
  const [socket, setSocket] = useState<any>(null);
  const [staffLocation, setStaffLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_delivery', { deliveryId: Number(id) });
    });

    newSocket.on('location', (loc) => {
      setStaffLocation({ lat: loc.lat, lng: loc.lng });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [id, token]);

  if (isLoading) return (
    <div className="p-8 text-center text-[#5f5e5e] animate-fade-in">
      <div className="animate-spin w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#D32F2F] mx-auto mb-3" />
      Loading delivery details...
    </div>
  );
  if (!delivery) return <div className="p-8 text-center text-red-500 font-medium">Delivery not found or unauthorized.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-premium">
        {/* Hero header */}
        <div className="hero-bg text-white p-6 text-center relative overflow-hidden pattern-overlay">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 animate-float">
              <svg className="w-6 h-6 text-[#D32F2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black mb-1 tracking-tight">Live Vehicle Delivery</h1>
            <p className="text-white/60 text-sm font-medium">Tracking {delivery.registration_no}</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/40 to-transparent" />
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-[#5f5e5e] mb-1.5">Status</p>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                delivery.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse-dot'
              }`}>
                {delivery.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold tracking-widest text-[#5f5e5e] mb-1.5">Assigned Executive</p>
              <p className="font-bold text-[#1c1b1b]">{delivery.staff_name}</p>
              <a href={`tel:${delivery.staff_mobile}`} className="text-[#D32F2F] text-sm font-medium hover:underline">{delivery.staff_mobile}</a>
            </div>
          </div>

          <div className="bg-[#faf7f5] rounded-xl h-64 md:h-96 w-full flex items-center justify-center relative overflow-hidden border border-gray-100">
            {delivery.status === 'delivered' ? (
              <div className="text-center p-6 animate-scale-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="font-black text-xl text-[#1c1b1b] mb-1">Vehicle Delivered</h3>
                <p className="text-[#5f5e5e] text-sm">Your vehicle was successfully delivered.</p>
              </div>
            ) : staffLocation ? (
              <div className="absolute inset-0">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  style={{border:0}}
                  src={`https://maps.google.com/maps?q=${staffLocation.lat},${staffLocation.lng}&z=15&output=embed`} 
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm z-10 m-4 border border-gray-100">
                <div className="animate-spin w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#D32F2F] mx-auto mb-3"></div>
                <p className="text-sm font-medium text-[#5f5e5e]">Waiting for GPS signal from the executive...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
