import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | dayoneproject.xyz',
  description: 'Terms for hosts and guests using the dayoneproject.xyz event platform, including the WhatsApp pacing and risk disclosure.',
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

export default function TermsPage() {
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
            <Shield className="w-3.5 h-3.5" />
            <span>Platform Policy & Disclosures</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-zinc-500 font-mono">Last updated: 30 October 2026</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            These terms apply to everyone who uses the dayoneproject.xyz event platform: event hosts and their teams, register desk
            staff, and guests who open an event page. By using the platform you agree to them.
          </p>
        </header>

        <div className="space-y-10 border-t border-premium-borderDark pt-8">
          <Section id="service" title="1. The service">
            <p>
              Day One Project (dayoneproject.xyz) provides an event platform: event landing pages, invitation and RSVP forms, QR passes and
              door check-in, email and WhatsApp messages to guests, a photo wall, trivia games, door prize draws and stage screens.
            </p>
          </Section>

          <Section id="accounts" title="2. Accounts and sign-in">
            <ul className="list-disc pl-5 space-y-2">
              <li>Organizers and admins sign in with a one-time code we email to them (sent through Resend), or with an authenticator app.</li>
              <li>Keep your sign-in codes, authenticator and register desk access codes private. You are responsible for what happens under your account.</li>
              <li>You are responsible for the team members and desk staff you add, and for removing their access when they no longer need it.</li>
            </ul>
          </Section>

          <Section id="hosts" title="3. Hosting an event">
            <ul className="list-disc pl-5 space-y-2">
              <li>Only add guests and send them messages when you have a lawful reason to, such as an invitation they expect.</li>
              <li>Ask only for the information you need for the event. Avoid sensitive data unless it is necessary and the guest agrees.</li>
              <li>You are responsible for the content you publish on your event page, invitation and messages.</li>
              <li>
                Gift details on wedding pages (such as a digital angpao QRIS code or bank account) are provided by the host. Payments go
                straight to the host&apos;s account; we do not process or hold them.
              </li>
              <li>
                Each event has a guest capacity set by its package. Packages and any partner arrangements are agreed with Day One Project;
                the platform does not take online payments.
              </li>
            </ul>
          </Section>

          <Section id="whatsapp" title="4. WhatsApp messages and automatic pacing">
            <div className="p-5 sm:p-6 rounded-[2rem] bg-premium-charcoal border border-premium-danger/40 space-y-3">
              <div className="flex items-center gap-2 text-premium-danger font-display font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Risk disclosure</span>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  WhatsApp messages sent through the platform go out through Fonnte from <strong className="text-white">one shared
                  platform number</strong> run by Day One Project, not from your own number. Guests see that number as the sender.
                </li>
                <li>
                  To protect that number from WhatsApp&apos;s anti-spam systems, our backend automatically spaces messages
                  <strong className="text-white"> 5–15 seconds apart</strong> at random. This pacing always applies and cannot be turned
                  off or sped up, so a long guest list takes time: 300 messages take about 50 minutes.
                </li>
                <li>
                  WhatsApp may limit or block a number when recipients report messages as spam. If that happens, sending pauses and
                  some messages may arrive late or not at all. We do not guarantee delivery or delivery times, and we are not liable for
                  delays, blocks or suspensions caused by WhatsApp, Fonnte or mobile carriers.
                </li>
                <li>
                  Only send event messages to guests who expect them. We may pause WhatsApp sending for an event whose messages are
                  reported as spam.
                </li>
              </ul>
              <p className="text-xs text-zinc-400">By sending WhatsApp messages from the platform, you confirm you have read and accept this disclosure.</p>
            </div>
            <p>
              Messages you send yourself from your own email or WhatsApp app go directly from your account; we do not send or pace them.
            </p>
          </Section>

          <Section id="photos" title="5. Photos and uploads">
            <ul className="list-disc pl-5 space-y-2">
              <li>Guests who have checked in can upload up to 10 photos each. Photos are compressed on the guest&apos;s phone to 2 MB or less.</li>
              <li>Uploads may appear on the event&apos;s photo wall and on screens at the venue. The host can hide or remove any upload.</li>
              <li>Only upload pictures you have the right to share, and respect the people in them.</li>
              <li>Uploads are stored with Supabase Storage and deleted within 30 days after the event. Download anything you want to keep before then.</li>
            </ul>
          </Section>

          <Section id="dayof" title="6. Games and door prizes">
            <p>
              Trivia, the photo wall and door prize draws are for guests who have checked in at the event. The host sets the rules,
              chooses the prizes and is responsible for giving them out and for following any local rules on prize draws. Day One Project
              is not a party to any prize promotion.
            </p>
          </Section>

          <Section id="use" title="7. Acceptable use">
            <p>Do not use the platform to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>send spam or messages to people who did not agree to hear from you;</li>
              <li>publish unlawful, hateful, misleading or infringing content;</li>
              <li>collect other people&apos;s data without permission;</li>
              <li>break, probe or overload the platform, or get around its access controls or limits.</li>
            </ul>
            <p>We may remove content or suspend an account that breaks these terms.</p>
          </Section>

          <Section id="privacy" title="8. Personal data">
            <p>
              How we handle personal data, who processes it and how to use your rights under UU PDP No. 27/2022 is explained in our{' '}
              <Link href="/privacy" className="text-premium-gold hover:text-premium-goldHover">Privacy Policy</Link>.
            </p>
          </Section>

          <Section id="liability" title="9. Availability and liability">
            <p>
              We work to keep the platform reliable, but it is provided as it is and may sometimes be unavailable. Keep your own copy of
              important information, such as an export of your guest list, before your event. To the extent the law allows, we are not
              liable for indirect losses, or for losses caused by services we rely on (including WhatsApp, Fonnte, Supabase, Vercel and
              Resend).
            </p>
          </Section>

          <Section id="ending" title="10. Ending your use">
            <p>
              You can stop using the platform at any time and ask us to close your account by email. We may suspend or close an account
              that breaks these terms or puts other users at risk.
            </p>
          </Section>

          <Section id="law" title="11. Governing law">
            <p>These terms are governed by the laws of the Republic of Indonesia.</p>
          </Section>

          <Section id="changes" title="12. Changes and contact">
            <p>
              If we change these terms, we will update this page and the date at the top. Questions:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-premium-gold hover:text-premium-goldHover font-mono">{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
