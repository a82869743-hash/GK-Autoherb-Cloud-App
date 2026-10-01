import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Users, Box, AlertCircle, CheckCircle2, FileUp, Sparkles } from 'lucide-react';
import { useImportCustomers, useImportInventory } from '../../api/hooks/useImport';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import { useUIStore } from '../../store/uiStore';

export default function ImportPage() {
  const toast = useUIStore((s) => s.toast);
  const custMut = useImportCustomers();
  const invMut = useImportInventory();
  
  const [activeTab, setActiveTab] = useState<'customers' | 'inventory'>('customers');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast('error', 'Please select a spreadsheet file first.');
      return;
    }
    
    try {
      if (activeTab === 'customers') {
        const res = await custMut.mutateAsync(file);
        setUploadResult(res.data);
        toast('success', 'Customer batch imported successfully');
      } else {
        const res = await invMut.mutateAsync(file);
        setUploadResult(res.data);
        toast('success', 'Inventory catalog imported successfully');
      }
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Import pipeline encountered an issue');
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1200px] mx-auto">
      <AdminHeaderBar
        title="Bulk Data Pipeline"
        subtitle="Batch import customer databases or warehouse chemicals from XLSX / CSV sheets"
        badge="ETL Pipeline"
      />

      {/* Target Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => { setActiveTab('customers'); setFile(null); setUploadResult(null); }}
          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
            activeTab === 'customers'
              ? 'border-[#D32F2F] bg-red-50/50 shadow-md shadow-red-600/10'
              : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
            activeTab === 'customers' ? 'bg-[#D32F2F] text-white shadow-md shadow-red-600/20' : 'bg-slate-100 text-slate-400'
          }`}>
            <Users size={26} />
          </div>
          <div>
            <h3 className={`font-extrabold text-base ${activeTab === 'customers' ? 'text-slate-900' : 'text-slate-600'}`}>
              Customer Directory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Import names, mobile numbers, and emails into CRM</p>
          </div>
        </div>

        <div
          onClick={() => { setActiveTab('inventory'); setFile(null); setUploadResult(null); }}
          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
            activeTab === 'inventory'
              ? 'border-[#D32F2F] bg-red-50/50 shadow-md shadow-red-600/10'
              : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
            activeTab === 'inventory' ? 'bg-[#D32F2F] text-white shadow-md shadow-red-600/20' : 'bg-slate-100 text-slate-400'
          }`}>
            <Box size={26} />
          </div>
          <div>
            <h3 className={`font-extrabold text-base ${activeTab === 'inventory' ? 'text-slate-900' : 'text-slate-600'}`}>
              Inventory & Products
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Bulk update stock quantities, units, and SKU descriptions</p>
          </div>
        </div>
      </div>

      {/* File Upload Squircle Zone */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center mb-5 shadow-inner">
          <FileSpreadsheet size={36} />
        </div>
        
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Upload {activeTab === 'customers' ? 'Customer' : 'Inventory'} Spreadsheet
        </h2>
        <p className="text-xs text-slate-500 mb-8 max-w-md leading-relaxed">
          Ensure column headers match required attributes on Row 1. Supported file standards include <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong>.
        </p>

        <input 
          type="file" 
          accept=".csv, .xlsx, .xls"
          className="hidden"
          ref={fileInput}
          onChange={handleFileChange}
        />
        
        {!file ? (
          <button
            onClick={() => fileInput.current?.click()}
            className="h-12 px-7 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Upload size={16} /> Choose Spreadsheet
          </button>
        ) : (
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
              <div className="flex items-center gap-3 truncate mr-3">
                <FileUp size={20} className="text-[#D32F2F] shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
              </div>
              <button 
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider"
                onClick={() => setFile(null)}
              >
                Remove
              </button>
            </div>
            <button
              onClick={handleUpload}
              disabled={custMut.isPending || invMut.isPending}
              className="w-full h-12 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              {custMut.isPending || invMut.isPending ? 'Processing Import...' : 'Import & Process Data'}
            </button>
          </div>
        )}
      </div>

      {/* Execution Results */}
      {uploadResult && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-950 text-base">Pipeline Completed Successfully</h3>
              <p className="text-xs text-emerald-700">All valid rows have been committed to the live database</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rows Parsed</p>
              <p className="text-2xl font-black text-slate-900">{uploadResult.totalParsed}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">New Inserted</p>
              <p className="text-2xl font-black text-emerald-700">{uploadResult.inserted}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">
                {activeTab === 'customers' ? 'Skipped (Duplicate)' : 'Updated (Existing)'}
              </p>
              <p className="text-2xl font-black text-amber-600">
                {activeTab === 'customers' ? uploadResult.skipped : uploadResult.updated}
              </p>
            </div>
          </div>

          {uploadResult.validationErrors && uploadResult.validationErrors.length > 0 && (
            <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-rose-600" />
                <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider">Validation Warnings:</h4>
              </div>
              <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto font-medium">
                {uploadResult.validationErrors.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
