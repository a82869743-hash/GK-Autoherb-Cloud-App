import { useState } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, Phone, Mail,
  MapPin, Wrench, AlertCircle, ShoppingBag, ArrowUpRight, ArrowDownLeft, FileText,
  Building2, CheckCircle2, ShieldCheck, DollarSign
} from 'lucide-react';
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor
} from '../../api/hooks/useVendors';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition, AnimatedCard, RippleButton, AnimatedModal } from '../../components/ui/Animations';
import { formatINR } from '../../utils/formatters';

interface BuySellHistoryItem {
  id: number;
  type: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  transaction_date: string;
  status?: string;
}

interface PurchaseHistoryItem {
  purchase_id: number;
  invoice_number?: string;
  purchase_date: string;
  bill_total: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name: string;
}

interface Vendor {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  service_type?: string;
  address?: string;
  is_active: number;
  buy_sell_history?: BuySellHistoryItem[];
  purchase_history?: PurchaseHistoryItem[];
}

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyVendor, setHistoryVendor] = useState<Vendor | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service_type: '',
    address: '',
    is_active: true
  });

  const { data: vendorsResponse, isLoading } = useVendors({
    search: search || undefined,
    active_only: activeOnly || undefined
  });

  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const handleOpenCreate = () => {
    setSelectedVendor(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      service_type: '',
      address: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone || '',
      email: vendor.email || '',
      service_type: vendor.service_type || '',
      address: vendor.address || '',
      is_active: vendor.is_active === 1
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDeleteModalOpen(true);
  };

  const handleOpenHistory = (vendor: Vendor) => {
    setHistoryVendor(vendor);
    setIsHistoryModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (selectedVendor) {
        await updateMutation.mutateAsync({
          id: selectedVendor.id,
          ...formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVendor) return;
    try {
      await deleteMutation.mutateAsync(selectedVendor.id);
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const vendors = vendorsResponse?.data || [];

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v: Vendor) => v.is_active === 1).length;
  const totalTxnCount = vendors.reduce((acc: number, v: Vendor) => acc + (v.buy_sell_history?.length || 0) + (v.purchase_history?.length || 0), 0);
  const totalSpend = vendors.reduce((acc: number, v: Vendor) => {
    const bsSum = (v.buy_sell_history || []).filter(b => b.type === 'buy').reduce((s, b) => s + (b.total_amount || b.quantity * b.unit_price || 0), 0);
    const purSum = (v.purchase_history || []).reduce((s, p) => s + (p.line_total || p.bill_total || 0), 0);
    return acc + bsSum + purSum;
  }, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Vendor & Supplier Management"
        subtitle="Manage supplier directories, inventory partners, and service providers"
        badge={`${vendors.length} vendors`}
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Total Vendors"
            value={`${totalVendors}`}
            subtitle="Registered suppliers"
            icon={<Building2 className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${activeVendors} active`, positive: true }}
          />
          <AdminMetricCard
            title="Active Partners"
            value={`${activeVendors}`}
            subtitle="Ready for procurement"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${Math.round((activeVendors / (totalVendors || 1)) * 100)}% active`, positive: true }}
          />
          <AdminMetricCard
            title="Logged Transactions"
            value={`${totalTxnCount}`}
            subtitle="Invoices & trade items"
            icon={<ShoppingBag className="w-5 h-5 text-sky-600" />}
            variant="sky"
            trend={{ text: 'Trade cycles', positive: true }}
          />
          <AdminMetricCard
            title="Total Procurements"
            value={formatINR(totalSpend)}
            subtitle="Materials & inventory"
            icon={<DollarSign className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Lifetime spend', positive: true }}
          />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors by name, phone, or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all font-medium"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-2xl hover:bg-slate-100 select-none transition-all">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded text-[#D32F2F] focus:ring-red-500/20 h-4 w-4 border-slate-300"
            />
            Active Suppliers Only
          </label>
        </div>

        {/* Vendors Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((vendor: Vendor, idx: number) => {
              const hasBsHistory = (vendor.buy_sell_history?.length || 0) > 0;
              const hasPurHistory = (vendor.purchase_history?.length || 0) > 0;
              const totalTxns = (vendor.buy_sell_history?.length || 0) + (vendor.purchase_history?.length || 0);

              return (
                <div
                  key={vendor.id}
                  className={`bg-white border rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
                    vendor.is_active === 0 ? 'border-slate-200/70 opacity-75' : 'border-slate-100 shadow-sm'
                  }`}
                >
                  {/* Active Badge */}
                  <div className="absolute right-5 top-5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      vendor.is_active === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {vendor.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Info Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-[#D32F2F] font-bold text-sm shrink-0 border border-red-100">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="pr-12">
                        <h4 className="font-bold text-sm text-slate-900 leading-tight truncate">{vendor.name}</h4>
                        {vendor.service_type && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            <Wrench size={10} className="text-slate-400" />
                            {vendor.service_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      {vendor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-slate-400" />
                          <a href={`tel:${vendor.phone}`} className="text-[#D32F2F] hover:underline font-semibold">{vendor.phone}</a>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate text-slate-500" title={vendor.email}>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-start gap-2">
                          <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-slate-500 text-[11px]" title={vendor.address}>{vendor.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Products Bought / Sold Summary */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <ShoppingBag size={12} className="text-red-500" />
                          Products Bought / Sold
                        </span>
                        <button
                          onClick={() => handleOpenHistory(vendor)}
                          className="text-[10px] font-bold text-[#D32F2F] hover:text-[#b71c1c] underline"
                        >
                          View All ({totalTxns})
                        </button>
                      </div>

                      {hasBsHistory || hasPurHistory ? (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {vendor.buy_sell_history?.slice(0, 3).map((bs) => (
                            <div key={`bs-${bs.id}`} className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-1.5 truncate">
                                {bs.type === 'buy' ? (
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                                    <ArrowDownLeft size={10} /> BOUGHT
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                                    <ArrowUpRight size={10} /> SOLD
                                  </span>
                                )}
                                <span className="font-medium text-slate-800 truncate">{bs.product_name}</span>
                              </div>
                              <span className="font-bold text-slate-700 shrink-0">{formatINR(Number(bs.total_amount || (bs.quantity * bs.unit_price)))}</span>
                            </div>
                          ))}

                          {vendor.purchase_history?.slice(0, 2).map((pur, idx) => (
                            <div key={`pur-${pur.purchase_id}-${idx}`} className="flex items-center justify-between text-[11px] bg-purple-50/60 p-2 rounded-xl border border-purple-100">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-extrabold flex items-center gap-0.5">
                                  <FileText size={10} /> PURCHASE
                                </span>
                                <span className="font-medium text-slate-800 truncate">{pur.product_name || 'Inventory Item'}</span>
                              </div>
                              <span className="font-bold text-slate-700 shrink-0">{formatINR(Number(pur.line_total || pur.bill_total))}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No products bought or sold yet</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-4">
                    <button
                      onClick={() => handleOpenHistory(vendor)}
                      className="text-xs font-semibold text-slate-600 hover:text-[#D32F2F] flex items-center gap-1.5 transition-colors"
                    >
                      <ShoppingBag size={13} />
                      History
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(vendor)}
                        className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Edit Vendor"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(vendor)}
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete Vendor"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!vendors.length && (
              <div className="col-span-full py-16 text-center">
                <Users size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-bold">No vendors found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting search parameters or add a new vendor.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED VENDOR TRANSACTIONS & PRODUCTS MODAL */}
      <AnimatedModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)}>
        <div className="p-6 space-y-5 max-w-2xl w-full">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#D32F2F]" />
              <h3 className="text-lg font-bold text-slate-900">
                {historyVendor?.name} — Products & Ledger History
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete log of products bought, sold, and inventory purchase bills for this vendor.
            </p>
          </div>

          {/* Buy & Sell Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-rose-500" />
              Buy & Sell Products Ledger
            </h4>
            {(historyVendor?.buy_sell_history?.length || 0) > 0 ? (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyVendor?.buy_sell_history?.map((bs) => (
                      <tr key={bs.id} className="hover:bg-slate-50/80">
                        <td className="p-3 text-slate-500">
                          {bs.transaction_date ? new Date(bs.transaction_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            bs.type === 'buy' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {bs.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{bs.product_name}</td>
                        <td className="p-3 text-slate-700">{bs.quantity}</td>
                        <td className="p-3 text-slate-700">{formatINR(Number(bs.unit_price))}</td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatINR(Number(bs.total_amount || (bs.quantity * bs.unit_price)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
                No Buy & Sell entries recorded for this vendor.
              </p>
            )}
          </div>

          {/* Inventory Purchases Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-purple-500" />
              Inventory Purchase Bills
            </h4>
            {(historyVendor?.purchase_history?.length || 0) > 0 ? (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyVendor?.purchase_history?.map((pur, idx) => (
                      <tr key={`pur-modal-${pur.purchase_id}-${idx}`} className="hover:bg-slate-50/80">
                        <td className="p-3 text-slate-500">
                          {pur.purchase_date ? new Date(pur.purchase_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{pur.invoice_number || `#${pur.purchase_id}`}</td>
                        <td className="p-3 font-semibold text-slate-800">{pur.product_name || 'Inventory Item'}</td>
                        <td className="p-3 text-slate-700">{pur.quantity}</td>
                        <td className="p-3 text-slate-700">{formatINR(Number(pur.unit_price))}</td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatINR(Number(pur.line_total || pur.bill_total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
                No Inventory Purchase bills recorded for this vendor.
              </p>
            )}
          </div>
        </div>
      </AnimatedModal>

      {/* CREATE / EDIT VENDOR MODAL */}
      <AnimatedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-md w-full">
          <h3 className="text-lg font-bold text-slate-900">
            {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Vendor Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none bg-slate-50 font-medium"
                placeholder="e.g. 3M Car Care, Wurth India..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Service / Supply Category</label>
              <input
                type="text"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none bg-slate-50 font-medium"
                placeholder="e.g. Detailing Chemicals, Ceramic, PPF..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none bg-slate-50 font-medium"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none bg-slate-50 font-medium"
                  placeholder="contact@vendor.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none bg-slate-50 font-medium"
                rows={2}
                placeholder="Office or warehouse location..."
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-[#D32F2F] focus:ring-red-500/20 h-4 w-4 border-slate-300"
              />
              Active Supplier Partner
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-[#D32F2F] text-white hover:bg-[#b71c1c] rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 transition-all active:scale-95"
            >
              {selectedVendor ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </AnimatedModal>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatedModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="p-6 space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle size={24} />
          </div>

          <div className="text-center">
            <h3 className="text-base font-bold text-slate-900">Delete Vendor?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <span className="font-bold text-slate-800">{selectedVendor?.name}</span>? Historical trade references will be preserved.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-2xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all active:scale-95"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
