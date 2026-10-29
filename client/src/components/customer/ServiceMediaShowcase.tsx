import { useEffect, useRef, useState } from 'react';
import { Camera, PlayCircle, ShieldCheck } from 'lucide-react';
import { useServiceMedia, useProductBrands, coatingKind, ProductBrand } from '../../api/hooks/useServiceExtras';

/** Draggable before/after comparison. */
export function BeforeAfterSlider({ before, after, className = 'h-52 rounded-2xl' }: { before: string; after: string; className?: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-slate-100 select-none touch-pan-y ${className}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white shadow-app-lg flex items-center justify-center text-[11px] font-bold text-slate-700">⇆</span>
      </div>
      <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">Before</span>
      <span className="absolute right-2.5 top-2.5 rounded-full bg-[#D32F2F] px-2.5 py-1 text-[11px] font-bold text-white">After</span>
    </div>
  );
}

export type MediaPreview = { before: string | null; after: string | null; video: string | null; poster: string | null };

/** Video that plays (muted, looping) only while on screen — saves data and battery on long lists. */
function InViewVideo({ src, poster }: { src: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} src={src} poster={poster || undefined} muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />;
}

/** Top of a service card: process video and a before/after slider, with a small switch between them. */
export function ServiceCardShowcase({ media, onOpen }: { media: MediaPreview; onOpen?: () => void }) {
  const hasPair = !!(media.before && media.after);
  const hasVideo = !!media.video && !embedUrl(media.video);
  const [tab, setTab] = useState<'video' | 'compare'>(hasVideo ? 'video' : 'compare');
  if (!hasPair && !hasVideo) return null;
  return (
    <div className="relative h-48 overflow-hidden rounded-xl bg-black">
      {tab === 'video' && hasVideo ? (
        <button type="button" onClick={onOpen} className="absolute inset-0" aria-label="See the process">
          <InViewVideo src={media.video!} poster={media.poster} />
          <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute left-3 bottom-2.5 flex items-center gap-1.5 text-[12px] font-bold text-white">
            <PlayCircle size={15} /> See the process
          </span>
        </button>
      ) : (
        <BeforeAfterSlider before={media.before!} after={media.after!} className="h-full" />
      )}
      {hasPair && hasVideo && (
        <div className="absolute right-2.5 bottom-2.5 flex rounded-full bg-black/55 p-0.5 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          {(['video', 'compare'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`h-7 rounded-full px-3 text-[11.5px] font-bold transition-colors ${tab === k ? 'bg-white text-slate-900' : 'text-white/85'}`}>
              {k === 'video' ? 'Video' : 'Before / After'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
      <span className="text-slate-300">{icon}</span>
      <span className="text-[12.5px] font-semibold text-slate-400">{text}</span>
    </div>
  );
}

function embedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
}

/** Before/after photos + process video for a service (empty slots until the studio uploads them). */
export function ServiceMediaShowcase({ serviceId }: { serviceId: number }) {
  const { data: media = [] } = useServiceMedia(serviceId);
  const before = media.find((m) => m.media_role === 'before' && m.media_type === 'image');
  const after = media.find((m) => m.media_role === 'after' && m.media_type === 'image');
  const video = media.find((m) => m.media_role === 'process' || m.media_type === 'video');
  const videoSrc = video?.url || video?.external_url || '';
  const yt = videoSrc ? embedUrl(videoSrc) : null;

  return (
    <>
      <div>
        <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
          <Camera size={16} className="text-[#D32F2F]" /> Before & after
        </h4>
        {before && after ? (
          <BeforeAfterSlider before={before.url} after={after.url} />
        ) : before || after ? (
          <div className="grid grid-cols-2 gap-2">
            {[before, after].map((m, i) =>
              m ? (
                <div key={i} className="relative h-36 overflow-hidden rounded-2xl">
                  <img src={m.url} alt={i ? 'After' : 'Before'} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">{i ? 'After' : 'Before'}</span>
                </div>
              ) : (
                <Placeholder key={i} icon={<Camera size={22} />} text={i ? 'After photo soon' : 'Before photo soon'} />
              )
            )}
          </div>
        ) : (
          <Placeholder icon={<Camera size={24} />} text="Before & after photos coming soon" />
        )}
      </div>

      <div>
        <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
          <PlayCircle size={16} className="text-[#D32F2F]" /> See the process
        </h4>
        {videoSrc ? (
          yt ? (
            <iframe src={yt} title="Process video" className="aspect-video w-full rounded-2xl" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <video src={videoSrc} poster={video?.thumbnail_url || undefined} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black object-cover" />
          )
        ) : (
          <Placeholder icon={<PlayCircle size={24} />} text="Process video coming soon" />
        )}
      </div>
    </>
  );
}

/** A brand card: uploaded logo, or a clean wordmark until a logo is added. */
export function BrandCard({ brand, compact = false }: { brand: ProductBrand; compact?: boolean }) {
  return (
    <div className={`app-card flex items-center gap-3 ${compact ? 'p-3' : 'p-3.5'}`}>
      <span className={`${compact ? 'h-11 w-16' : 'h-12 w-20'} shrink-0 rounded-xl bg-[#111] flex items-center justify-center overflow-hidden`}>
        {brand.logo_url ? (
          <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-contain bg-white p-1.5" />
        ) : (
          <span className="font-display text-[13px] font-black uppercase tracking-wider text-white">{brand.name}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="font-display text-[15px] font-extrabold text-slate-900 truncate">{brand.name}</span>
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#D32F2F]">
            {brand.applies_to === 'both' ? 'PPF & Ceramic' : brand.applies_to === 'ppf' ? 'PPF' : 'Ceramic'}
          </span>
        </span>
        {brand.tagline && <span className="block text-[12.5px] text-slate-500 truncate">{brand.tagline}</span>}
        {brand.warranty_note && (
          <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700">
            <ShieldCheck size={12} /> {brand.warranty_note}
          </span>
        )}
      </span>
    </div>
  );
}

/** "Brands we use" block for a PPF / ceramic service. Renders nothing for other services. */
export function ServiceBrands({ service }: { service: any }) {
  const kind = coatingKind(service);
  const { data: brands = [] } = useProductBrands(kind || undefined);
  if (!kind || !brands.length) return null;
  return (
    <div>
      <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#D32F2F]" /> {kind === 'ppf' ? 'PPF brands we use' : 'Coating brands we use'}
      </h4>
      <div className="space-y-2">
        {brands.map((b) => <BrandCard key={b.id} brand={b} compact />)}
      </div>
    </div>
  );
}
