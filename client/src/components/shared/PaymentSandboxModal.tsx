import React from 'react';
import { CreditCard, Sparkles, Check, X, AlertCircle } from 'lucide-react';

interface PaymentSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onSimulateSuccess?: () => void | Promise<void>;
  onSimulateFailure?: () => void;
  orderId?: string;
  title?: string;
  amount?: number;
  itemName?: string;
  loading?: boolean;
  isLoading?: boolean;
}

export default function PaymentSandboxModal({
  isOpen,
  onClose,
  onConfirm,
  onSimulateSuccess,
  onSimulateFailure,
  orderId,
  title = 'Razorpay Sandbox Mode',
  amount,
  itemName,
  loading = false,
  isLoading = false,
}: PaymentSandboxModalProps) {
  if (!isOpen) return null;

  const isSpinning = loading || isLoading;
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    else if (onSimulateSuccess) onSimulateSuccess();
  };
  const handleCancel = () => {
    if (onSimulateFailure) onSimulateFailure();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-br from-[#111111] via-[#1c1917] to-[#262626] p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                  Test Gateway
                </span>
                <h3 className="text-base font-black text-white mt-0.5">{title}</h3>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Razorpay production gateway keys are unset. Would you like to simulate a successful payment to test order processing and stock deduction?
            </p>
          </div>

          {(itemName || amount !== undefined || orderId) && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              {orderId && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Order Reference</span>
                  <span className="font-mono text-slate-700 text-[11px] font-bold truncate max-w-[200px]">{orderId}</span>
                </div>
              )}
              {itemName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Item / Service</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{itemName}</span>
                </div>
              )}
              {amount !== undefined && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Test Amount</span>
                  <span className="text-sm font-black text-[#D32F2F]">₹{amount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSpinning}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSpinning}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              {isSpinning ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={14} />
                  <span>Simulate Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
