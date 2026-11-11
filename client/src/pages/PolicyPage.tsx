import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react';
import { usePublicSettings } from '../api/hooks/useSettings';

/**
 * Public policy pages (Terms, Privacy, Refunds, Service delivery, Contact).
 * Needed for Razorpay activation and the Play Store listing. Studio details come from
 * Admin → Settings, so editing them there updates these pages too.
 */
export type PolicyKind = 'terms' | 'privacy' | 'refund' | 'shipping' | 'contact';

export const POLICY_LINKS: { kind: PolicyKind; to: string; label: string }[] = [
  { kind: 'terms', to: '/terms', label: 'Terms' },
  { kind: 'privacy', to: '/privacy', label: 'Privacy' },
  { kind: 'refund', to: '/refund-policy', label: 'Refunds & cancellation' },
  { kind: 'shipping', to: '/shipping-policy', label: 'Service delivery' },
  { kind: 'contact', to: '/contact', label: 'Contact us' },
];

export function PolicyLinks({ className = '' }: { className?: string }) {
  return (
    <nav className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-slate-400 ${className}`}>
      {POLICY_LINKS.map((l) => (
        <Link key={l.kind} to={l.to} className="hover:text-[#D32F2F] underline-offset-2 hover:underline">{l.label}</Link>
      ))}
    </nav>
  );
}

const UPDATED = '11 November 2026';

export default function PolicyPage({ kind }: { kind: PolicyKind }) {
  const navigate = useNavigate();
  const { data } = usePublicSettings();
  const s = data?.data || {};
  const name: string = s.studio_name || 'GK AutoHerb Car Detailing Studio';
  const area: string = s.studio_area || 'Gotri - Vasna - Bhayli Road, Vadodara';
  const street = String(s.studio_address || '').trim().replace(/[\s,]+$/, '');
  const parts = [street, street.toLowerCase().includes(area.toLowerCase()) ? '' : area].filter(Boolean);
  if (!/gujarat/i.test(parts.join(' '))) parts.push('Gujarat, India');
  const address: string = parts.join(', ');
  const mobile: string = s.studio_mobile || '9408424541';
  const email: string = s.studio_email || 'gkautoherb@gmail.com';
  const gst: string = s.studio_gst || '';

  const contactBlock = (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-[14px] text-slate-700">
      <p className="font-bold text-slate-900">{name}</p>
      <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#D32F2F]" />{address}</p>
      <p className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-[#D32F2F]" /><a href={`tel:+91${mobile}`} className="hover:underline">+91 {mobile}</a></p>
      <p className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-[#D32F2F]" /><a href={`mailto:${email}`} className="hover:underline break-all">{email}</a></p>
      {gst && <p className="text-[12px] text-slate-500">GSTIN: {gst}</p>}
    </div>
  );

  const pages: Record<PolicyKind, { title: string; body: JSX.Element }> = {
    terms: {
      title: 'Terms & Conditions',
      body: (
        <>
          <p>These terms apply when you use the {name} website, mobile app, or book any service with us. By creating an account or making a booking you agree to them.</p>
          <H>Services</H>
          <p>We provide car care and detailing services (washing, interior cleaning, polishing, ceramic and graphene coating, paint protection film and related services) and sell car care products. Service details, duration and prices are shown in the app before you book. Prices depend on your car type and include taxes where applicable.</p>
          <H>Bookings</H>
          <p>A booking is confirmed when you receive a confirmation in the app, by SMS or WhatsApp. Please bring your car to the studio at the chosen slot time, or be available for pickup if you chose pickup and drop. If you are more than 30 minutes late we may need to move your booking to the next free slot.</p>
          <H>Payments</H>
          <p>You can pay online (UPI, cards, net banking, wallets) through our payment partner Razorpay, by UPI QR, or at the studio. Online payments are processed securely by Razorpay; we never see or store your card details. Packages may also be paid in instalments where offered.</p>
          <H>Your car</H>
          <p>Please remove valuables from your car before the service. We take full care of your car while it is with us. Any concern about the work must be reported at delivery or within 24 hours, so we can inspect and fix it. Results of coatings and correction depend on the condition of the paint; we will explain what to expect before starting.</p>
          <H>Packages, offers and rewards</H>
          <p>Packages are valid for the period and number of services stated at purchase and are linked to the vehicle they were bought for. Offers, coupons and loyalty rewards cannot be exchanged for cash and may change or end at any time.</p>
          <H>Account</H>
          <p>You log in with your mobile number and a one-time code. Keep your phone secure and do not share codes. We may suspend accounts that are misused.</p>
          <H>Changes and law</H>
          <p>We may update these terms; the latest version is always on this page. These terms are governed by the laws of India and courts in Vadodara, Gujarat have jurisdiction.</p>
        </>
      ),
    },
    privacy: {
      title: 'Privacy Policy',
      body: (
        <>
          <p>{name} ("we") respects your privacy. This policy explains what we collect through our website and mobile app and how we use it.</p>
          <H>What we collect</H>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your name, mobile number, email (optional), addresses, birthday or anniversary (optional).</li>
            <li>Vehicle details such as make, model and registration number.</li>
            <li>Booking, service, invoice and payment records (payment card or UPI details are handled by Razorpay, not by us).</li>
            <li>Your location, only when you choose to share it for pickup and drop or to find the studio.</li>
            <li>Photos and videos of your car taken during the service (before/after).</li>
            <li>A notification token for your phone, if you allow notifications.</li>
          </ul>
          <H>How we use it</H>
          <p>To take and manage bookings, send booking reminders, OTP codes, service updates and invoices by SMS, WhatsApp, app notification or email, give rewards, answer your questions, and improve our services. We may send offers; you can ask us to stop at any time.</p>
          <H>Sharing</H>
          <p>We do not sell your data. We share only what is needed with service providers that help us run the service: payment processing (Razorpay), SMS and WhatsApp delivery, cloud hosting, and push notifications (Google Firebase). We may share data if required by law.</p>
          <H>Storage and security</H>
          <p>Your data is stored on secured servers in India, accessed only by authorised staff, and kept as long as your account is active or as required for tax and legal records.</p>
          <H>Your choices</H>
          <p>You can view and edit your profile in the app, turn off notifications in your phone settings, and ask us to delete your account and data by contacting us below. We will act on your request within 30 days, except records we must keep by law.</p>
          <H>Contact</H>
          <p>For any privacy question or request, contact us:</p>
          {contactBlock}
        </>
      ),
    },
    refund: {
      title: 'Refund & Cancellation Policy',
      body: (
        <>
          <H>Cancelling or rescheduling a booking</H>
          <p>You can cancel or reschedule a booking from the app up to 2 hours before the slot time (up to 3 reschedules per booking). Closer to the slot, please call the studio.</p>
          <H>Refund of advance payments</H>
          <p>If you paid an advance online and cancel within the allowed time, the full advance is refunded to the original payment method within 5–7 working days. If we cancel or cannot provide the service, you get a full refund.</p>
          <H>Completed services</H>
          <p>Services that have been performed cannot be refunded. If you are not satisfied, tell us at delivery or within 24 hours and we will inspect and redo the affected work free of charge.</p>
          <H>Packages</H>
          <p>An unused package can be cancelled within 7 days of purchase for a full refund. Once any service from a package has been used, the package is non-refundable. For instalment (EMI) packages, instalments already paid towards services used are non-refundable.</p>
          <H>Products</H>
          <p>Unopened products can be returned within 7 days of purchase. Damaged or wrong items are replaced or refunded if reported within 48 hours. Opened or used products cannot be returned.</p>
          <H>How refunds are paid</H>
          <p>Approved refunds are made to the original payment method (UPI, card, net banking or wallet) within 5–7 working days. Cash payments are refunded at the studio or by UPI.</p>
          <H>Ask for a refund</H>
          {contactBlock}
        </>
      ),
    },
    shipping: {
      title: 'Service Delivery Policy',
      body: (
        <>
          <p>We are a car detailing studio in Vadodara, Gujarat. We do not ship physical goods by courier.</p>
          <H>Services</H>
          <p>Services are delivered at our studio on the date and slot you book. The expected time for each service is shown when you book; we update you by SMS, WhatsApp or app notification when your car is ready.</p>
          <H>Pickup and drop</H>
          <p>Where available, we pick up and drop your car within Vadodara city at the time you choose. Pickup and drop charges, if any, are shown before you confirm the booking.</p>
          <H>Products</H>
          <p>Car care products bought from us are handed over at the studio, or delivered locally in Vadodara within 1–3 working days where offered. Delivery charges, if any, are shown at checkout.</p>
          <H>Questions</H>
          {contactBlock}
        </>
      ),
    },
    contact: {
      title: 'Contact Us',
      body: (
        <>
          <p>We are happy to help with bookings, payments, refunds or any question about your car.</p>
          {contactBlock}
          <p className="mt-4">You can also message us on WhatsApp at the number above, or use the chat inside the app.</p>
        </>
      ),
    },
  };

  const page = pages[kind];
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-[#111111] text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back" className="rounded-full p-1.5 hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold">GK AutoHerb</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 text-[14px] leading-relaxed text-slate-700 space-y-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{page.title}</h1>
        <p className="text-[12px] text-slate-400">Last updated: {UPDATED}</p>
        {page.body}
        <div className="pt-8 pb-4 border-t border-slate-100 mt-8">
          <PolicyLinks />
          <p className="mt-2 text-center text-[11px] text-slate-400">© {new Date().getFullYear()} {name}</p>
        </div>
      </main>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-3 text-[16px] font-bold text-slate-900">{children}</h2>;
}
