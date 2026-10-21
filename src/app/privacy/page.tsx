import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | all41',
  description: 'Attendee data protection and privacy policies for all41 event platform',
};

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181d2e] border border-[#25324e] text-xs font-semibold text-[#00f0ff] mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Privacy Policy</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Effective Date: October 2026</p>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed border-t border-[#1e263d] pt-6">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Attendee Information Handling</h2>
            <p>
              Attendee names, email addresses, phone numbers, and dietary preferences collected via RSVP invitations are stored securely in Supabase PostgreSQL databases and utilized exclusively for event gate admission and communication.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Media & Live Broadcasts</h2>
            <p>
              Photos submitted to the Live Photo Wall are broadcast onto stage screens in the venue. Guests can request image removal through the event host at any time. Images are permanently expunged 30 days after the event.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
