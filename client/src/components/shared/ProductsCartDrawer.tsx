import React, { useState, useMemo } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, MapPin, X, CreditCard } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useUIStore } from '../../store/uiStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../api/axiosInstance';

interface ProductsCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: () => void;
}

export default function ProductsCartDrawer({ isOpen, onClose, onOrderSuccess }: ProductsCartDrawerProps) {
  const toast = useUIStore((s) => s.toast);
  const { productsCart, updateProductQty, removeProductFromCart, clearProductsCart } = useCartStore();

  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'razorpay'>('qr');
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(() => {
    return productsCart.reduce((sum, item) => sum + (item.selling_price as number) * item.quantity, 0);
  }, [productsCart]);

  if (!isOpen) return null;

  const handlePlaceCartOrder = async () => {
    if (productsCart.length === 0) {
      toast('error', 'Your products cart is empty');
      return;
    }
    if (!shippingAddress.trim()) {
      toast('error', 'Please enter your shipping/delivery address');
      return;
    }
    if (paymentMethod === 'qr' && !qrTransactionId.trim()) {
      toast('error', 'Please enter your UPI QR Transaction Reference ID');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cart_items: productsCart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
        })),
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        qr_transaction_id: paymentMethod === 'qr' ? qrTransactionId : undefined,
      };

      const res = await api.post('/products/orders', payload);
      if (res.data.success) {
        toast('success', 'Multi-product order placed! Admin has been notified for approval.');
        clearProductsCart();
        onClose();
        if (onOrderSuccess) onOrderSuccess();
      } else {
        toast('error', res.data.error || 'Order creation failed');
      }
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Order error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 to-[#1c1b1b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-amber-500" />
            <h3 className="font-black text-lg">Products Cart ({productsCart.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {productsCart.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag size={48} className="text-gray-300 mx-auto" />
              <p className="font-bold text-gray-700">Your Products Cart is empty</p>
              <p className="text-xs text-gray-400">Browse store products and tap "Add to Cart"</p>
            </div>
          ) : (
            <>
              {/* Item List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-400">Cart Items</h4>
                {productsCart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xs">
                        No Img
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-[10px] text-gray-400">₹{item.selling_price} each</p>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1">
                      <button
                        onClick={() => updateProductQty(item.id, item.quantity - 1)}
                        className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-extrabold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateProductQty(item.id, item.quantity + 1)}
                        className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button onClick={() => removeProductFromCart(item.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="text-xs font-black uppercase text-gray-400 mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-500" /> Delivery Address
                </h4>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter full street address, landmark, city & pincode"
                  rows={2}
                  className="w-full text-xs font-medium p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <h4 className="text-xs font-black uppercase text-gray-400 mb-2 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-500" /> Payment Option
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setPaymentMethod('qr')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      paymentMethod === 'qr' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    UPI QR Code
                  </button>
                  <button
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`p-3 rounded-xl border text-left font-bold transition-all ${
                      paymentMethod === 'razorpay' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    Online Payment
                  </button>
                </div>

                {paymentMethod === 'qr' && (
                  <div className="mt-3 space-y-2">
                    <Input
                      label="UPI Transaction Reference ID"
                      value={qrTransactionId}
                      onChange={(e) => setQrTransactionId(e.target.value)}
                      placeholder="e.g. 123456789012"
                    />
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Cart Items Subtotal</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping & Handling</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-black text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-600">₹{subtotal}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CTA */}
        {productsCart.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <Button
              onClick={handlePlaceCartOrder}
              loading={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-sm font-black rounded-xl shadow-lg"
            >
              Place Products Order (₹{subtotal})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
