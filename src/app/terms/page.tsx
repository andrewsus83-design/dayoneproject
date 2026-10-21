import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | all41',
  description: 'Terms of service, fair-use policies, and risk disclosures for all41 event platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#f8fafc] py-16 px-6 sm:px-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all41.app</span>
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181d2e] border border-[#25324e] text-xs font-semibold text-[#dfb76c] mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Platform Policy & Disclosures</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Terms of Service</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Effective Date: October 2026</p>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed border-t border-[#1e263d] pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Service Scope & Platform Access</h2>
            <p>
              all41 provides an all-in-one event experience platform including digital RSVP forms, QR gate attendance scanning, live photo wall streaming, interactive trivia games, and door prize raffles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. WhatsApp (BYON) Gateway & Automated System Rate-Limiting</h2>
            <p>
              Where WhatsApp messaging (via Fonnte or Bring Your Own Number) is utilized:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
              <li>Organizers are strictly advised to register a dedicated event number rather than primary personal numbers.</li>
              <li>To safeguard against carrier or WhatsApp anti-spam bans, all41 automatically enforces background rate-limiting, message throttling, and randomized delivery jitter. Users acknowledge that delivery is paced by the system.</li>
              <li>all41 is not liable for carrier or platform number suspensions resulting from spam reports from unsolicited recipients.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Cloudflare Storage & Fair-Use Policy</h2>
            <p>
              Photo wall uploads are compressed client-side to WebP format (maximum 2MB per image) and capped at 10 uploads per verified checked-in guest.
              All event media files are retained on Cloudflare R2 object storage for <strong>30 days</strong> following the event end date, after which they are automatically purged.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Event Organizer & Wedding Organizer (EO/WO) Cashback</h2>
            <p>
              Referral cashback commissions (10% to 18%) apply strictly to events with a minimum capacity of 100 guests. Cashback is calculated solely on the flat package fee plus extra guest top-ups (excluding add-ons). Cashback disbursements are processed manually by administrators following verified event completion with a minimum payout threshold of Rp 100,000.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
