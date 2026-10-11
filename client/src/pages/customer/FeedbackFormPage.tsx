import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MessageSquare, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useFeedbackFormContext, useSubmitFeedback } from '../../api/hooks/useFeedback';
import { PageTransition, AnimatedCard, RippleButton } from '../../components/ui/Animations';
import toast from 'react-hot-toast';

export default function FeedbackFormPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data: context, isLoading, isError } = useFeedbackFormContext(token);
  const submitMutation = useSubmitFeedback();

  const [ratings, setRatings] = useState({
    overall_rating: 5,
    service_rating: 5,
    staff_rating: 5,
    cleanliness_rating: 5,
  });
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ is_google_eligible?: boolean; google_review_url?: string | null } | null>(null);

  const handleRatingChange = (key: keyof typeof ratings, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    submitMutation.mutate(
      {
        token,
        overall_rating: ratings.overall_rating,
        service_rating: ratings.service_rating,
        staff_rating: ratings.staff_rating,
        cleanliness_rating: ratings.cleanliness_rating,
        comments,
      },
      {
        onSuccess: (data: any) => {
          setSubmitResult(data);
          setSubmitted(true);
          toast.success('Thank you for your valuable feedback!');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || 'Failed to submit feedback');
        },
      }
    );
  };

  const renderStarSelector = (key: keyof typeof ratings, label: string) => {
    const currentVal = ratings[key];
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/30">
        <span className="text-sm font-semibold text-gray-700 mb-2 sm:mb-0">{label}</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(key, star)}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                size={22}
                className={
                  star <= currentVal
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300 hover:text-amber-300'
                }
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Loading feedback context...</p>
        </div>
      </div>
    );
  }

  if (isError || !context) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <AnimatedCard className="bg-white p-8 rounded-2xl max-w-md w-full border border-gray-100 text-center shadow-sm">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1c1b1b]">Invalid or Expired Link</h3>
          <p className="text-sm text-gray-500 mt-2">
            This feedback link is invalid, expired, or feedback has already been submitted for this visit.
          </p>
          <RippleButton
            variant="primary"
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
          >
            Go to Home
          </RippleButton>
        </AnimatedCard>
      </div>
    );
  }

  if (submitted) {
    const isGoogleEligible = submitResult?.is_google_eligible;
    const googleUrl = submitResult?.google_review_url || 'https://search.google.com/local/writereview?placeid=ChIJn8N3wS1wXzkR8W6_m4gq5uU';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <AnimatedCard className="bg-white p-8 rounded-3xl max-w-md w-full border border-gray-100 text-center shadow-lg">
          {isGoogleEligible ? (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Star size={36} className="text-amber-500 fill-amber-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Studio Quality Score: {ratings.overall_rating} / 5 ★
              </span>
              <h3 className="text-xl font-black text-[#1c1b1b] mt-3 flex items-center justify-center gap-1.5">
                Thank You, {context.customer_name}! <Sparkles size={18} className="text-amber-500" />
              </h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                We're thrilled you had a 5-star experience! Reviews from car enthusiasts like you help our local studio in Vadodara grow.
              </p>
              
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200/80 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black">
                    G
                  </div>
                  <span className="text-xs font-bold text-gray-900">Share on Google Reviews</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Takes less than 30 seconds. Your review means the world to our detailing artisans!
                </p>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white rounded-xl font-black text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Star size={14} className="fill-white" />
                  <span>Post Review on Google</span>
                  <span className="text-amber-200 group-hover:translate-x-0.5 transition-transform">→</span>
                </a>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                Invoice: <span className="font-semibold text-gray-600">{context.invoice_number}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-3 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Done / Back to Home
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <CheckCircle size={36} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-[#1c1b1b] flex items-center justify-center gap-1.5">
                We Hear You Loud & Clear
              </h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Thank you for your candid feedback. We are truly sorry we didn't meet your expectations today. Our studio manager has been personally notified and will review your comments to make this right.
              </p>
              <div className="mt-5 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                Invoice: <span className="font-semibold text-gray-600">{context.invoice_number}</span>
              </div>
              <RippleButton
                variant="primary"
                onClick={() => navigate('/')}
                className="mt-4 w-full bg-[#1c1b1b] hover:bg-black text-white rounded-xl text-xs font-bold py-2.5"
              >
                Done / Return Home
              </RippleButton>
            </>
          )}
        </AnimatedCard>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <AnimatedCard className="bg-white p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-gray-100 shadow-md">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-50 text-amber-500 rounded-2xl mb-3">
            <MessageSquare size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#1c1b1b]">Share Your Experience</h2>
          <p className="text-xs text-gray-400 mt-1">
            Hi {context.customer_name}, help us improve our wash standards!
          </p>
          <div className="mt-2 text-xs bg-gray-50 inline-block px-3 py-1 rounded-full text-gray-500 border border-gray-100">
            Invoice: <span className="font-semibold">{context.invoice_number}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderStarSelector('overall_rating', 'Overall Satisfaction')}
          {renderStarSelector('service_rating', 'Wash & Service Quality')}
          {renderStarSelector('staff_rating', 'Staff Behavior / Politeness')}
          {renderStarSelector('cleanliness_rating', 'Outlet Cleanliness')}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Any specific comments or feedback?
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Tell us what you liked or how we can improve..."
            />
          </div>

          <RippleButton
            type="submit"
            variant="primary"
            disabled={submitMutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold py-2.5 shadow-sm"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </RippleButton>
        </form>
      </AnimatedCard>
    </PageTransition>
  );
}
