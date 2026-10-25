import { useState } from 'react';
import { Plus, Trash2, Upload, Loader2, ShieldCheck } from 'lucide-react';
import { useProductBrands, useSaveProductBrand, useDeleteProductBrand, ProductBrand } from '../../api/hooks/useServiceExtras';
import { BrandCard } from '../customer/ServiceMediaShowcase';
import { BottomSheet } from '../customer/ui';
import { useUIStore } from '../../store/uiStore';

const EMPTY = { name: '', tagline: '', warranty_note: '', applies_to: 'both' as ProductBrand['applies_to'], is_active: 1, sort_order: 0 };

/** Admin: PPF / ceramic brands shown on the customer app. */
export default function ProductBrandsManager() {
  const toast = useUIStore((s) => s.toast);
  const { data: brands = [] } = useProductBrands(undefined, true);
  const save = useSaveProductBrand();
  const del = useDeleteProductBrand();
  const [edit, setEdit] = useState<(Partial<ProductBrand> & { file?: File }) | null>(null);

  const submit = async () => {
    if (!edit?.name?.trim()) return toast('error', 'Brand name is required');
    try {
      await save.mutateAsync({
        id: edit.id,
        name: edit.name,
        tagline: edit.tagline || '',
        warranty_note: edit.warranty_note || '',
        applies_to: edit.applies_to,
        is_active: edit.is_active,
        sort_order: edit.sort_order,
        file: edit.file,
      } as any);
      toast('success', 'Brand saved');
      setEdit(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save — logo upload needs Cloudinary keys on the server');
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-[17px] font-extrabold text-slate-900 flex items-center gap-2"><ShieldCheck size={18} className="text-[#D32F2F]" /> PPF & ceramic brands</h2>
          <p className="text-[12.5px] text-slate-500">Shown on the customer home screen and on PPF / ceramic services.</p>
        </div>
        <button onClick={() => setEdit({ ...EMPTY })} className="app-chip app-chip-on shrink-0"><Plus size={15} /> Add</button>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <button key={b.id} onClick={() => setEdit({ ...b })} className={`text-left ${b.is_active ? '' : 'opacity-50'}`}>
            <BrandCard brand={b} />
          </button>
        ))}
      </div>

      <BottomSheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit brand' : 'Add brand'}
        footer={
          <div className="flex gap-2">
            {edit?.id && (
              <button
                onClick={async () => {
                  if (!confirm(`Remove ${edit.name}?`)) return;
                  await del.mutateAsync(edit.id!);
                  setEdit(null);
                }}
                className="app-btn h-12 px-4 bg-red-50 text-[#D32F2F]"
                aria-label="Delete brand"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={submit} disabled={save.isPending} className="app-btn-primary flex-1">
              {save.isPending && <Loader2 size={17} className="animate-spin" />} Save brand
            </button>
          </div>
        }
      >
        {edit && (
          <div className="space-y-3">
            <div>
              <label className="app-label">Name *</label>
              <input className="app-input" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Garware" />
            </div>
            <div>
              <label className="app-label">Used for</label>
              <div className="grid grid-cols-3 gap-2">
                {(['ppf', 'ceramic', 'both'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setEdit({ ...edit, applies_to: k })} className={`app-chip justify-center ${edit.applies_to === k ? 'app-chip-on' : 'app-chip-off'}`}>
                    {k === 'ppf' ? 'PPF' : k === 'ceramic' ? 'Ceramic' : 'Both'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="app-label">Short line</label>
              <input className="app-input" value={edit.tagline || ''} onChange={(e) => setEdit({ ...edit, tagline: e.target.value })} placeholder="Made-in-India paint protection film" />
            </div>
            <div>
              <label className="app-label">Warranty note (optional)</label>
              <input className="app-input" value={edit.warranty_note || ''} onChange={(e) => setEdit({ ...edit, warranty_note: e.target.value })} placeholder="Up to 5-year warranty" />
            </div>
            <div className="flex items-center gap-3">
              <label className="app-btn h-11 px-4 bg-slate-100 text-slate-800 cursor-pointer">
                <Upload size={16} /> {edit.file ? edit.file.name.slice(0, 18) : edit.logo_url ? 'Change logo' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setEdit({ ...edit, file: e.target.files?.[0] })} />
              </label>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-[#D32F2F]" checked={!!edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked ? 1 : 0 })} />
                Show to customers
              </label>
            </div>
            <p className="text-[12px] text-slate-500">Without a logo, the brand name is shown as a clean black badge.</p>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
