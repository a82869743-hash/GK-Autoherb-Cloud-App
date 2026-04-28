import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../../api/hooks/useSettings';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useUIStore } from '../../store/uiStore';

export default function SettingsPage() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useSettings();
  const updateMut = useUpdateSettings();

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.data) {
      setForm(data.data);
    }
  }, [data]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync(form);
      toast('success', 'Settings updated successfully');
    } catch {
      toast('error', 'Failed to update settings');
    }
  };

  if (isLoading) {
    return <div className="p-8"><SkeletonCard/><SkeletonCard/></div>;
  }

  return (
    <>
      <AdminTopBar title="System Settings" subtitle="Configure studio details and operational defaults" />

      <div className="max-w-4xl">
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-orange-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-orange-800 text-sm">System Wide Impact</h4>
            <p className="text-xs text-orange-700 mt-1">
              Changes made here will affect invoice generation, messaging variables, and studio details across the platform.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Studio Info Section */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#D32F2F] border-b border-gray-100 pb-2">
              <Settings size={20} />
              <h2 className="font-bold text-lg text-[#1c1b1b]">Studio Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Studio Name" value={form.studio_name || ''} onChange={e => handleChange('studio_name', e.target.value)} />
              <Input label="GST Number" value={form.studio_gst || ''} onChange={e => handleChange('studio_gst', e.target.value)} />
              <Input label="Contact Number" value={form.studio_mobile || ''} onChange={e => handleChange('studio_mobile', e.target.value)} />
              <Input label="Support Email" type="email" value={form.studio_email || ''} onChange={e => handleChange('studio_email', e.target.value)} />
              <div className="col-span-full">
                <Input label="Studio Address" value={form.studio_address || ''} onChange={e => handleChange('studio_address', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Operational Defaults Section */}
          <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#D32F2F] border-b border-gray-100 pb-2">
              <Settings size={20} />
              <h2 className="font-bold text-lg text-[#1c1b1b]">Operational Defaults</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Invoice Prefix" value={form.invoice_prefix || ''} onChange={e => handleChange('invoice_prefix', e.target.value)} placeholder="e.g. GKA" />
              <Input label="Next Invoice Number" type="number" value={form.invoice_counter || ''} onChange={e => handleChange('invoice_counter', e.target.value)} />
              <Input label="Advance Booking Days Allowed" type="number" value={form.booking_advance_days || ''} onChange={e => handleChange('booking_advance_days', e.target.value)} />
              <Input label="Low Stock Threshold (Units)" type="number" value={form.low_stock_threshold || ''} onChange={e => handleChange('low_stock_threshold', e.target.value)} />
              <Input label="Admin WhatsApp (for system alerts)" value={form.admin_whatsapp || ''} onChange={e => handleChange('admin_whatsapp', e.target.value)} placeholder="Include country code, e.g. 919876543210" />
            </div>
          </section>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleSave} loading={updateMut.isPending} icon={<Save size={18} />}>
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
