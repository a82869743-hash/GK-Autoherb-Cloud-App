import { useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { fileToResizedDataUrl, useUploadProfilePhoto } from '../../api/hooks/useCustomerApp';
import { useUIStore } from '../../store/uiStore';

export default function Avatar({ name, photo, size = 76, editable = false }: { name?: string; photo?: string | null; size?: number; editable?: boolean }) {
  const toast = useUIStore((s) => s.toast);
  const upload = useUploadProfilePhoto();
  const input = useRef<HTMLInputElement>(null);
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('error', 'Please choose an image');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      await upload.mutateAsync(dataUrl);
      toast('success', 'Profile photo updated');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || err.message || 'Upload failed');
    }
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full rounded-full object-cover ring-4 ring-white shadow-app" />
      ) : (
        <div className="h-full w-full rounded-full bg-gradient-to-br from-[#e53935] to-[#7f0000] text-white font-display font-extrabold flex items-center justify-center ring-4 ring-white shadow-app" style={{ fontSize: size * 0.42 }}>
          {initial}
        </div>
      )}
      {editable && (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-full bg-[#111] text-white flex items-center justify-center ring-2 ring-white"
            aria-label="Change profile photo"
          >
            {upload.isPending ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </>
      )}
    </div>
  );
}
