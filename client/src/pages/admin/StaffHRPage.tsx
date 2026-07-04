import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckSquare, CalendarOff, Trophy, Plus, Clock, AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useStaffTasks, useCreateStaffTask, useUpdateTaskStatus, useStaffLeaves, useUpdateLeaveStatus, useStaffPerformance } from '../../api/hooks/useStaffHR';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import PremiumStatCard from '../../components/shared/PremiumStatCard';
import { PageTransition, AnimatedCard, RippleButton, AnimatedModal, StaggerList, StaggerItem } from '../../components/ui/Animations';

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
  cancelled: XCircle,
};

type Tab = 'tasks' | 'leaves' | 'performance';

export default function StaffHRPage() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' });

  const { data: tasks } = useStaffTasks();
  const { data: leaves } = useStaffLeaves();
  const { data: performance } = useStaffPerformance();
  const createTask = useCreateStaffTask();
  const updateTask = useUpdateTaskStatus();
  const updateLeave = useUpdateLeaveStatus();

  const pendingTasks = (tasks || []).filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled').length;
  const completedTasks = (tasks || []).filter((t: any) => t.status === 'completed').length;
  const pendingLeaves = (leaves || []).filter((l: any) => l.status === 'pending').length;

  const handleCreateTask = () => {
    createTask.mutate({ ...taskForm, assigned_to: parseInt(taskForm.assigned_to) }, {
      onSuccess: () => { setShowTaskModal(false); setTaskForm({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' }); }
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: pendingTasks },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarOff, count: pendingLeaves },
    { id: 'performance', label: 'Performance', icon: Trophy },
  ];

  return (
    <PageTransition className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PremiumPageHeader
        title="Staff HR"
        subtitle="Tasks, leave management, and performance tracking"
        icon={Users}
        iconColor="#0EA5E9"
        accentGradient="from-sky-600 to-sky-500"
        actions={<RippleButton onClick={() => setShowTaskModal(true)} variant="primary"><Plus size={14} className="mr-1" /> Assign Task</RippleButton>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumStatCard title="Active Tasks" value={pendingTasks} icon={CheckSquare} color="#0EA5E9" gradient="from-sky-500/10 to-sky-400/5" />
        <PremiumStatCard title="Completed" value={completedTasks} icon={CheckCircle} color="#10B981" gradient="from-emerald-500/10 to-emerald-400/5" delay={0.1} />
        <PremiumStatCard title="Pending Leaves" value={pendingLeaves} icon={CalendarOff} color="#F59E0B" gradient="from-amber-500/10 to-amber-400/5" delay={0.2} />
        <PremiumStatCard title="Team Members" value={(performance || []).length || 0} icon={Users} color="#7C3AED" gradient="from-purple-500/10 to-purple-400/5" delay={0.3} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-[#1c1b1b] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-[10px] bg-[#D32F2F] text-white px-1.5 py-0.5 rounded-full font-bold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <AnimatedCard className="bg-white rounded-2xl border border-gray-100" delay={0.15}>
          <div className="divide-y divide-gray-50">
            {(tasks || []).length === 0 ? (
              <div className="p-12 text-center"><CheckSquare size={40} className="mx-auto text-gray-200 mb-3" /><p className="text-sm text-gray-400">No tasks assigned yet</p></div>
            ) : (tasks || []).map((task: any, i: number) => {
              const StatusIcon = STATUS_ICONS[task.status] || Clock;
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <StatusIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[#1c1b1b]'}`}>{task.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${PRIORITY_STYLES[task.priority] || ''}`}>{task.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500">{task.staff_name || 'Unassigned'} {task.due_date ? `· Due ${new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>
                  </div>
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div className="flex gap-1.5 shrink-0">
                      {task.status === 'pending' && (
                        <RippleButton variant="ghost" onClick={() => updateTask.mutate({ id: task.id, status: 'in_progress' })}>Start</RippleButton>
                      )}
                      <RippleButton variant="primary" onClick={() => updateTask.mutate({ id: task.id, status: 'completed' })}>
                        <CheckCircle size={14} className="mr-1" /> Done
                      </RippleButton>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {/* Leaves Tab */}
      {tab === 'leaves' && (
        <AnimatedCard className="bg-white rounded-2xl border border-gray-100" delay={0.15}>
          <div className="divide-y divide-gray-50">
            {(leaves || []).length === 0 ? (
              <div className="p-12 text-center"><CalendarOff size={40} className="mx-auto text-gray-200 mb-3" /><p className="text-sm text-gray-400">No leave requests</p></div>
            ) : (leaves || []).map((leave: any, i: number) => (
              <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : leave.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <CalendarOff size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[#1c1b1b]">{leave.staff_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium capitalize">{leave.leave_type}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(leave.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {new Date(leave.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {leave.days} day{leave.days > 1 ? 's' : ''}
                  </p>
                  {leave.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{leave.reason}</p>}
                </div>
                <div className="shrink-0">
                  {leave.status === 'pending' ? (
                    <div className="flex gap-1.5">
                      <RippleButton variant="primary" onClick={() => updateLeave.mutate({ id: leave.id, status: 'approved' })}>Approve</RippleButton>
                      <RippleButton variant="danger" onClick={() => updateLeave.mutate({ id: leave.id, status: 'rejected' })}>Reject</RippleButton>
                    </div>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>{leave.status}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      )}

      {/* Performance Tab */}
      {tab === 'performance' && (
        <AnimatedCard className="bg-white rounded-2xl border border-gray-100 overflow-hidden" delay={0.15}>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Staff</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Jobs</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rating</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Attendance</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Bonus</th>
            </tr></thead>
            <tbody>
              {(performance || []).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No performance data yet</td></tr>
              ) : (performance || []).map((p: any, i: number) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-medium text-[#1c1b1b]">{p.staff_name}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{p.period}</td>
                  <td className="py-3 px-4 text-center font-semibold">{p.jobs_completed}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${parseFloat(p.avg_rating) >= 4 ? 'bg-emerald-50 text-emerald-700' : parseFloat(p.avg_rating) >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      ★ {parseFloat(p.avg_rating).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${p.attendance_pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{p.attendance_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{parseFloat(p.bonus_amount).toLocaleString('en-IN')}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </AnimatedCard>
      )}

      {/* Assign Task Modal */}
      <AnimatedModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-[#1c1b1b] mb-6">Assign Task</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Staff ID</label>
              <input value={taskForm.assigned_to} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Staff member ID" />
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Task Title</label>
              <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="What needs to be done?" />
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Description</label>
              <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Task details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <RippleButton variant="ghost" onClick={() => setShowTaskModal(false)}>Cancel</RippleButton>
              <RippleButton variant="primary" onClick={handleCreateTask}>Assign Task</RippleButton>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
