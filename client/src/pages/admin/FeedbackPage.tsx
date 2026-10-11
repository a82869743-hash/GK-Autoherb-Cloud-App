import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Reply, BarChart3, Sparkles, ShieldCheck } from 'lucide-react';
import { useFeedback, useFeedbackStats, useReplyFeedback } from '../../api/hooks/useFeedback';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { AnimatedModal, RippleButton } from '../../components/ui/Animations';

export default function FeedbackPage() {
  const [replyModal, setReplyModal] = useState<{ id: number; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const { data: feedbackData, isLoading } = useFeedback();
  const { data: stats } = useFeedbackStats();
  const replyMutation = useReplyFeedback();

  const handleReply = () => {
    if (replyModal) {
      replyMutation.mutate({ id: replyModal.id, admin_reply: replyText }, {
        onSuccess: () => { setReplyModal(null); setReplyText(''); }
      });
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
    ));

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Customer Reviews & Feedback"
        subtitle="Customer satisfaction telemetry, detailing quality scorecards, and client replies"
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Total Customer Reviews"
          value={stats?.total_reviews || 0}
          trend={{ text: 'Verified ratings', positive: true }}
          icon={<MessageSquare size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Studio Average Rating"
          value={`${Number(stats?.avg_rating || 0).toFixed(1)} / 5.0`}
          trend={{ text: 'Client satisfaction', positive: true }}
          icon={<Star size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Positive Experiences"
          value={stats?.positive_count || 0}
          trend={{ text: '4 & 5-star ratings', positive: true }}
          icon={<ThumbsUp size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Needs Follow-up"
          value={stats?.negative_count || 0}
          trend={{ text: 'Requires attention', positive: false }}
          icon={<ThumbsDown size={20} />}
          accentColor="rose"
        />
      </div>

      {/* Google Review Funnel & Rating Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Review Funnel */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>Google Review Conversion Funnel</span>
              </h3>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Threshold: ≥{stats?.settings?.feedback_google_threshold || 4} ★
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Automated review invitations sent via WhatsApp post-service delivery, filtered to route 4★ & 5★ ratings to your public Google Business profile.
            </p>

            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invites Sent</p>
                <p className="text-lg font-black text-slate-900 mt-1">{stats?.funnel?.sent || 0}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Responded</p>
                <p className="text-lg font-black text-indigo-700 mt-1">{stats?.funnel?.responded || 0}</p>
                <p className="text-[9px] text-indigo-400 font-bold mt-0.5">{stats?.funnel?.conversion_rate || 0}% Response</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Pushed to Google</p>
                <p className="text-lg font-black text-emerald-700 mt-1">{stats?.funnel?.pushed_to_google || 0}</p>
                <p className="text-[9px] text-emerald-500 font-bold mt-0.5">High Satisfaction</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium truncate max-w-[240px]">
              Destination: {stats?.settings?.google_review_url ? 'Google Business Place Profile' : 'Default Studio Link'}
            </span>
            <a
              href={stats?.settings?.google_review_url || 'https://search.google.com/local/writereview?placeid=ChIJn8N3wS1wXzkR8W6_m4gq5uU'}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#D32F2F] hover:underline shrink-0"
            >
              Test Link ↗
            </a>
          </div>
        </div>

        {/* Rating Distribution */}
        {stats?.distribution && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-[#D32F2F]" />
              <span>Rating Distribution Breakdown</span>
            </h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(r => {
                const count = stats.distribution.find((d: any) => d.rating === r)?.count || 0;
                const pct = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16 text-xs font-bold text-slate-700">
                      {r} <Star size={12} className="text-amber-400 fill-amber-400" />
                    </div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400 w-12 text-right">{count} ({Math.round(pct)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900">Recent Customer Reviews</h3>
          <span className="text-xs font-bold text-slate-400">Showing latest feedbacks</span>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)
          ) : (feedbackData?.data || []).map((fb: any) => (
            <div 
              key={fb.id} 
              className="p-5 rounded-2xl border border-slate-200/80 hover:border-red-200 bg-slate-50/40 hover:bg-white transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-sm text-slate-900">{fb.customer_name || 'Customer'}</span>
                    <div className="flex items-center gap-0.5">{renderStars(fb.rating)}</div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium mt-2">{fb.review_text || 'No comment provided'}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-2">
                    {new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {fb.admin_reply && (
                    <div className="mt-3 pl-3.5 border-l-2 border-[#D32F2F] bg-red-50/50 p-3 rounded-r-xl">
                      <p className="text-xs text-slate-600">
                        <span className="font-bold text-[#b71c1c] mr-1.5">AutoHerb Response:</span> 
                        {fb.admin_reply}
                      </p>
                    </div>
                  )}
                </div>
                {!fb.admin_reply && (
                  <button 
                    onClick={() => setReplyModal({ id: fb.id, name: fb.customer_name })}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-[#D32F2F] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Reply size={13} />
                    <span>Reply</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {!feedbackData?.data?.length && !isLoading && (
            <p className="text-center text-slate-400 py-12 text-xs font-bold">No feedback entries recorded yet.</p>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      <AnimatedModal isOpen={!!replyModal} onClose={() => setReplyModal(null)}>
        <div className="p-6 font-sans">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Reply to {replyModal?.name}</h3>
          <p className="text-xs text-slate-500 mb-4">Your response will appear under the customer's review in the customer app.</p>
          <textarea 
            value={replyText} 
            onChange={e => setReplyText(e.target.value)} 
            rows={4} 
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] bg-slate-50 focus:bg-white resize-none" 
            placeholder="Type your official studio response..." 
          />
          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setReplyModal(null)}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-sm transition-all disabled:opacity-50"
            >
              {replyMutation.isPending ? 'Sending...' : 'Publish Response'}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
