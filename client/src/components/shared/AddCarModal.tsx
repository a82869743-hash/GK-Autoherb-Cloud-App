import { useState } from 'react';
import { X, Car, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { carBrands, getModelsForBrand } from '../../utils/carData';
import api from '../../api/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCarModal({ isOpen, onClose }: AddCarModalProps) {
  const queryClient = useQueryClient();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [isPending, setIsPending] = useState(false);

  const models = brand ? getModelsForBrand(brand) : [];
  const isOtherBrand = brand === 'Others';
  const isOtherModel = model === 'Other';

  const finalBrand = isOtherBrand ? customBrand : brand;
  const finalModel = isOtherModel ? customModel : model;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalBrand || !finalModel) {
      toast.error('Please select brand and model');
      return;
    }
    try {
      setIsPending(true);
      await api.post('/vehicles/add', {
        brand: finalBrand,
        model: finalModel,
        registration_no: regNo || undefined,
      });
      toast.success('Car added successfully!');
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add car');
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setBrand(''); setModel(''); setCustomBrand(''); setCustomModel(''); setRegNo('');
  };

  if (!isOpen) return null;

  const selectCls = 'w-full px-4 py-3.5 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 transition-all duration-200 appearance-none cursor-pointer';
  const inputCls = 'w-full px-4 py-3.5 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 placeholder:text-[#8f6f6c]/60 transition-all duration-200';
  const labelCls = 'block text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D32F2F] to-[#af101a] flex items-center justify-center text-white">
              <Car size={16} />
            </div>
            <h3 className="font-bold text-[#1c1b1b]">Add New Car</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Brand Dropdown */}
          <div>
            <label className={labelCls}>Car Brand</label>
            <div className="relative">
              <select value={brand} onChange={(e) => { setBrand(e.target.value); setModel(''); setCustomBrand(''); setCustomModel(''); }} className={selectCls}>
                <option value="">Select brand...</option>
                {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Custom brand input */}
          {isOtherBrand && (
            <div>
              <label className={labelCls}>Enter Brand Name</label>
              <input type="text" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="e.g. Porsche" className={inputCls} autoFocus />
            </div>
          )}

          {/* Model Dropdown */}
          {brand && !isOtherBrand && (
            <div>
              <label className={labelCls}>Car Model</label>
              <div className="relative">
                <select value={model} onChange={(e) => { setModel(e.target.value); setCustomModel(''); }} className={selectCls}>
                  <option value="">Select model...</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Custom model input (when "Other" model selected or brand is Others) */}
          {(isOtherModel || isOtherBrand) && (
            <div>
              <label className={labelCls}>{isOtherBrand ? 'Enter Model Name' : 'Enter Model Name'}</label>
              <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="e.g. Cayenne" className={inputCls} />
            </div>
          )}

          {/* Registration Number (optional) */}
          <div>
            <label className={labelCls}>Registration No. <span className="text-[#8f6f6c]/60 normal-case tracking-normal">(optional)</span></label>
            <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="e.g. GJ06AB1234" className={inputCls} />
          </div>

          {/* Submit */}
          <button type="submit" disabled={isPending || !finalBrand || !finalModel} className="w-full py-3.5 bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white font-bold rounded-lg shadow-lg shadow-[#D32F2F]/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 uppercase tracking-wider text-sm">
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Adding...
              </span>
            ) : 'Add Car'}
          </button>
        </form>
      </div>
    </div>
  );
}
