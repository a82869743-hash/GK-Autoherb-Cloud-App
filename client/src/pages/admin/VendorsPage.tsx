import { useState } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, Phone, Mail,
  MapPin, Wrench, Shield, Check, X, AlertCircle
} from 'lucide-react';
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor
} from '../../api/hooks/useVendors';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import { PageTransition, AnimatedCard, RippleButton, AnimatedModal } from '../../components/ui/Animations';

interface Vendor {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  service_type?: string;
  address?: string;
  is_active: number;
}

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  return (
    <PageTransition className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PremiumPageHeader
        title="Vendor Management"
        subtitle="Manage supplier directories, inventory partners, and service providers"
        icon={Users}
        iconColor="#EF4444"
        accentGradient="from-red-600 to-red-500"
        badge="SUPPLIERS"
      />

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex flex-1 flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors by name, phone, or service type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer bg-white px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded text-red-500 focus:ring-red-500/20 h-4 w-4 border-gray-300"
            />
            Active Only
          </label>
        </div>

        <RippleButton
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#1c1b1b] text-white hover:bg-[#2c2b2b] rounded-xl text-xs font-bold shadow-sm shrink-0"
        >
          <Plus size={16} />
          Add Vendor
        </RippleButton>
      </div>

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor: Vendor, idx: number) => (
            <AnimatedCard
              key={vendor.id}
              className={`bg-white border rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200 ${
                vendor.is_active === 0 ? 'border-gray-200/60 opacity-75' : 'border-gray-100'
              }`}
              delay={idx * 0.05}
            >
              {/* Active Badge */}
              <div className="absolute right-4 top-4">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  vendor.is_active === 1
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {vendor.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Info Header */}
                <div>
                  <h4 className="font-bold text-base text-[#1c1b1b] pr-12 truncate">{vendor.name}</h4>
                  {vendor.service_type && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
                      <Wrench size={10} />
                      {vendor.service_type}
                    </span>
                  )}
                </div>

                {/* Contacts */}
                <div className="space-y-2 text-xs text-gray-600 border-t border-gray-50 pt-3">
                  {vendor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-400" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate" title={vendor.email}>{vendor.email}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2" title={vendor.address}>{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4 mt-4">
                <RippleButton
                  onClick={() => handleOpenEdit(vendor)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit Vendor"
                >
                  <Edit2 size={13} />
                </RippleButton>
                <RippleButton
                  onClick={() => handleOpenDelete(vendor)}
                  className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Vendor"
                >
                  <Trash2 size={13} />
                </RippleButton>
              </div>
            </AnimatedCard>
          ))}

          {!vendors.length && (
            <div className="col-span-full py-16 text-center">
              <Users size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400 font-medium">No vendors found</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <AnimatedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-[#1c1b1b]">
              {selectedVendor ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            <p className="text-xs text-gray-500">Provide registration details for the vendor.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Company / Vendor Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="e.g. GK Detailing Supplies"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="e.g. supply@gkdetailing.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Service / Material Type</label>
              <input
                type="text"
                value={formData.service_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, service_type: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                placeholder="e.g. Cleaning Solvents, Spare Parts, Oils"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Office Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                placeholder="Complete street address..."
              />
            </div>

            {selectedVendor && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none mt-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-red-500 focus:ring-red-500/20 h-4 w-4 border-gray-300"
                />
                Vendor Active Status
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <RippleButton
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </RippleButton>
            <RippleButton
              type="submit"
              className="py-2 px-4 bg-[#1c1b1b] text-white hover:bg-[#2c2b2b] rounded-xl text-xs font-bold shadow-sm"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {selectedVendor ? 'Save Changes' : 'Add Supplier'}
            </RippleButton>
          </div>
        </form>
      </AnimatedModal>

      {/* DELETE CONFIRM MODAL */}
      <AnimatedModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <h3 className="text-lg font-bold">Remove Supplier?</h3>
          </div>
          
          <p className="text-xs text-gray-500">
            Are you sure you want to delete <span className="font-semibold text-gray-800">{selectedVendor?.name}</span>? This action is permanent and cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <RippleButton
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </RippleButton>
            <RippleButton
              type="button"
              className="py-2 px-4 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold shadow-sm"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              Delete Vendor
            </RippleButton>
          </div>
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
