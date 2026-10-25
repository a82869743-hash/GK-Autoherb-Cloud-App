import { useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Service photo, or a branded tile when the service has no photo yet —
 * never another service's photo, so no two services ever look the same.
 */
export default function ServiceImage({ service, className = '' }: { service: any; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (service?.image_url && !failed) {
    return <img src={service.image_url} alt={service.name} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#1b1b1b] via-[#2a0d0d] to-[#8e0e0e] flex items-center justify-center ${className}`}>
      <Sparkles className="text-white/20 absolute -right-2 -bottom-2" size={64} />
      <span className="relative font-display text-white/90 font-extrabold text-center leading-tight px-2 text-[13px]">{service?.name}</span>
    </div>
  );
}
