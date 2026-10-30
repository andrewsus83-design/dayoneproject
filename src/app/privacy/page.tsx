import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | dayoneproject.xyz',
  description: 'What personal data the dayoneproject.xyz event platform holds, who processes it, how long it is kept and how to use your rights.',
};

const CONTACT_EMAIL = 'info@dayoneproject.xyz';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-8">
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

const PROCESSORS: [string, string][] = [
  ['Supabase (cloud database)', 'Stores accounts, event setup, guest lists, RSVP answers, check-ins and guest photos (Supabase Storage).'],
  ['Vercel', 'Hosts the website and runs the server code that shows event pages.'],
  ['Resend', 'Sends the sign-in code emails for organizer and admin accounts.'],
  ['Fonnte', 'Sends WhatsApp messages from our shared platform number. Messages are then delivered by WhatsApp (Meta).'],
  ['Google Fonts', 'Serves some of the typefaces used on event pages. Your browser asks Google for the font files, so Google sees your IP address.'],
  ['Image CDN', 'Some images, such as theme and sample pictures, load from a third-party image CDN, which sees your IP address like any other web request.'],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans py-12 sm:py-16 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white scale-on-click"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dayoneproject.xyz</span>
        </Link>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-premium-charcoal border border-premium-borderDark text-xs font-semibold text-premium-gold">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-zinc-500 font-mono">Last updated: 30 October 2026</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This policy explains what personal data the dayoneproject.xyz event platform holds, why, who helps us process it, how long
            we keep it, and how you can use your rights under Indonesia&apos;s Personal Data Protection Law (UU PDP No. 27/2022).
          </p>
        </header>

        <div className="space-y-10 border-t border-premium-borderDark pt-8">
          <Section id="who" title="1. Who is responsible">
            <p>
              The controller of personal data on this platform is <strong className="text-white">Day One Project (dayoneproject.xyz)</strong>.
              Event hosts (organizers) use the platform to build event pages, invite guests and run the event day. The host decides who to
              invite and which questions the RSVP form asks; we store and process that data so their event can run.
            </p>
            <p>
              Contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-premium-gold hover:text-premium-goldHover font-mono">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="collect" title="2. What we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Organizer, team and desk accounts:</strong> name, email address, organization name, role, and
                what is needed to sign you in (one-time email codes, and an authenticator app if you set one up).
              </li>
              <li>
                <strong className="text-white">Event setup:</strong> event name, date, venue, landing page and invitation content, and the
                images you upload.
              </li>
              <li>
                <strong className="text-white">Guest data:</strong> names, email addresses, phone numbers, answers to the event&apos;s RSVP
                form (for example plus-ones or meal preferences), RSVP status, the guest&apos;s QR pass, and check-in time.
              </li>
              <li>
                <strong className="text-white">Event-day activity:</strong> photos uploaded to the photo wall, trivia answers and scores,
                door prize results and feedback answers.
              </li>
              <li>
                <strong className="text-white">Technical data:</strong> request logs kept by our hosting providers (IP address, browser and
                time of the request) for security and troubleshooting.
              </li>
            </ul>
          </Section>

          <Section id="use" title="3. How we use it">
            <ul className="list-disc pl-5 space-y-2">
              <li>To publish the event page and collect RSVPs.</li>
              <li>To send invitations, passes, reminders and thank-you messages when the host asks us to.</li>
              <li>To check guests in at the door and to run day-of activities for checked-in guests.</li>
              <li>To show the host their guest list, RSVP replies and check-in numbers.</li>
              <li>To sign people in and keep the platform secure.</li>
            </ul>
            <p>
              We rely on the consent you give when you reply to an invitation or upload a photo, on the agreement with the event host or
              organizer who uses the platform, and on our legitimate interest in keeping the service secure.
              We do not sell personal data and we do not use it for advertising.
            </p>
          </Section>

          <Section id="processors" title="4. Who processes data for us">
            <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark divide-y divide-premium-borderDark">
              {PROCESSORS.map(([name, what]) => (
                <div key={name} className="p-4 sm:p-5 sm:flex sm:gap-6">
                  <div className="text-sm font-display font-bold text-white sm:w-48 flex-shrink-0">{name}</div>
                  <div className="text-sm text-zinc-400 mt-1 sm:mt-0">{what}</div>
                </div>
              ))}
            </div>
            <p>
              These providers may process data outside Indonesia. Each one only receives the data it needs to do its part.
            </p>
          </Section>

          <Section id="whatsapp" title="5. WhatsApp messages">
            <p>
              When a host sends WhatsApp messages through the platform, the guest&apos;s phone number and the message go to Fonnte, which
              sends them from one shared platform number. To protect that number from being flagged as spam, our system automatically
              spaces messages 5–15 seconds apart. If you do not want messages about an event, tell the host or email us.
            </p>
          </Section>

          <Section id="photos" title="6. Photos">
            <p>
              Photos you upload to an event&apos;s photo wall are shown on that event&apos;s photo wall and on screens at the venue, so other
              guests can see them. They are stored with Supabase Storage and deleted within 30 days after the event. You can ask the host
              to remove a photo at any time, or email us.
            </p>
          </Section>

          <Section id="retention" title="7. How long we keep data">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Photo wall uploads:</strong> deleted within 30 days after the event.</li>
              <li>
                <strong className="text-white">Guest lists, RSVP answers and check-ins:</strong> kept while the event stays on the platform so
                the host can review it, and deleted with the event when the host deletes it, or earlier if you ask us.
              </li>
              <li><strong className="text-white">Accounts:</strong> kept while the account is active, and deleted when you ask us to close it.</li>
              <li><strong className="text-white">Request logs:</strong> kept by our hosting providers for a limited time under their own policies.</li>
            </ul>
          </Section>

          <Section id="rights" title="8. Your rights">
            <p>Under UU PDP No. 27/2022 you can:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Access</strong> your personal data and get a copy of it.</li>
              <li><strong className="text-white">Correct</strong> data that is wrong or incomplete.</li>
              <li><strong className="text-white">Delete</strong> your data, or ask us to stop processing it.</li>
              <li>
                <strong className="text-white">Withdraw your consent</strong> at any time. This stops further processing based on consent; it
                does not undo processing that already happened.
              </li>
            </ul>
            <p>
              To use these rights, contact the event host who invited you, or email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-premium-gold hover:text-premium-goldHover font-mono">{CONTACT_EMAIL}</a>.
              We may ask you to confirm who you are, and we reply within the time limits set by UU PDP. If a guest&apos;s data is deleted
              before the event, their invitation link and QR pass stop working.
            </p>
          </Section>

          <Section id="security" title="9. Security">
            <p>
              All connections use HTTPS. Event data can only be read by the host&apos;s signed-in team, our platform administrators and our server code. Invitation links
              and QR passes use long random codes. If a data breach affects your personal data, we will tell you and the authorities as
              UU PDP requires.
            </p>
          </Section>

          <Section id="cookies" title="10. Cookies and browser storage">
            <p>
              We only use cookies and browser storage that the platform needs to work: keeping you signed in, remembering a register desk
              device, and saving drafts while you edit an event. We do not use advertising or tracking cookies.
            </p>
          </Section>

          <Section id="children" title="11. Children">
            <p>
              The platform is meant for event hosts and the guests they invite. If a guest is under 18, the host should only add their
              details with a parent or guardian&apos;s consent.
            </p>
          </Section>

          <Section id="changes" title="12. Changes to this policy">
            <p>
              If we change how we handle personal data, we will update this page and the date at the top. For questions, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-premium-gold hover:text-premium-goldHover font-mono">{CONTACT_EMAIL}</a>.
              See also our <Link href="/terms" className="text-premium-gold hover:text-premium-goldHover">Terms of Service</Link>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
