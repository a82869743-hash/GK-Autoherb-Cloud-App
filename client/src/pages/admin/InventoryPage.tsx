import { useState, useRef, useEffect } from 'react';
import { Plus, Package, Edit2, Trash2, Check, Upload } from 'lucide-react';
import { useInventory, useCreateInventory, useUpdateInventory, useAdjustQuantity, useDeleteInventory } from '../../api/hooks/useInventory';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import SearchInput from '../../components/ui/SearchInput';
import DataTable, { Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import EmptyState from '../../components/shared/EmptyState';
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
  const { data, isLoading } = useInventory({ search, page, limit: 50 });

  // ─── Add/Edit Modal ─────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formQty, setFormQty] = useState(0);
  const [formThreshold, setFormThreshold] = useState(5);

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
      window.location.reload(); // Refresh data
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
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditItem(item);
    setFormName(item.product_name);
    setFormUnit(item.unit);
    setFormQty(parseFloat(item.quantity));
    setFormThreshold(parseFloat(item.low_stock_threshold));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast('error', 'Product name is required'); return; }
    try {
      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, product_name: formName, unit: formUnit, low_stock_threshold: formThreshold });
        toast('success', 'Product updated');
      } else {
        await createMut.mutateAsync({ product_name: formName, unit: formUnit, quantity: formQty, low_stock_threshold: formThreshold });
        toast('success', 'Product added');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to save');
    }
  };

  const handleInlineQtySave = async (id: number, currentQty: number) => {
    const newVal = parseFloat(editingQtyVal);
    if (isNaN(newVal)) { setEditingQtyId(null); return; }
    const delta = newVal - currentQty;
    if (delta === 0) { setEditingQtyId(null); return; }
    try {
      await adjustMut.mutateAsync({ id, delta });
      toast('success', 'Quantity updated');
    } catch { toast('error', 'Failed to update quantity'); }
    setEditingQtyId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast('success', 'Product deleted');
    } catch { toast('error', 'Failed to delete'); }
    setDeleteConfirmOpen(false);
    setDeleteId(null);
  };

  const columns: Column<any>[] = [
    {
      key: 'product_name',
      header: 'Product Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_low_stock && (
            <div className="w-1 h-8 bg-[#F57C00] rounded-full shrink-0" />
          )}
          <span className="font-bold text-[#1c1b1b]">{row.product_name}</span>
        </div>
      ),
    },
    { key: 'unit', header: 'Unit' },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row) => {
        if (editingQtyId === row.id) {
          return (
            <div className="flex items-center gap-1">
              <input
                ref={qtyInputRef}
                type="number"
                className="w-20 px-2 py-1 border border-[#D32F2F] rounded text-sm font-bold text-center bg-white focus:outline-none"
                value={editingQtyVal}
                onChange={(e) => setEditingQtyVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineQtySave(row.id, parseFloat(row.quantity));
                  if (e.key === 'Escape') setEditingQtyId(null);
                }}
                onBlur={() => handleInlineQtySave(row.id, parseFloat(row.quantity))}
              />
              <button
                onClick={() => handleInlineQtySave(row.id, parseFloat(row.quantity))}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check size={14} />
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={() => { setEditingQtyId(row.id); setEditingQtyVal(String(parseFloat(row.quantity))); }}
            className="font-bold text-[#1c1b1b] hover:text-[#D32F2F] cursor-pointer hover:underline transition-colors"
            title="Click to edit"
          >
            {parseFloat(row.quantity)}
          </button>
        );
      },
    },
    {
      key: 'low_stock_threshold',
      header: 'Low Stock Level',
      render: (row) => <span className="text-[#5f5e5e]">{parseFloat(row.low_stock_threshold)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => row.is_low_stock ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          Low Stock
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
          OK
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="p-2 rounded-lg text-gray-400 hover:text-[#D32F2F] hover:bg-red-50 transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); setDeleteConfirmOpen(true); }}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminTopBar
        title="Inventory"
        subtitle={`${data?.pagination?.total || 0} products`}
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
            <Button onClick={openAddModal} icon={<Plus size={16} />}>
              Add Product
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search products..."
          className="sm:w-80"
        />
      </div>

      {!isLoading && !data?.data?.length ? (
        <EmptyState
          icon={Package}
          title="No Products Found"
          description={search ? 'Try a different search' : 'Add your first inventory item'}
          actionLabel={!search ? '+ Add Product' : undefined}
          onAction={!search ? openAddModal : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          pagination={data?.pagination ? {
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            onPageChange: setPage,
          } : undefined}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Product' : 'Add Product'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>
              {editItem ? 'Save Changes' : 'Add Product'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Teflon Spray"
          />
          <Select
            label="Unit"
            options={unitOptions}
            value={formUnit}
            onChange={(e) => setFormUnit(e.target.value)}
          />
          {!editItem && (
            <Input
              label="Initial Quantity"
              type="number"
              value={formQty || ''}
              onChange={(e) => setFormQty(parseFloat(e.target.value) || 0)}
            />
          )}
          <Input
            label="Low Stock Threshold"
            type="number"
            value={formThreshold || ''}
            onChange={(e) => setFormThreshold(parseFloat(e.target.value) || 0)}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Product"
        message="This will hide the product from all lists. Historical job cart references will be preserved. Continue?"
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </>
  );
}
