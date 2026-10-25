import JobStagePanel from '../../components/admin/JobStagePanel';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Truck, CheckCircle, Send, Plus, Trash2, X, Save, Loader2, Edit2, Package, Mail, Share2, Phone, MessageCircle, Sparkles, Wallet, Camera } from 'lucide-react';
import { StatusPill, SectionTitle, EmptyBlock, Skeleton } from '../../components/ops/ui';
import { segmentForVehicle, priceForSegment } from '../../utils/pricing';
import { useJobCart, useSubmitJobCart, useCompleteJobCart, useAddService, useUpdateService as useUpdateJobService, useDeleteService as useDeleteJobService, useUploadPhoto, useDeletePhoto } from '../../api/hooks/useJobCarts';
import { useMessagesLog } from '../../api/hooks/useMessages';
import api from '../../api/axiosInstance';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ErrorState from '../../components/shared/ErrorState';
import FileUpload from '../../components/ui/FileUpload';
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
  const uploadPhotoMut = useUploadPhoto();
  const deletePhotoMut = useDeletePhoto();
  const { data: messagesData } = useMessagesLog({ reference_type: 'job_cart', reference_id: id });
  const messages = messagesData?.data || [];
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareExpiry, setShareExpiry] = useState('24');
  const [shareFilePayload, setShareFilePayload] = useState<{ url: string; name: string; type: string } | null>(null);

  const handleShareFile = async (url: string, name: string, type: string) => {
    setShareFilePayload({ url, name, type });
    setShareLink('');
    setShareModalOpen(true);
  };

  const handleGenerateShareLink = async () => {
    if (!shareFilePayload) return;
    try {
      const response = await api.post('/shared-files/generate-link', {
        file_name: shareFilePayload.name,
        file_url: shareFilePayload.url,
        file_type: shareFilePayload.type,
        reference_type: shareFilePayload.type === 'pdf' ? 'invoice' : 'job_cart',
        reference_id: Number(id),
        expiry_hours: shareExpiry === 'permanent' ? null : parseInt(shareExpiry)
      });
      if (response.data.success) {
        setShareLink(response.data.data.share_url);
        toast('success', 'Shareable link generated!');
      } else {
        toast('error', 'Failed to generate link');
      }
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to generate share link');
    }
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isCustomer = user?.role === 'customer';
  
  let canEdit = !isCustomer && cart?.status !== 'complete';
  let editTimeRemaining = null;

  if (cart?.status === 'complete' && cart?.completed_at) {
    const completedAt = new Date(cart.completed_at);
    const now = new Date();
    const hoursSinceComplete = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
    
    if (isAdmin) {
      canEdit = true; // Admin override
    } else if (hoursSinceComplete < 24) {
      canEdit = !isStaff; // Staff cannot edit historical complete carts even within 24h
      editTimeRemaining = Math.floor(24 - hoursSinceComplete);
    }
  } else if (cart?.status === 'complete') {
    canEdit = isAdmin;
  }

  // Staff restriction: only today's carts
  if (isStaff && cart?.visit_date) {
    const d = new Date(cart.visit_date);
    const cartDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (cartDateStr !== todayStr) {
      canEdit = false;
    }
  }

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

  // ─── Collect Advance Modal ─────────────
  const [collectAdvanceOpen, setCollectAdvanceOpen] = useState(false);
  const [advanceAmountInput, setAdvanceAmountInput] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('cash');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

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
      setName(val); setCustom(false);
      setPrice(priceForSegment(svc, segmentForVehicle(cart?.vehicle)) || Number(svc?.price_sedan) || Number(svc?.price_hatchback) || 0);
    }
  };

  // ─── Loading / Error ───────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
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

  const handleUploadBefore = async (files: File[]) => {
    setBeforeFiles(files);
    if (files.length > 0) {
      try {
        await uploadPhotoMut.mutateAsync({ cartId: Number(id), files, type: 'before' });
        toast('success', `Uploaded ${files.length} before photo(s)`);
        refetch();
        setBeforeFiles([]);
      } catch (err: any) {
        toast('error', err?.response?.data?.error || 'Failed to upload photo');
      }
    }
  };

  const handleUploadAfter = async (files: File[]) => {
    setAfterFiles(files);
    if (files.length > 0) {
      try {
        await uploadPhotoMut.mutateAsync({ cartId: Number(id), files, type: 'after' });
        toast('success', `Uploaded ${files.length} after photo(s)`);
        refetch();
        setAfterFiles([]);
      } catch (err: any) {
        toast('error', err?.response?.data?.error || 'Failed to upload photo');
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Are you sure you want to remove this photo?')) return;
    try {
      await deletePhotoMut.mutateAsync({ cartId: Number(id), photoId });
      toast('success', 'Photo removed');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to remove photo');
    }
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



  const handleCollectAdvance = async () => {
    const amt = parseFloat(advanceAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast('error', 'Please enter a valid advance amount');
      return;
    }
    setSubmittingAdvance(true);
    try {
      await api.post('/payments/advance', {
        customer_id: cart.customer?.id,
        job_cart_id: cart.id,
        booking_id: cart.booking_id || undefined,
        advance_amount: amt,
        total_amount: cart.total_amount,
        payment_method: advanceMethod,
        notes: advanceNotes || 'Advance payment collected at counter'
      });
      toast('success', 'Advance payment recorded successfully!');
      setCollectAdvanceOpen(false);
      setAdvanceAmountInput('');
      setAdvanceNotes('');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to record advance payment');
    } finally {
      setSubmittingAdvance(false);
    }
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
        <span className="text-[13px] font-bold text-slate-700">Products used</span>
        <button onClick={() => setProducts([...products, emptyProduct()])} className="text-xs font-bold text-[#D32F2F] hover:underline flex items-center gap-1">
          <Plus size={12} /> Add Product
        </button>
      </div>
      {products.map((prod, pIdx) => {
        const item = inventory.find((i: any) => i.id === prod.product_id);
        let imgUrl = '';
        if (item && item.images_json) {
          try {
            const arr = typeof item.images_json === 'string' ? JSON.parse(item.images_json) : item.images_json;
            if (Array.isArray(arr) && arr.length > 0) imgUrl = arr[0];
          } catch (e) {}
        }
        return (
          <div key={pIdx} className="flex gap-2 items-end mb-2">
            <div className="pb-1">
              {imgUrl ? (
                <img src={imgUrl} alt="Prod" className="w-9 h-9 rounded-lg object-contain border border-gray-200 bg-gray-50 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 text-gray-300">
                  <Package size={14} />
                </div>
              )}
            </div>
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
          {!isStaff && (
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
          )}
          <button onClick={() => setProducts(products.filter((_, i) => i !== pIdx))} className="pb-3 text-gray-300 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      );
    })}
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
      {!isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Service Price (₹)" type="number" value={svcPrice || ''} onChange={e => setSvcPrice(parseFloat(e.target.value) || 0)} />
          <Input label="Labor Charges (₹)" type="number" value={svcLabor || ''} onChange={e => setSvcLabor(parseFloat(e.target.value) || 0)} />
        </div>
      )}
      {ProductEditor({ products, setProducts })}
    </div>
  );

  const customer = (cart as any).customer || {};
  const waPhone = customer.mobile ? `91${String(customer.mobile).replace(/\D/g, '').slice(-10)}` : '';
  const advancePaid = Number((cart as any).advance_paid || 0);
  const balanceDue = (cart as any).balance_due;

  const PhotoGrid = (list: JobPhoto[], label: string) =>
    list.length > 0 ? (
      <div className="grid grid-cols-3 gap-2">
        {list.map((p: JobPhoto) => (
          <div key={p.id} className="relative aspect-square">
            <img src={p.url} alt={label} className="h-full w-full rounded-xl object-cover" />
            <div className="absolute bottom-1 right-1 flex gap-1">
              <button onClick={() => handleShareFile(p.url, `${label} Photo - Job #${id}`, 'image')} className="h-7 w-7 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow" aria-label="Share photo">
                <Share2 size={13} />
              </button>
              {canEdit && (
                <button onClick={() => handleDeletePhoto(p.id)} className="h-7 w-7 rounded-full bg-[#D32F2F] text-white flex items-center justify-center shadow" aria-label="Delete photo">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[12.5px] text-slate-400">No {label.toLowerCase()} photos yet</p>
    );

  const PhotoButton = (label: string, onPick: (files: File[]) => void) => (
    <label className="mt-2 app-btn h-11 w-full bg-slate-100 text-slate-800 cursor-pointer">
      {uploadPhotoMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />} {label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) onPick(files);
        }}
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-44 font-sans">
      {/* ─── Top bar ─── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(isStaff ? '/staff/job-carts' : '/admin/job-carts')}
          className="-ml-1 h-10 w-10 rounded-full flex items-center justify-center text-slate-900 active:bg-slate-200"
          aria-label="Back to jobs"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D32F2F]">Job card #{cart.id}</p>
          <h1 className="font-display text-[20px] font-extrabold text-slate-900 leading-tight truncate">{cart.vehicle?.registration_no || `Job #${cart.id}`}</h1>
        </div>
        <StatusPill status={cart.status} />
      </div>

      {cart.status === 'complete' && canEdit && (
        <div className="app-card flex items-center gap-2.5 p-3 text-[12.5px] font-semibold text-amber-800 bg-amber-50">
          <Edit2 size={16} className="text-amber-600 shrink-0" />
          {isAdmin ? 'Admin override: you can still edit this completed job.' : `You have ${editTimeRemaining} hours left to edit this completed job.`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 min-w-0">
          {/* ─── Car & customer ─── */}
          <section className="app-card overflow-hidden">
            <div className="relative bg-[#111] p-4 text-white">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#D32F2F]/30 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shrink-0">
                  <VehicleBrandBadge brand={cart.vehicle?.brand} model={cart.vehicle?.model} showText={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-extrabold truncate">{[cart.vehicle?.brand, cart.vehicle?.model].filter(Boolean).join(' ') || 'Vehicle'}</p>
                  <p className="text-[12.5px] text-white/70">
                    Visit #{cart.visit_number} · {formatDate(cart.visit_date)}
                  </p>
                </div>
                {canEdit && !editingInfo && (
                  <button onClick={handleStartEditInfo} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center" aria-label="Edit details">
                    <Edit2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-red-50 text-[#D32F2F] flex items-center justify-center font-display font-extrabold">
                  {(customer.name || 'C').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-[15px] text-slate-900 truncate">{customer.name || 'Customer'}</p>
                  {!isStaff && customer.mobile && <p className="text-[12.5px] text-slate-500">{customer.mobile}</p>}
                </div>
                {customer.mobile && (
                  <div className="flex gap-2 shrink-0">
                    <a href={`tel:${customer.mobile}`} className="h-10 w-10 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center" aria-label="Call customer">
                      <Phone size={17} />
                    </a>
                    <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center" aria-label="WhatsApp customer">
                      <MessageCircle size={17} />
                    </a>
                  </div>
                )}
              </div>

              {editingInfo ? (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <Input label="Visit date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  <Textarea label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Any special instructions..." />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setEditingInfo(false)} disabled={savingInfo}>Cancel</Button>
                    <Button onClick={handleSaveInfo} loading={savingInfo} icon={<Save size={15} />}>Save</Button>
                  </div>
                </div>
              ) : (
                (cart.notes || cart.invoice_number) && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[13px]">
                    {cart.notes && (
                      <p className="text-slate-600"><span className="font-semibold text-slate-900">Notes: </span>{cart.notes}</p>
                    )}
                    {cart.invoice_number && (
                      <p className="text-slate-600"><span className="font-semibold text-slate-900">Invoice: </span>{cart.invoice_number}</p>
                    )}
                  </div>
                )
              )}
            </div>
          </section>

          {/* ─── Live stages ─── */}
          {!isCustomer && cart.status !== 'draft' && <JobStagePanel jobId={cart.id} />}

          {/* ─── Services ─── */}
          <section>
            <SectionTitle
              action={
                canEdit ? (
                  <button onClick={openAddService} className="text-[13px] font-bold text-[#D32F2F] flex items-center gap-1">
                    <Plus size={15} /> Add service
                  </button>
                ) : undefined
              }
            >
              Services ({cart.services?.length || 0})
            </SectionTitle>
            {cart.services?.length ? (
              <div className="space-y-2.5">
                {cart.services.map((svc: any, idx: number) => (
                  <div key={svc.id || idx} className="app-card p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="h-10 w-10 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
                        <Sparkles size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-[14.5px] text-slate-900">{svc.service_name}</p>
                        {!isStaff && (
                          <p className="text-[12px] text-slate-500 mt-0.5">
                            Service {formatINR(svc.service_price)}
                            {Number(svc.labor_charges) > 0 ? ` · Labour ${formatINR(svc.labor_charges)}` : ''}
                          </p>
                        )}
                      </div>
                      {!isStaff && svc.subtotal !== undefined && (
                        <span className="font-display font-extrabold text-[15px] text-slate-900 shrink-0">{formatINR(svc.subtotal)}</span>
                      )}
                    </div>

                    {svc.products?.length > 0 && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-2.5 space-y-1">
                        {svc.products.map((p: any, pIdx: number) => (
                          <div key={pIdx} className="flex justify-between gap-2 text-[12px] text-slate-600">
                            <span className="flex items-center gap-1.5 min-w-0"><Package size={12} className="text-slate-400 shrink-0" /><span className="truncate">{p.product_name} × {p.quantity} {p.unit}</span></span>
                            {!isStaff && <span className="shrink-0">{formatINR(p.quantity * p.unit_cost)}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button onClick={() => openEditService(svc)} className="app-btn h-9 bg-slate-100 text-slate-800 text-[13px]">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => { setDeleteSvcId(svc.id); setDeleteConfirmOpen(true); }} className="app-btn h-9 bg-red-50 text-[#D32F2F] text-[13px]">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={<Package size={26} />}
                title="No services yet"
                text={canEdit ? 'Add what the customer asked for.' : undefined}
                action={canEdit ? <button onClick={openAddService} className="app-btn-primary h-11"><Plus size={16} /> Add first service</button> : undefined}
              />
            )}
          </section>
        </div>

        <div className="space-y-4 min-w-0">
          {/* ─── Bill summary ─── */}
          {!isStaff && cart.total_amount !== undefined && (
            <section className="app-card p-4">
              <p className="text-[12px] font-semibold text-slate-500">Total amount</p>
              <p className="font-display text-[28px] font-extrabold text-slate-900 leading-tight">{formatINR(cart.total_amount)}</p>
              {(cart as any).pickup_charge > 0 && (
                <p className="text-[12px] text-slate-500 mt-0.5">Includes ₹{(cart as any).pickup_charge} pickup & drop ({(cart as any).pickup_type})</p>
              )}
              {advancePaid > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2.5">
                    <p className="text-[11px] font-semibold text-emerald-700">Advance paid</p>
                    <p className="font-display font-extrabold text-emerald-700">{formatINR(advancePaid)}</p>
                  </div>
                  {balanceDue !== undefined && (
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[11px] font-semibold text-slate-500">Balance due</p>
                      <p className="font-display font-extrabold text-slate-900">{formatINR(balanceDue)}</p>
                    </div>
                  )}
                </div>
              ) : (
                cart.status !== 'complete' && (
                  <button
                    onClick={() => {
                      setAdvanceAmountInput(String(Math.round((cart.total_amount || 0) * 0.3)));
                      setCollectAdvanceOpen(true);
                    }}
                    className="mt-3 app-btn h-10 w-full bg-red-50 text-[#D32F2F]"
                  >
                    <Wallet size={15} /> Collect advance
                  </button>
                )
              )}
            </section>
          )}

          {/* ─── Photos ─── */}
          {(beforePhotos.length > 0 || afterPhotos.length > 0 || canEdit) && (
            <section className="app-card p-4 space-y-4">
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex items-center gap-2"><Camera size={17} className="text-[#D32F2F]" /> Photos</h3>
              <div>
                <p className="mb-2 text-[13px] font-bold text-slate-700">Before</p>
                {PhotoGrid(beforePhotos, 'Before')}
                {canEdit && PhotoButton('Take / add before photo', handleUploadBefore)}
              </div>
              <div>
                <p className="mb-2 text-[13px] font-bold text-slate-700">After</p>
                {PhotoGrid(afterPhotos, 'After')}
                {canEdit && PhotoButton('Take / add after photo', handleUploadAfter)}
              </div>
            </section>
          )}

          {/* ─── Messages ─── */}
          {!isCustomer && messages.length > 0 && (
            <section className="app-card p-4">
              <h3 className="font-display text-[16px] font-extrabold text-slate-900 flex items-center gap-2 mb-2"><Mail size={17} className="text-[#D32F2F]" /> Messages sent</h3>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {messages.map((log: any) => {
                  const waLink = log.response_data?.wa_link;
                  return (
                    <div key={log.id} className="py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${
                          log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : log.status === 'failed' ? 'bg-red-50 text-red-600' : log.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{log.status}</span>
                        <span className="text-[11px] font-semibold text-slate-400 capitalize">{log.channel}</span>
                        <span className="ml-auto text-[11px] text-slate-400">{new Date(log.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-slate-600">{log.message_body}</p>
                      {log.channel === 'whatsapp' && waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
                          <MessageCircle size={13} /> Send on WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ─── Sticky action bar ─── */}
      {(() => {
        const actions: JSX.Element[] = [];
        if (!isCustomer && cart.status === 'draft') {
          actions.push(
            <button key="submit" onClick={handleSubmit} disabled={submitMut.isPending} className="app-btn-primary flex-1">
              {submitMut.isPending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Submit job card
            </button>
          );
        }
        if (!isCustomer && cart.status === 'open' && !isStaff) {
          actions.push(
            <button key="complete" onClick={() => setLoyaltyOpen(true)} className="app-btn-primary flex-1">
              <CheckCircle size={17} /> Complete & bill
            </button>
          );
        }
        if (cart.status === 'complete') {
          actions.push(
            <button key="dl" onClick={handleDownloadInvoice} className={`${isCustomer ? 'app-btn-primary' : 'app-btn-dark'} flex-1`}>
              <Download size={17} /> Invoice
            </button>
          );
          if (!isCustomer) {
            actions.push(
              <button key="share" onClick={() => handleShareFile(`/api/job-carts/${cart.id}/invoice`, `Invoice - Job #${cart.invoice_number || cart.id}`, 'pdf')} className="app-btn-outline px-4" aria-label="Share invoice">
                <Share2 size={17} />
              </button>
            );
          }
          if (!isCustomer && !isStaff) {
            actions.push(
              <button key="deliver" onClick={openDeliveryModal} className="app-btn-primary flex-1">
                <Truck size={17} /> Deliver
              </button>
            );
          }
        }
        if (!actions.length) return null;
        return (
          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
              {!isStaff && cart.total_amount !== undefined && (
                <div className="mr-1 shrink-0">
                  <p className="text-[11px] font-semibold text-slate-500 leading-none">Total</p>
                  <p className="font-display text-[17px] font-extrabold text-slate-900">{formatINR(cart.total_amount)}</p>
                </div>
              )}
              {actions}
            </div>
          </div>
        );
      })()}

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
        {ServiceModalContent({
          svcName: newSvcName, setSvcName: setNewSvcName,
          isCustom: newSvcIsCustom, setIsCustom: setNewSvcIsCustom,
          svcPrice: newSvcPrice, setSvcPrice: setNewSvcPrice,
          svcLabor: newSvcLabor, setSvcLabor: setNewSvcLabor,
          products: newSvcProducts, setProducts: setNewSvcProducts,
        })}
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
        {ServiceModalContent({
          svcName: editSvcName, setSvcName: setEditSvcName,
          isCustom: false, setIsCustom: () => {},
          svcPrice: editSvcPrice, setSvcPrice: setEditSvcPrice,
          svcLabor: editSvcLabor, setSvcLabor: setEditSvcLabor,
          products: editSvcProducts, setProducts: setEditSvcProducts,
        })}
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

      {/* ─── Collect Advance Modal ───────────────── */}
      <Modal
        open={collectAdvanceOpen}
        onClose={() => setCollectAdvanceOpen(false)}
        title="Collect Advance Payment"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCollectAdvanceOpen(false)} disabled={submittingAdvance}>Cancel</Button>
            <Button onClick={handleCollectAdvance} loading={submittingAdvance}>
              Collect Payment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#5f5e5e]">
            Record an advance payment collected from the customer at the counter.
          </p>
          <Input
            label="Advance Amount (₹)"
            type="number"
            value={advanceAmountInput}
            onChange={e => setAdvanceAmountInput(e.target.value)}
            placeholder="e.g. 500"
          />
          <Select
            label="Payment Method"
            options={[
              { value: 'cash', label: '💵 Cash' },
              { value: 'upi', label: '📱 UPI' },
              { value: 'card', label: '💳 Card' },
              { value: 'net_banking', label: '🏦 Net Banking' },
              { value: 'qr', label: '🔲 QR Code Scan' },
              { value: 'other', label: '📝 Other' },
            ]}
            value={advanceMethod}
            onChange={e => setAdvanceMethod(e.target.value)}
          />
          <Input
            label="Notes / Reference (Optional)"
            value={advanceNotes}
            onChange={e => setAdvanceNotes(e.target.value)}
            placeholder="e.g. Transaction ID, note"
          />
        </div>
      </Modal>

      {/* ─── Share Link Modal ─────────────────── */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share File Link"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShareModalOpen(false)}>Close</Button>
            {!shareLink && (
              <Button onClick={handleGenerateShareLink} variant="primary">Generate Link</Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {!shareLink ? (
            <>
              <p className="text-sm text-[#5f5e5e]">
                Choose an expiration period for this shared link. Anyone with the link will be able to access the file without logging in.
              </p>
              <Select
                label="Expiry Duration"
                value={shareExpiry}
                onChange={e => setShareExpiry(e.target.value)}
                options={[
                  { value: '24', label: '24 Hours' },
                  { value: '168', label: '7 Days' },
                  { value: 'permanent', label: 'Permanent (No Expiry)' }
                ]}
              />
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                ✓ Shareable link ready!
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast('success', 'Copied to clipboard!');
                  }}
                  variant="primary"
                >
                  Copy
                </Button>
              </div>
              <div className="pt-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Here is the shared document: ${shareLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  💬 Share on WhatsApp
                </a>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
