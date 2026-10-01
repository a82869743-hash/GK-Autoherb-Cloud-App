import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckSquare, Square, Info, ShieldCheck, Lock, UserCheck, Key } from 'lucide-react';
import {
  useRoles,
  usePermissions,
  useRolePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useSaveRolePermissions,
} from '../../api/hooks/useRoles';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition, AnimatedCard, RippleButton, AnimatedModal } from '../../components/ui/Animations';
import toast from 'react-hot-toast';

export default function RoleManagementPage() {
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: permissions = [], isLoading: loadingPerms } = usePermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { data: activePermissions = [], refetch: refetchRolePerms } = useRolePermissions(selectedRoleId);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const savePermsMutation = useSaveRolePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');

  const [checkedPerms, setCheckedPerms] = useState<number[]>([]);

  useEffect(() => {
    if (roles.length > 0 && selectedRoleId === null) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles]);

  useEffect(() => {
    if (activePermissions) {
      setCheckedPerms(activePermissions);
    }
  }, [activePermissions, selectedRoleId]);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRole(role);
    setRoleName(role.role_name);
    setDescription(role.description || '');
    setIsModalOpen(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (editingRole) {
      updateMutation.mutate(
        { id: editingRole.id, role_name: roleName, description },
        {
          onSuccess: () => {
            toast.success('Role updated successfully');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to update role');
          },
        }
      );
    } else {
      createMutation.mutate(
        { role_name: roleName, description },
        {
          onSuccess: () => {
            toast.success('Role created successfully');
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to create role');
          },
        }
      );
    }
  };

  const handleDeleteRole = (id: number) => {
    if (!confirm('Are you sure you want to delete this custom role? Users assigned to this role will lose their custom permissions.')) {
      return;
    }

    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Role deleted');
        if (selectedRoleId === id) {
          setSelectedRoleId(roles.find((r: any) => r.id !== id)?.id || null);
        }
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to delete role');
      },
    });
  };

  const togglePermission = (permId: number) => {
    setCheckedPerms((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    savePermsMutation.mutate(
      { roleId: selectedRoleId, permissionIds: checkedPerms },
      {
        onSuccess: () => {
          toast.success('Permissions updated successfully');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || 'Failed to save permissions');
        },
      }
    );
  };

  const groupedPermissions = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const selectedRole = roles.find((r: any) => r.id === selectedRoleId);
  const systemRolesCount = roles.filter((r: any) => r.is_system_role === 1).length;
  const customRolesCount = roles.filter((r: any) => r.is_system_role === 0).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Role-Based Access Control (RBAC)"
        subtitle="Manage custom roles and granular studio operational permissions"
        badge={`${roles.length} roles`}
        actions={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Role</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="System Roles"
            value={`${systemRolesCount}`}
            subtitle="Core operational roles"
            icon={<Shield className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: 'Immutable', positive: true }}
          />
          <AdminMetricCard
            title="Custom Defined"
            value={`${customRolesCount}`}
            subtitle="User configured access"
            icon={<Lock className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${customRolesCount} active`, positive: true }}
          />
          <AdminMetricCard
            title="Total Capabilities"
            value={`${permissions.length}`}
            subtitle="Granular switch endpoints"
            icon={<Key className="w-5 h-5 text-sky-600" />}
            variant="sky"
            trend={{ text: `${Object.keys(groupedPermissions).length} modules`, positive: true }}
          />
          <AdminMetricCard
            title="Active Security"
            value="Enforced"
            subtitle="JWT + API gateway checks"
            icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Protected', positive: true }}
          />
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Roles list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Configured Roles</h3>
                <span className="text-xs text-slate-400 font-medium">{roles.length} total</span>
              </div>

              {loadingRoles ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role: any) => (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedRoleId === role.id
                          ? 'border-[#D32F2F] bg-red-50/50 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          {role.role_name}
                          {role.is_system_role === 1 && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md font-bold">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{role.description || 'Custom access role'}</p>
                      </div>

                      {role.is_system_role === 0 && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 hover:bg-white rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Permissions Matrix */}
          <div className="lg:col-span-2 space-y-4">
            {selectedRoleId ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Permissions for: <span className="text-[#D32F2F]">{selectedRole?.role_name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedRole?.description || 'Assign specific detailing capabilities for this user role.'}
                    </p>
                  </div>
                  {selectedRole?.is_system_role === 1 ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200">
                      <Info size={14} /> System roles hold full static permissions.
                    </div>
                  ) : (
                    <button
                      onClick={handleSavePermissions}
                      className="px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all"
                      disabled={savePermsMutation.isPending}
                    >
                      {savePermsMutation.isPending ? 'Saving...' : 'Save Permissions'}
                    </button>
                  )}
                </div>

                {loadingPerms ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(groupedPermissions).map((module) => (
                      <div key={module} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          {module} Capabilities
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {groupedPermissions[module].map((perm: any) => {
                            const isChecked = checkedPerms.includes(perm.id);
                            const isDisabled = selectedRole?.is_system_role === 1;

                            return (
                              <div
                                key={perm.id}
                                onClick={() => !isDisabled && togglePermission(perm.id)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all select-none ${
                                  isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-white bg-white/60 border border-slate-100'
                                }`}
                              >
                                <div className="mt-0.5 text-[#D32F2F]">
                                  {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-800">
                                    {perm.permission_key}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {perm.description}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-white text-slate-400 text-sm font-medium">
                Select or create a role to configure permissions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {editingRole ? 'Edit Role Details' : 'Create Custom Role'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Role Name
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-xs bg-slate-50 focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                placeholder="e.g. Detailing Floor Lead, Cashier"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-2xl px-4 py-2 text-xs bg-slate-50 focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none"
                placeholder="Briefly describe operational responsibilities..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all"
              onClick={handleSaveRole}
            >
              Save Role
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
