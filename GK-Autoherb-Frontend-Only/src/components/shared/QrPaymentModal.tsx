import { useState } from 'react';
import Modal from '../ui/Modal';
import api from '../../api/axiosInstance';
import { useToastStore } from '../../store/toastStore';
import { Loader2, QrCode, CheckCircle, Info } from 'lucide-react';

interface QrPaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  bookingId?: number;
  packageRequestId?: number;
  onSuccess: () => void;
}

export default function QrPaymentModal({
  open,
  onClose,
  amount,
  bookingId,
  packageRequestId,
  onSuccess,
}: QrPaymentModalProps) {
  const { addToast } = useToastStore();
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const qrImageUrl = "/qr.jpg";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      addToast('error', 'Please enter your UTR / Transaction reference number.');
      return;
    }

    if (transactionId.length < 10) {
      addToast('error', 'Transaction UTR must be at least 10 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments/qr-confirm', {
        booking_id: bookingId,
        package_request_id: packageRequestId,
        amount,
        transaction_id: transactionId.trim(),
      });

      if (res.data.success) {
        addToast('success', res.data.message || 'Payment reference submitted successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error(res.data.error || 'Failed to submit payment reference.');
      }
    } catch (err: any) {
      console.error(err);
      addToast('error', err.response?.data?.error || err.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pay via UPI QR Code" size="md">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* UPI Details */}
        <div className="bg-[#D32F2F]/5 border border-[#D32F2F]/10 rounded-xl p-3 w-full flex items-center justify-between">
          <div className="text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recipient Name</p>
            <p className="text-sm font-extrabold text-gray-800">GK AUTO HERB</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">UPI ID / Number</p>
            <p className="text-sm font-bold text-[#D32F2F]">paytm.s2do639@paytm</p>
            <p className="text-xs text-gray-500 font-semibold">9408424541</p>
          </div>
        </div>

        {/* Amount to Pay */}
        <div>
          <p className="text-xs text-gray-500 font-bold">TOTAL PAYABLE AMOUNT</p>
          <p className="text-3xl font-extrabold text-red-600">₹{amount.toLocaleString('en-IN')}</p>
        </div>

        {/* QR Code Image */}
        <div className="relative border-4 border-gray-100 rounded-2xl overflow-hidden bg-white shadow-md p-2 w-64 h-64 flex flex-col items-center justify-center">
          <img
            src={qrImageUrl}
            alt="UPI QR Code"
            className="w-56 h-56 object-contain"
          />
        </div>

        {/* Scanning Instructions */}
        <div className="flex items-start gap-2.5 text-left bg-gray-50 rounded-xl p-3 border border-gray-100 w-full">
          <Info size={16} className="text-[#D32F2F] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-gray-800">How to pay?</p>
            <p className="text-[11px] text-gray-500 leading-normal mt-0.5">
              Scan the QR using any UPI App (GPay, PhonePe, Paytm, BHIM, etc.) or pay directly to the number **9408424541**. Enter the 12-digit Transaction UTR / reference code below to confirm.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div>
            <label className="block text-left text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
              Transaction ID / UTR Number
            </label>
            <input
              type="text"
              required
              placeholder="Enter 12-digit UTR / Ref Code"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center font-bold tracking-widest focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-gray-800"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-extrabold text-sm hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm & Submit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
