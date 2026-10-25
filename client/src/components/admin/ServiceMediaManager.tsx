import { useState } from 'react';
import { Camera, PlayCircle, Upload, Link2, Trash2, Loader2 } from 'lucide-react';
import { useServiceMedia, useUploadServiceMedia, useDeleteServiceMedia, MediaRole } from '../../api/hooks/useServiceExtras';
import { useUIStore } from '../../store/uiStore';

const SLOTS: { role: MediaRole; label: string; accept: string; video?: boolean }[] = [
  { role: 'before', label: 'Before photo', accept: 'image/*' },
  { role: 'after', label: 'After photo', accept: 'image/*' },
  { role: 'process', label: 'Process video', accept: 'video/*', video: true },
];

/** Admin: the three media slots customers see on a service (before, after, process video). */
export default function ServiceMediaManager({ serviceId }: { serviceId: number }) {
  const toast = useUIStore((s) => s.toast);
  const { data: media = [], isLoading } = useServiceMedia(serviceId);
  const upload = useUploadServiceMedia();
  const remove = useDeleteServiceMedia();
  const [busy, setBusy] = useState<MediaRole | null>(null);
  const [linkFor, setLinkFor] = useState<MediaRole | null>(null);
  const [link, setLink] = useState('');

  const send = async (role: MediaRole, file?: File, url?: string) => {
    setBusy(role);
    try {
      // one item per slot: replace what is there
      const old = media.filter((m) => m.media_role === role);
      await upload.mutateAsync({ serviceId, role, file, url });
      for (const m of old) await remove.mutateAsync({ serviceId, mediaId: m.id });
      toast('success', 'Saved — customers see it on this service');
      setLinkFor(null);
      setLink('');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Upload failed — check that Cloudinary keys are set on the server, or paste a link instead');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-50 p-3.5 space-y-3">
      <div>
        <p className="font-display text-[14px] font-extrabold text-slate-900">Before / after & process video</p>
        <p className="text-[12px] text-slate-500">Shown to customers on this service. Leave empty until you have them.</p>
      </div>
      {isLoading ? (
        <p className="text-[12px] text-slate-400">Loading…</p>
      ) : (
        SLOTS.map((slot) => {
          const item = media.find((m) => (slot.video ? m.media_role === 'process' : m.media_role === slot.role));
          const src = item?.url || item?.external_url || '';
          return (
            <div key={slot.role} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
              <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                {src && !slot.video ? (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                ) : slot.video ? (
                  <PlayCircle size={22} className={src ? 'text-[#D32F2F]' : ''} />
                ) : (
                  <Camera size={20} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900">{slot.label}</p>
                <p className="text-[11.5px] text-slate-500 truncate">{src ? 'Added' : 'Empty'}</p>
                {linkFor === slot.role && (
                  <div className="mt-1.5 flex gap-1.5">
                    <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={slot.video ? 'YouTube or video link' : 'Image link'} className="app-input h-9 text-[13px]" />
                    <button type="button" disabled={!link.trim() || busy === slot.role} onClick={() => send(slot.role, undefined, link.trim())} className="app-btn h-9 px-3 bg-[#111] text-white text-[12px]">Save</button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {busy === slot.role ? (
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <label className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer" title="Upload file">
                      <Upload size={15} />
                      <input
                        type="file"
                        accept={slot.accept}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) send(slot.role, f);
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => setLinkFor(linkFor === slot.role ? null : slot.role)} className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center" title="Paste a link">
                      <Link2 size={15} />
                    </button>
                    {item && (
                      <button
                        type="button"
                        onClick={async () => {
                          await remove.mutateAsync({ serviceId, mediaId: item.id });
                          toast('success', 'Removed');
                        }}
                        className="h-9 w-9 rounded-full bg-red-50 text-[#D32F2F] flex items-center justify-center"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
