import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList } from 'lucide-react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import DataTable, { Column } from '../../components/ui/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { formatINR, formatDate } from '../../utils/formatters';

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'open', label: 'Open' },
  { key: 'complete', label: 'Complete' },
];

export default function JobCartListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useJobCarts({ search, status, page, limit });

  const columns: Column<any>[] = [
    {
      key: 'registration_no',
      header: 'Vehicle',
      render: (row) => (
        <div>
          <span className="font-bold text-[#1c1b1b] tracking-wide">{row.registration_no}</span>
          <p className="text-[11px] text-[#5f5e5e] mt-0.5">{row.brand} {row.model}</p>
        </div>
      ),
    },
    { key: 'customer_name', header: 'Customer' },
    {
      key: 'visit_date',
      header: 'Date',
      render: (row) => <span className="text-[#5f5e5e]">{formatDate(row.visit_date)}</span>,
    },
    {
      key: 'visit_number',
      header: 'Visit #',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f6f3f2] text-xs font-bold text-[#1c1b1b]">
          {row.visit_number}
        </span>
      ),
    },
    {
      key: 'services_count',
      header: 'Services',
      render: (row) => <span className="text-[#5f5e5e]">{row.services_count}</span>,
    },
    {
      key: 'total_amount',
      header: 'Total',
      render: (row) => <span className="font-bold">{formatINR(row.total_amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <AdminTopBar
        title="Job Carts"
        subtitle={`${data?.pagination?.total || 0} total carts`}
        actions={
          <Button
            onClick={() => navigate('/admin/job-carts/new')}
            icon={<Plus size={16} />}
          >
            New Job Cart
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by reg no, customer, brand..."
          className="sm:w-80"
        />
        <Tabs
          tabs={statusTabs}
          activeTab={status}
          onTabChange={(t) => { setStatus(t); setPage(1); }}
        />
      </div>

      {/* Table */}
      {!isLoading && !data?.data?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No Job Carts Found"
          description={search || status !== 'all' ? 'Try changing your filters' : 'Create your first job cart to get started'}
          actionLabel={!search && status === 'all' ? '+ New Job Cart' : undefined}
          onAction={!search && status === 'all' ? () => navigate('/admin/job-carts/new') : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/admin/job-carts/${row.id}`)}
          pagination={data?.pagination ? {
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            onPageChange: setPage,
          } : undefined}
        />
      )}
    </>
  );
}
