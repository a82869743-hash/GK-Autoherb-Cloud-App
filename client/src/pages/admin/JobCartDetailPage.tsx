import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Truck, CheckCircle, Send, Plus, Trash2, X, Save, Loader2, Edit2, Package } from 'lucide-react';
import { useJobCart, useSubmitJobCart, useCompleteJobCart, useAddService, useUpdateService as useUpdateJobService, useDeleteService as useDeleteJobService } from '../../api/hooks/useJobCarts';
import api from '../../api/axiosInstance';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import StatusBadge from '../../components/shared/StatusBadge';
import ErrorState from '../../components/shared/ErrorState';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { formatINR, formatDate } from '../../utils/formatters';
import type { JobService, JobPhoto } from '../../types';

interface ProductRow {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit: string;
}

export default function JobCartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { data: cart, isLoading, isError, refetch } = useJobCart(id);
  const submitMut = useSubmitJobCart();
  const completeMut = useCompleteJobCart();
  const addServiceMut = useAddService();
  const updateServiceMut = useUpdateJobService();
  const deleteServiceMut = useDeleteJobService();

  const isStaff = user?.role === 'staff';
  const isCustomer = user?.role === 'customer';
  const canEdit = !isCustomer && cart?.status !== 'complete';

  // ─── Catalog data ──────────────────────
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    api.get('/services').then(r => setServicesCatalog(r.data.data || [])).catch(() => {});
    api.get('/inventory?limit=500').then(r => setInventory(r.data.data || [])).catch(() => {});
  }, []);

  // ─── Edit notes/date ───────────────────
  const [editingInfo, setEditingInfo] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // ─── Add service modal ─────────────────
  const [addSvcOpen, setAddSvcOpen] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcIsCustom, setNewSvcIsCustom] = useState(false);
  const [newSvcPrice, setNewSvcPrice] = useState(0);
  const [newSvcLabor, setNewSvcLabor] = useState(0);
  const [newSvcProducts, setNewSvcProducts] = useState<ProductRow[]>([]);

  // ─── Edit service modal ────────────────
  const [editSvcOpen, setEditSvcOpen] = useState(false);
  const [editSvcId, setEditSvcId] = useState<number | null>(null);
  const [editSvcName, setEditSvcName] = useState('');
  const [editSvcPrice, setEditSvcPrice] = useState(0);
  const [editSvcLabor, setEditSvcLabor] = useState(0);
  const [editSvcProducts, setEditSvcProducts] = useState<ProductRow[]>([]);

  // ─── Delete service confirm ────────────
  const [deleteSvcId, setDeleteSvcId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ─── Loyalty modal ─────────────────────
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [credits, setCredits] = useState(0);
  const [freeWashes, setFreeWashes] = useState(0);
  const [waxAward, setWaxAward] = useState(0);

  // ─── Delivery modal ────────────────────
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // ─── Helpers ───────────────────────────

  const serviceOptions = [
    ...servicesCatalog.map(s => ({ value: s.name, label: s.name })),
    { value: '__custom__', label: '✏️ Custom / Other' },
  ];

  const inventoryOptions = inventory
    .filter((i: any) => !i.is_deleted)
    .map((i: any) => ({ value: i.id, label: `${i.product_name} (${i.quantity} ${i.unit})` }));

  const emptyProduct = (): ProductRow => ({ product_id: 0, product_name: '', quantity: 1, unit_cost: 0, unit: 'pcs' });

  const handleProductSelect = (products: ProductRow[], setProducts: (p: ProductRow[]) => void, idx: number, productId: number) => {
    const item = inventory.find((i: any) => i.id === productId);
    if (item) {
      const updated = [...products];
      updated[idx] = { ...updated[idx], product_id: productId, product_name: item.product_name, unit: item.unit };
      setProducts(updated);
    }
  };

  const handleSvcSelect = (val: string, setName: (v: string) => void, setCustom: (v: boolean) => void, setPrice: (v: number) => void) => {
    if (val === '__custom__') {
      setName(''); setCustom(true); setPrice(0);
    } else {
      const svc = servicesCatalog.find(s => s.name === val);
      setName(val); setCustom(false); setPrice(Number(svc?.price_sedan) || Number(svc?.price_hatchback) || 0);
    }
  };

  // ─── Loading / Error ───────────────────
  if (isLoading) {
    return (
      <>
        <AdminTopBar title="Loading..." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </>
    );
  }

  if (isError || !cart) {
    return <ErrorState message="Job cart not found" onRetry={() => refetch()} />;
  }

  // ─── Actions ───────────────────────────

  const handleStartEditInfo = () => {
    setEditNotes(cart.notes || '');
    setEditDate(cart.visit_date ? new Date(cart.visit_date).toISOString().split('T')[0] : '');
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      await api.put(`/job-carts/${cart.id}`, { visit_date: editDate, notes: editNotes });
      toast('success', 'Details updated');
      setEditingInfo(false);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update');
    } finally {
      setSavingInfo(false);
    }
  };

  // ─── Add Service ─────────────────
  const openAddService = () => {
    setNewSvcName(''); setNewSvcIsCustom(false); setNewSvcPrice(0); setNewSvcLabor(0); setNewSvcProducts([]);
    setAddSvcOpen(true);
  };

  const handleAddService = async () => {
    if (!newSvcName.trim()) { toast('error', 'Service name is required'); return; }
    try {
      await addServiceMut.mutateAsync({
        id: cart.id,
        service_name: newSvcName,
        service_price: newSvcPrice,
        labor_charges: newSvcLabor,
        products: newSvcProducts.filter(p => p.product_id > 0).map(p => ({
          product_id: p.product_id, quantity: p.quantity, unit_cost: p.unit_cost,
        })),
      });
      toast('success', 'Service added');
      setAddSvcOpen(false);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to add service');
    }
  };

  // ─── Edit Service ────────────────
  const openEditService = (svc: any) => {
    setEditSvcId(svc.id);
    setEditSvcName(svc.service_name);
    setEditSvcPrice(parseFloat(svc.service_price) || 0);
    setEditSvcLabor(parseFloat(svc.labor_charges) || 0);
    setEditSvcProducts(
      (svc.products || []).map((p: any) => ({
        product_id: p.product_id,
        product_name: p.product_name || '',
        quantity: parseFloat(p.quantity) || 1,
        unit_cost: parseFloat(p.unit_cost) || 0,
        unit: p.unit || 'pcs',
      }))
    );
    setEditSvcOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editSvcName.trim() || !editSvcId) { toast('error', 'Service name is required'); return; }
    try {
      await updateServiceMut.mutateAsync({
        cartId: cart.id,
        serviceId: editSvcId,
        service_name: editSvcName,
        service_price: editSvcPrice,
        labor_charges: editSvcLabor,
        products: editSvcProducts.filter(p => p.product_id > 0).map(p => ({
          product_id: p.product_id, quantity: p.quantity, unit_cost: p.unit_cost,
        })),
      });
      toast('success', 'Service updated');
      setEditSvcOpen(false);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update service');
    }
  };

  // ─── Delete Service ──────────────
  const handleDeleteService = async () => {
    if (!deleteSvcId) return;
    try {
      await deleteServiceMut.mutateAsync({ cartId: cart.id, serviceId: deleteSvcId });
      toast('success', 'Service removed');
      setDeleteConfirmOpen(false);
      setDeleteSvcId(null);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to delete service');
    }
  };

  // ─── Status actions ──────────────
  const handleSubmit = async () => {
    try {
      await submitMut.mutateAsync(cart.id);
      toast('success', 'Job cart submitted');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to submit');
    }
  };

  const handleComplete = async () => {
    try {
      await completeMut.mutateAsync({
        id: cart.id,
        credits_awarded: credits,
        free_washes_awarded: freeWashes,
        wax_awarded: waxAward,
      });
      toast('success', 'Job cart completed! Invoice generated.');
      setLoyaltyOpen(false);
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to complete');
    }
  };

  const handleDownloadInvoice = () => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    window.open(
      `${apiBase}/job-carts/${cart.id}/invoice?token=${token}`,
      '_blank'
    );
  };

  const openDeliveryModal = async () => {
    try {
      const res = await api.get('/staff');
      setStaffList(res.data.data || []);
    } catch { setStaffList([]); }
    setDeliveryOpen(true);
  };

  const handleDelivery = async () => {
    if (!selectedStaff) { toast('error', 'Select a staff member'); return; }
    setDeliveryLoading(true);
    try {
      await api.post('/deliveries', { job_cart_id: cart.id, staff_id: parseInt(selectedStaff) });
      toast('success', 'Delivery initiated');
      setDeliveryOpen(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to initiate delivery');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const beforePhotos = cart.photos?.filter((p: JobPhoto) => p.type === 'before') || [];
  const afterPhotos = cart.photos?.filter((p: JobPhoto) => p.type === 'after') || [];

  // ─── Product list editor (shared) ──────
  const ProductEditor = ({ products, setProducts }: { products: ProductRow[]; setProducts: (p: ProductRow[]) => void }) => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5f5e5e]">Products Used</span>
        <button onClick={() => setProducts([...products, emptyProduct()])} className="text-xs font-bold text-[#D32F2F] hover:underline flex items-center gap-1">
          <Plus size={12} /> Add Product
        </button>
      </div>
      {products.map((prod, pIdx) => (
        <div key={pIdx} className="flex gap-2 items-end mb-2">
          <div className="flex-1">
            <Select
              options={inventoryOptions}
              value={prod.product_id || ''}
              onChange={e => handleProductSelect(products, setProducts, pIdx, parseInt(e.target.value))}
              placeholder="Select product..."
            />
          </div>
          <div className="w-20">
            <Input
              type="number"
              value={prod.quantity || ''}
              onChange={e => {
                const updated = [...products];
                updated[pIdx] = { ...updated[pIdx], quantity: parseFloat(e.target.value) || 0 };
                setProducts(updated);
              }}
              placeholder="Qty"
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              value={prod.unit_cost || ''}
              onChange={e => {
                const updated = [...products];
                updated[pIdx] = { ...updated[pIdx], unit_cost: parseFloat(e.target.value) || 0 };
                setProducts(updated);
              }}
              placeholder="₹ Cost"
            />
          </div>
          <button onClick={() => setProducts(products.filter((_, i) => i !== pIdx))} className="pb-3 text-gray-300 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      ))}
      {products.length === 0 && <p className="text-xs text-gray-400 italic">No products added</p>}
    </div>
  );

  // ─── Service modal content (shared) ────
  const ServiceModalContent = ({
    svcName, setSvcName, isCustom, setIsCustom, svcPrice, setSvcPrice, svcLabor, setSvcLabor, products, setProducts
  }: any) => (
    <div className="space-y-4">
      {isCustom ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input label="Custom Service Name" value={svcName} onChange={e => setSvcName(e.target.value)} placeholder="Enter service name" />
          </div>
          <button onClick={() => setIsCustom(false)} className="pb-3 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
      ) : (
        <Select
          label="Service"
          options={serviceOptions}
          value={svcName}
          onChange={e => handleSvcSelect(e.target.value, setSvcName, setIsCustom, setSvcPrice)}
          placeholder="Select service..."
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Service Price (₹)" type="number" value={svcPrice || ''} onChange={e => setSvcPrice(parseFloat(e.target.value) || 0)} />
        <Input label="Labor Charges (₹)" type="number" value={svcLabor || ''} onChange={e => setSvcLabor(parseFloat(e.target.value) || 0)} />
      </div>
      <ProductEditor products={products} setProducts={setProducts} />
    </div>
  );

  return (
    <>
      <AdminTopBar
        title={cart.vehicle?.registration_no || `Cart #${cart.id}`}
        subtitle={`${cart.vehicle?.brand} ${cart.vehicle?.model} · Visit #${cart.visit_number}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft size={14} />}>
              Back
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl space-y-6">

        {/* ─── Header Card ─────────────────────── */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-extrabold text-[#1c1b1b] tracking-tight">{cart.vehicle?.registration_no}</h3>
                <StatusBadge status={cart.status} />
                {canEdit && !editingInfo && (
                  <button onClick={handleStartEditInfo} className="p-1.5 rounded-lg text-gray-400 hover:text-[#D32F2F] hover:bg-red-50 transition-colors" title="Edit details">
                    <Edit2 size={14} />
                  </button>
                )}
              </div>

              {editingInfo ? (
                <div className="space-y-3 mt-3">
                  <Input label="Visit Date" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                  <Textarea label="Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Any special instructions..." />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveInfo} loading={savingInfo} icon={<Save size={14} />}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingInfo(false)} disabled={savingInfo}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#5f5e5e] space-y-0.5">
                  <p><span className="font-semibold">Customer:</span> {(cart as any).customer?.name || 'N/A'} · {(cart as any).customer?.mobile}</p>
                  <p><span className="font-semibold">Vehicle:</span> {cart.vehicle?.brand} {cart.vehicle?.model}</p>
                  <p><span className="font-semibold">Date:</span> {formatDate(cart.visit_date)} · <span className="font-semibold">Visit:</span> #{cart.visit_number}</p>
                  {cart.notes && <p><span className="font-semibold">Notes:</span> {cart.notes}</p>}
                  {cart.invoice_number && <p><span className="font-semibold">Invoice:</span> {cart.invoice_number}</p>}
                </div>
              )}
            </div>

            {/* Total */}
            {!isStaff && cart.total_amount !== undefined && (
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e]">Total</p>
                <p className="text-3xl font-black text-[#1c1b1b] tracking-tight">{formatINR(cart.total_amount)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Services ────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e]">Services ({cart.services?.length || 0})</h3>
            {canEdit && (
              <button onClick={openAddService} className="text-xs font-bold text-[#D32F2F] hover:underline flex items-center gap-1">
                <Plus size={14} /> Add Service
              </button>
            )}
          </div>
          {cart.services?.length ? (
            <div className="divide-y divide-gray-50">
              {cart.services.map((svc: any, idx: number) => (
                <div key={svc.id || idx} className="px-6 py-4 group hover:bg-gray-50/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#1c1b1b]">{svc.service_name}</p>
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditService(svc)}
                              className="p-1 rounded text-gray-400 hover:text-[#D32F2F] hover:bg-red-50 transition-colors"
                              title="Edit service"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => { setDeleteSvcId(svc.id); setDeleteConfirmOpen(true); }}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                      {!isStaff && (
                        <div className="text-xs text-[#5f5e5e] mt-1 space-x-3">
                          <span>Price: {formatINR(svc.service_price)}</span>
                          <span>Labor: {formatINR(svc.labor_charges)}</span>
                        </div>
                      )}
                    </div>
                    {!isStaff && svc.subtotal !== undefined && (
                      <span className="text-sm font-extrabold text-[#1c1b1b]">{formatINR(svc.subtotal)}</span>
                    )}
                  </div>

                  {svc.products?.length > 0 && (
                    <div className="mt-2 ml-4">
                      {svc.products.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="text-xs text-[#5f5e5e] flex justify-between py-0.5">
                          <span>• {p.product_name} × {p.quantity} {p.unit}</span>
                          {!isStaff && <span>{formatINR(p.quantity * p.unit_cost)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <Package size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-[#5f5e5e]">No services added yet</p>
              {canEdit && (
                <button onClick={openAddService} className="mt-2 text-sm font-bold text-[#D32F2F] hover:underline">
                  + Add First Service
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Photos ──────────────────────────── */}
        {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e] mb-4">Photos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {beforePhotos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">Before</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {beforePhotos.map((p: JobPhoto) => (
                      <img key={p.id} src={p.url} alt="Before" className="rounded-lg aspect-square object-cover w-full" />
                    ))}
                  </div>
                </div>
              )}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">After</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {afterPhotos.map((p: JobPhoto) => (
                      <img key={p.id} src={p.url} alt="After" className="rounded-lg aspect-square object-cover w-full" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Action Buttons ──────────────────── */}
        {!isCustomer && (
          <div className="flex flex-wrap gap-3 pb-8">
            {cart.status === 'draft' && (
              <Button onClick={handleSubmit} loading={submitMut.isPending} icon={<Send size={14} />}>
                Submit Job Cart
              </Button>
            )}
            {cart.status === 'open' && !isStaff && (
              <Button onClick={() => setLoyaltyOpen(true)} icon={<CheckCircle size={14} />}>
                Mark Complete
              </Button>
            )}
            {cart.status === 'complete' && (
              <>
                <Button onClick={handleDownloadInvoice} icon={<Download size={14} />}>
                  Download Invoice
                </Button>
                {!isStaff && (
                  <Button variant="secondary" onClick={openDeliveryModal} icon={<Truck size={14} />}>
                    Send for Delivery
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Customer: download invoice */}
        {isCustomer && cart.status === 'complete' && (
          <div className="pb-8">
            <Button onClick={handleDownloadInvoice} icon={<Download size={14} />}>
              Download Invoice
            </Button>
          </div>
        )}
      </div>

      {/* ─── Add Service Modal ──────────────────── */}
      <Modal
        open={addSvcOpen}
        onClose={() => setAddSvcOpen(false)}
        title="Add Service"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddSvcOpen(false)} disabled={addServiceMut.isPending}>Cancel</Button>
            <Button onClick={handleAddService} loading={addServiceMut.isPending}>Add Service</Button>
          </>
        }
      >
        <ServiceModalContent
          svcName={newSvcName} setSvcName={setNewSvcName}
          isCustom={newSvcIsCustom} setIsCustom={setNewSvcIsCustom}
          svcPrice={newSvcPrice} setSvcPrice={setNewSvcPrice}
          svcLabor={newSvcLabor} setSvcLabor={setNewSvcLabor}
          products={newSvcProducts} setProducts={setNewSvcProducts}
        />
      </Modal>

      {/* ─── Edit Service Modal ─────────────────── */}
      <Modal
        open={editSvcOpen}
        onClose={() => setEditSvcOpen(false)}
        title="Edit Service"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditSvcOpen(false)} disabled={updateServiceMut.isPending}>Cancel</Button>
            <Button onClick={handleUpdateService} loading={updateServiceMut.isPending}>Save Changes</Button>
          </>
        }
      >
        <ServiceModalContent
          svcName={editSvcName} setSvcName={setEditSvcName}
          isCustom={false} setIsCustom={() => {}}
          svcPrice={editSvcPrice} setSvcPrice={setEditSvcPrice}
          svcLabor={editSvcLabor} setSvcLabor={setEditSvcLabor}
          products={editSvcProducts} setProducts={setEditSvcProducts}
        />
      </Modal>

      {/* ─── Delete Service Confirm ─────────────── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteSvcId(null); }}
        onConfirm={handleDeleteService}
        title="Remove Service"
        message="This will permanently remove this service and its products from the job cart. Continue?"
        confirmLabel="Remove"
        loading={deleteServiceMut.isPending}
      />

      {/* ─── Loyalty Award Modal ───────────────── */}
      <Modal
        open={loyaltyOpen}
        onClose={() => setLoyaltyOpen(false)}
        title="Complete & Award Loyalty"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLoyaltyOpen(false)} disabled={completeMut.isPending}>Cancel</Button>
            <Button onClick={handleComplete} loading={completeMut.isPending}>
              Confirm & Complete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5f5e5e]">
            Award loyalty rewards to the customer for this visit. Leave at 0 to skip.
          </p>
          <Input label="Credits to Award (₹)" type="number" value={credits || ''} onChange={e => setCredits(parseInt(e.target.value) || 0)} />
          <Input label="Free Washes to Award" type="number" value={freeWashes || ''} onChange={e => setFreeWashes(parseInt(e.target.value) || 0)} />
          <Input label="Wax Treatments to Award" type="number" value={waxAward || ''} onChange={e => setWaxAward(parseInt(e.target.value) || 0)} />
        </div>
      </Modal>

      {/* ─── Delivery Modal ────────────────────── */}
      <Modal
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        title="Send for Delivery"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeliveryOpen(false)} disabled={deliveryLoading}>Cancel</Button>
            <Button onClick={handleDelivery} loading={deliveryLoading}>
              Initiate Delivery
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5f5e5e]">Select a staff member to deliver this vehicle.</p>
          <Select
            label="Staff Member"
            options={staffList.map(s => ({ value: s.id, label: s.name }))}
            value={selectedStaff}
            onChange={e => setSelectedStaff(e.target.value)}
            placeholder="Choose staff..."
          />
        </div>
      </Modal>
    </>
  );
}
