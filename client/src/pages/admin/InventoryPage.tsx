import { useState, useRef, useEffect } from 'react';
import { Plus, Package, Edit2, Trash2, Check, Upload, Search, ShieldAlert, BarChart3, HelpCircle, RefreshCw } from 'lucide-react';
import { useInventory, useCreateInventory, useUpdateInventory, useAdjustQuantity, useDeleteInventory } from '../../api/hooks/useInventory';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import PremiumStatCard from '../../components/shared/PremiumStatCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useUIStore } from '../../store/uiStore';
import api from '../../api/axiosInstance';

const unitOptions = [
  { value: 'ml', label: 'ml' },
  { value: 'litre', label: 'Litre' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'roll', label: 'Roll' },
];

export default function InventoryPage() {
  const toast = useUIStore((s) => s.toast);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useInventory({ search, page, limit: 100 });

  // ─── Add/Edit Modal ─────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formQty, setFormQty] = useState(0);
  const [formThreshold, setFormThreshold] = useState(5);
  const [formImage, setFormImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const createMut = useCreateInventory();
  const updateMut = useUpdateInventory();
  const adjustMut = useAdjustQuantity();
  const deleteMut = useDeleteInventory();

  // ─── Inline quantity edit ───────────────
  const [editingQtyId, setEditingQtyId] = useState<number | null>(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // ─── Delete confirm ─────────────────────
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (editingQtyId && qtyInputRef.current) qtyInputRef.current.focus();
  }, [editingQtyId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await api.post('/inventory/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast('success', res.data.message || 'Import successful');
      refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to import file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setEditItem(null);
    setFormName('');
    setFormUnit('pcs');
    setFormQty(0);
    setFormThreshold(5);
    setFormImage('');
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setFormName(item.product_name);
    setFormUnit(item.unit);
    setFormQty(parseFloat(item.quantity));
    setFormThreshold(parseFloat(item.low_stock_threshold));
    let imgUrl = '';
    if (item.images_json) {
      try {
        const arr = typeof item.images_json === 'string' ? JSON.parse(item.images_json) : item.images_json;
        if (Array.isArray(arr) && arr.length > 0) {
          imgUrl = arr[0];
        }
      } catch (e) {
        console.error(e);
      }
    }
    setFormImage(imgUrl);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast('error', 'Product name is required');
      return;
    }

    try {
      if (editItem) {
        await updateMut.mutateAsync({
          id: editItem.id,
          product_name: formName,
          unit: formUnit,
          low_stock_threshold: formThreshold,
          images_json: formImage ? [formImage] : []
        } as any);
        toast('success', 'Product updated successfully');
      } else {
        await createMut.mutateAsync({
          product_name: formName,
          unit: formUnit,
          quantity: formQty,
          low_stock_threshold: formThreshold,
          images_json: formImage ? [formImage] : []
        } as any);
        toast('success', 'Product added successfully');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleInlineQtySave = async (id: number, oldVal: number) => {
    const val = parseFloat(editingQtyVal);
    if (isNaN(val) || val < 0) {
      toast('error', 'Please enter a valid positive number');
      return;
    }

    const diff = val - oldVal;
    if (diff === 0) {
      setEditingQtyId(null);
      return;
    }

    try {
      await adjustMut.mutateAsync({
        id,
        delta: diff,
      });
      toast('success', 'Quantity updated successfully');
      setEditingQtyId(null);
      refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Adjustment failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast('success', 'Product deleted successfully');
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to delete product');
    }
  };

  // Compute stat totals
  const allItems = data?.data || [];
  
  // Filter items based on statusFilter
  const filteredItems = allItems.filter((item: any) => {
    if (statusFilter === 'low') return item.is_low_stock && parseFloat(item.quantity) > 0;
    if (statusFilter === 'out') return parseFloat(item.quantity) === 0;
    if (statusFilter === 'ok') return !item.is_low_stock && parseFloat(item.quantity) > 0;
    return true;
  });

  const totalProducts = allItems.length;
  const lowStockCount = allItems.filter((i: any) => i.is_low_stock && parseFloat(i.quantity) > 0).length;
  const outOfStockCount = allItems.filter((i: any) => parseFloat(i.quantity) === 0).length;
  const totalVolume = allItems.reduce((sum: number, i: any) => sum + (parseFloat(i.quantity) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <PremiumPageHeader
        title="Corporate Inventory Registry"
        subtitle="Manage product stocks, raw chemical materials, and low-level threshold triggers."
        icon={Package}
        iconColor="#2563EB"
        accentGradient="from-blue-600 to-indigo-600"
        actions={
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={<Upload size={16} />} loading={isUploading}>
              Import Excel
            </Button>
            <Button onClick={openAddModal} icon={<Plus size={16} />} className="shadow-lg shadow-blue-500/20">
              Add Product
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumStatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          color="#2563EB"
          gradient="from-blue-500/10 to-indigo-400/5"
          delay={0.1}
        />
        <PremiumStatCard
          title="Low Stock Items"
          value={lowStockCount}
          icon={ShieldAlert}
          color="#F59E0B"
          gradient="from-amber-500/10 to-yellow-400/5"
          delay={0.2}
        />
        <PremiumStatCard
          title="Out of Stock"
          value={outOfStockCount}
          icon={ShieldAlert}
          color="#EF4444"
          gradient="from-red-500/10 to-rose-400/5"
          delay={0.3}
        />
        <PremiumStatCard
          title="Total Stock Units"
          value={totalVolume}
          icon={BarChart3}
          color="#10B981"
          gradient="from-emerald-500/10 to-teal-400/5"
          delay={0.4}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full md:w-48">
          <select
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="ok">Stock level OK</option>
            <option value="low">Low stock alert</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading stock records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">No Products Found</p>
            <p className="text-xs text-gray-400 mt-1">Try refining search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Product ID</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Base Unit</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Alert Threshold</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((row: any) => {
                  const isLow = row.is_low_stock && parseFloat(row.quantity) > 0;
                  const isOut = parseFloat(row.quantity) === 0;

                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-400">
                        #INV-{String(row.id).padStart(4, '0')}
                      </td>
                      <td className="p-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-3">
                          {(() => {
                            let imgUrl = '';
                            if (row.images_json) {
                              try {
                                const arr = typeof row.images_json === 'string' ? JSON.parse(row.images_json) : row.images_json;
                                if (Array.isArray(arr) && arr.length > 0) imgUrl = arr[0];
                              } catch (e) {}
                            }
                            return imgUrl ? (
                              <img src={imgUrl} alt={row.product_name} className="w-8 h-8 rounded-lg object-contain border border-gray-100 bg-gray-50 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0 text-gray-300">
                                <Package size={14} />
                              </div>
                            );
                          })()}
                          <span>{row.product_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 uppercase font-bold text-xs">
                        {row.unit}
                      </td>
                      <td className="p-4">
                        {editingQtyId === row.id ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={qtyInputRef}
                              type="number"
                              className="w-16 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={editingQtyVal}
                              onChange={(e) => setEditingQtyVal(e.target.value)}
                            />
                            <button
                              onClick={() => handleInlineQtySave(row.id, parseFloat(row.quantity))}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingQtyId(row.id); setEditingQtyVal(String(parseFloat(row.quantity))); }}
                            className="font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            title="Click to quickly edit quantity"
                          >
                            {parseFloat(row.quantity)}
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-medium">
                        {parseFloat(row.low_stock_threshold)}
                      </td>
                      <td className="p-4">
                        {isOut ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="p-1.5 rounded-lg"
                            title="Edit Product Details"
                            onClick={() => openEditModal(row)}
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="p-1.5 rounded-lg hover:text-red-600 hover:bg-red-50"
                            title="Delete Product"
                            onClick={() => { setDeleteId(row.id); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Product' : 'Add Product'} size="sm"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>{editItem ? 'Save Changes' : 'Add Product'}</Button></>}
      >
        <div className="space-y-4 py-2">
          <Input label="Product Name *" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Teflon Spray" />
          <Select label="Unit *" options={unitOptions} value={formUnit} onChange={e => setFormUnit(e.target.value)} />
          {!editItem && <Input label="Initial Quantity *" type="number" value={formQty || ''} onChange={e => setFormQty(parseFloat(e.target.value) || 0)} />}
          <Input label="Low Stock Threshold *" type="number" value={formThreshold || ''} onChange={e => setFormThreshold(parseFloat(e.target.value) || 0)} />
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Product Image</label>
            <div className="flex items-center gap-3">
              {formImage ? (
                <div className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                  <img src={formImage} alt="Product" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormImage('')}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#D32F2F] flex flex-col items-center justify-center text-gray-400 hover:text-[#D32F2F] transition-colors shrink-0 cursor-pointer"
                >
                  <Upload size={16} />
                  <span className="text-[9px] font-bold mt-1">{uploadingImage ? '...' : 'Upload'}</span>
                </button>
              )}
              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('image', file);
                  setUploadingImage(true);
                  try {
                    const res = await api.post('/inventory/upload-image', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (res.data.success) {
                      setFormImage(res.data.url);
                      toast('success', 'Image uploaded successfully');
                    }
                  } catch (err: any) {
                    console.error(err);
                    toast('error', err.response?.data?.error || 'Failed to upload image');
                  } finally {
                    setUploadingImage(false);
                    if (imageInputRef.current) imageInputRef.current.value = '';
                  }
                }}
              />
              <div className="text-xs text-gray-400">
                <p className="font-semibold text-gray-600">Accessory Thumbnail</p>
                <p>Support JPG, PNG, WEBP. Max 10MB.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Product"
        message="This will hide the product from active inventory. Historical data references will be preserved. Continue?"
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
