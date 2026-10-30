'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, MessageSquare, Send, Eye, Edit3, Check,
  Clock, Bell, Heart, Briefcase, Sparkles, QrCode, CalendarDays,
  ChevronRight, Copy, CheckCircle2,
} from 'lucide-react';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
} from '@/lib/mockData';

const MOCK_EVENTS = [MOCK_EVENT, MOCK_WEDDING_EVENT, MOCK_CORPORATE_NEXUS_EVENT, MOCK_WEDDING_BALI_EVENT, MOCK_POPVERSE_EVENT];

type TemplateKey = 'vip_invitation' | 'rsvp_pass' | 'reminder_24h' | 'thank_you';
type Channel = 'email' | 'whatsapp';

const TEMPLATES: Record<TemplateKey, {
  label: string;
  subject: string;
  icon: React.ElementType;
  color: string;
  preview: (name: string, eventName: string, eventDate: string, qrToken: string, isWedding: boolean) => string;
}> = {
  vip_invitation: {
    label: 'VIP Invitation',
    subject: "You're invited — {eventName}",
    icon: Sparkles,
    color: 'text-premium-gold',
    preview: (name, eventName, eventDate, qrToken, isWedding) => `
Dear ${name},

${isWedding ? '💍' : '🎯'} You are cordially invited to attend

${eventName.toUpperCase()}

${eventDate}

${isWedding
  ? 'It would be our greatest honour to celebrate this milestone with you present by our side.'
  : 'Join industry leaders, innovators, and visionaries at the premier summit of the year.'}

To confirm your attendance, please register at:
→ app.dayoneproject.xyz/events/event-slug/register

Your personalised QR pass will be sent instantly upon registration.

${isWedding ? 'With love,' : 'See you there,'}
The ${eventName} Team

──────────────────────────
This invitation is personal and non-transferable.
Powered by dayoneproject.xyz
    `.trim(),
  },
  rsvp_pass: {
    label: 'RSVP Pass',
    subject: 'Your QR pass for {eventName}',
    icon: QrCode,
    color: 'text-premium-neon',
    preview: (name, eventName, eventDate, qrToken) => `
Hi ${name}!

✅ Your RSVP is confirmed. Here is your digital QR pass:

┌──────────────────────────────┐
│  ${eventName}
│  ${eventDate}
│
│  Guest: ${name}
│
│  ██████████  Token:
│  ██    ██    ${qrToken}
│  ██████████
│
│  VALID FOR 1 ENTRY
└──────────────────────────────┘

Present this pass at the gate for entry. No printout needed — show on your phone.

See you there!
    `.trim(),
  },
  reminder_24h: {
    label: '24h Reminder',
    subject: 'See you tomorrow — {eventName}',
    icon: Bell,
    color: 'text-premium-danger',
    preview: (name, eventName, eventDate, qrToken) => `
Hi ${name},

⏰ Just a reminder — ${eventName} is TOMORROW!

📅 ${eventDate}
🎟  Your QR token: ${qrToken}

What to bring:
• This email (your QR pass)
• A valid ID

Doors open 30 minutes before the event. We recommend arriving early to check in smoothly.

Can't wait to see you!
The ${eventName} Team
    `.trim(),
  },
  thank_you: {
    label: 'Thank You',
    subject: 'Thank you for joining — {eventName}',
    icon: Heart,
    color: 'text-premium-danger',
    preview: (name, eventName) => `
Dear ${name},

💛 Thank you for attending ${eventName}!

It was a joy to share this experience with you. We hope it created memories that will last a lifetime.

Your photo wall contributions are available at:
→ app.dayoneproject.xyz/events/event-slug/photos

If you have a moment, we'd love your feedback:
→ app.dayoneproject.xyz/events/event-slug/feedback

Until next time,
The ${eventName} Team

──────────────────────────
Powered by dayoneproject.xyz
    `.trim(),
  },
};

const MOCK_SEND_LOG = [
  { id: 1, template: 'VIP Invitation', channel: 'email', sent: 124, opened: 98, time: '2026-10-28 14:32' },
  { id: 2, template: 'VIP Invitation', channel: 'whatsapp', sent: 124, opened: 119, time: '2026-10-28 14:35' },
  { id: 3, template: '24h Reminder', channel: 'email', sent: 89, opened: 72, time: '2026-10-29 09:00' },
];

function BroadcastContent({ eventId }: { eventId: string }) {
  const event = MOCK_EVENTS.find((e: { id: string }) => e.id === eventId) ?? MOCK_EVENTS[0];
  const isWedding = event.event_type === 'wedding';
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('vip_invitation');
  const [activeChannel, setActiveChannel] = useState<Channel>('email');
  const [previewMode, setPreviewMode] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [mockDate, setMockDate] = useState('');

  useEffect(() => {
    setMockDate(new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, [event.start_date]);

  const tpl = TEMPLATES[activeTemplate];
  const mockQrToken = 'D1-X7K2M4';
  const mockName = isWedding ? 'Sophia Rossi' : 'Alex Chen';
  const preview = tpl.preview(mockName, event.name, mockDate, mockQrToken, isWedding);
  const subject = tpl.subject.replace('{eventName}', event.name);

  const handleSend = async (key: string) => {
    setSendingId(key);
    await new Promise(r => setTimeout(r, 1800));
    setSendingId(null);
    setSentSet(prev => new Set(prev).add(key));
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(preview).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-premium-black font-sans flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-8 border-b border-premium-borderDark/60 flex-shrink-0 bg-premium-black/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/events/${eventId}`} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-display font-semibold text-white">{event.name}</span>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-display font-semibold text-zinc-400">Broadcast</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <div className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
          Resend + Fonnte connected
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: template picker */}
        <aside className="w-64 border-r border-premium-borderDark flex-shrink-0 p-4 space-y-2">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-2 mb-3">Email Templates</div>
          {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, t]) => {
            const Icon = t.icon;
            const isSent = sentSet.has(`${key}-email`) || sentSet.has(`${key}-whatsapp`);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTemplate(key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all scale-on-click ${
                  activeTemplate === key
                    ? 'bg-premium-charcoal border border-premium-gold/30'
                    : 'hover:bg-premium-surfaceDark border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${t.color}`} />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{t.label}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{isSent ? '✓ Sent' : 'Ready to send'}</div>
                </div>
                {isSent && <CheckCircle2 className="w-3.5 h-3.5 text-premium-success flex-shrink-0 ml-auto" />}
              </button>
            );
          })}

          <div className="border-t border-premium-borderDark pt-3 mt-4">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-2 mb-3">Send Log</div>
            {MOCK_SEND_LOG.map(log => (
              <div key={log.id} className="px-2 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">{log.template}</span>
                  <span className={`text-[10px] font-mono ${log.channel === 'email' ? 'text-premium-neon' : 'text-green-400'}`}>{log.channel}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                  <span>Sent {log.sent}</span>
                  <span>·</span>
                  <span>Opened {log.opened}</span>
                  <span className="ml-auto text-zinc-700">{log.time.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: preview + send */}
        <main className="flex-1 flex flex-col min-w-0 p-6 gap-6">
          {/* Template header */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                {React.createElement(tpl.icon, { className: `w-5 h-5 ${tpl.color}` })}
                {tpl.label}
              </h2>
              <div className="text-xs text-zinc-500">Subject: <span className="text-zinc-300">{subject}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition-all scale-on-click"
              >
                {previewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={handleCopyPreview}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 transition-all scale-on-click"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Channel selector */}
          <div className="flex gap-2">
            {(['email', 'whatsapp'] as Channel[]).map(ch => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  activeChannel === ch
                    ? 'bg-premium-charcoal border border-premium-gold/30 text-white'
                    : 'border border-premium-borderDark text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {ch === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {ch === 'email' ? 'Email (Resend)' : 'WhatsApp (Fonnte)'}
                {sentSet.has(`${activeTemplate}-${ch}`) && (
                  <Check className="w-3 h-3 text-premium-success" />
                )}
              </button>
            ))}
          </div>

          {/* Email preview */}
          <div className="flex-1 flex gap-6 min-h-0">
            <div className="flex-1 flex flex-col gap-3">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                {activeChannel === 'email' ? 'Email Preview (HTML)' : 'WhatsApp Message Preview'}
              </div>
              <div className="flex-1 bg-premium-charcoal rounded-2xl border border-premium-borderDark overflow-hidden">
                {activeChannel === 'email' ? (
                  <div className="h-full overflow-y-auto">
                    {/* Email chrome */}
                    <div className="bg-premium-surfaceDark px-5 py-3 border-b border-premium-borderDark space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-14">From:</span>
                        <span className="text-zinc-400">events@dayoneproject.xyz</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-14">To:</span>
                        <span className="text-zinc-400">{mockName} &lt;guest@example.com&gt;</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-14">Subject:</span>
                        <span className="text-white font-semibold">{subject}</span>
                      </div>
                    </div>
                    {/* Email body */}
                    <div className="p-6">
                      <div className="max-w-sm mx-auto space-y-5">
                        {/* Header banner */}
                        <div className="rounded-xl overflow-hidden bg-premium-surfaceDark border border-premium-borderDark py-4 px-5 flex items-center gap-3">
                          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-black font-display font-bold text-sm">D1</div>
                          <div>
                            <div className="text-xs font-display font-bold text-white">{event.name}</div>
                            <div className="text-[10px] text-zinc-500">{mockDate}</div>
                          </div>
                        </div>
                        {/* Body text */}
                        <pre className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap break-words">
                          {preview}
                        </pre>
                        {/* Footer */}
                        <div className="border-t border-premium-borderDark pt-4 text-[10px] text-zinc-700 text-center font-mono">
                          Powered by dayoneproject.xyz · Unsubscribe
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 flex flex-col items-center">
                    <div className="w-full max-w-xs bg-[#128C7E] rounded-2xl overflow-hidden shadow-lg">
                      <div className="bg-[#075E54] px-4 py-3 flex items-center gap-2">
                        <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-black font-bold text-sm">D1</div>
                        <div>
                          <div className="text-xs font-bold text-white">{event.name}</div>
                          <div className="text-[10px] text-green-300">Official Channel</div>
                        </div>
                      </div>
                      <div className="p-4 bg-[#ECE5DD]">
                        <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-[90%]">
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                            {preview}
                          </pre>
                          <div className="text-[10px] text-gray-400 text-right mt-1">14:32 ✓✓</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-500 max-w-xs">
                      ⚠️ Rate-limited: 5–15s randomised pacing to comply with Fonnte anti-spam rules. Estimated delivery: ~{Math.ceil(89 * 10 / 60)} min for 89 guests.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: send panel */}
            <div className="w-64 flex-shrink-0 space-y-4">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Audience</div>
              <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-3">
                {[
                  { label: 'All confirmed RSVPs', count: 124, checked: true },
                  { label: 'Pending RSVPs', count: 18, checked: false },
                  { label: 'Checked in', count: 0, checked: false },
                  { label: 'VIP guests', count: 12, checked: false },
                ].map(seg => (
                  <label key={seg.label} className="flex items-center justify-between cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${seg.checked ? 'bg-premium-gold border-premium-gold' : 'border-premium-borderDark'}`}>
                        {seg.checked && <Check className="w-2.5 h-2.5 text-black" />}
                      </div>
                      <span className="text-xs text-zinc-300">{seg.label}</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-600">{seg.count}</span>
                  </label>
                ))}
                <div className="border-t border-premium-borderDark pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Total recipients</span>
                  <span className="text-xs font-mono text-premium-gold font-bold">124</span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Schedule</div>
              <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-3">
                {[
                  { label: 'Send now', icon: Send },
                  { label: 'Schedule time', icon: Clock },
                ].map(({ label, icon: Icon }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${label === 'Send now' ? 'border-premium-gold' : 'border-premium-borderDark'}`}>
                      {label === 'Send now' && <div className="w-2 h-2 rounded-full bg-premium-gold" />}
                    </div>
                    <Icon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>

              {/* Send button */}
              <button
                type="button"
                onClick={() => handleSend(`${activeTemplate}-${activeChannel}`)}
                disabled={!!sendingId || sentSet.has(`${activeTemplate}-${activeChannel}`)}
                className="w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover disabled:opacity-60 text-black font-display font-bold text-sm shadow-gold scale-on-click transition-all flex items-center justify-center gap-2"
              >
                {sendingId === `${activeTemplate}-${activeChannel}` ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    Sending...
                  </>
                ) : sentSet.has(`${activeTemplate}-${activeChannel}`) ? (
                  <><CheckCircle2 className="w-4 h-4" /> Sent to 124 guests</>
                ) : (
                  <><Send className="w-4 h-4" /> Send {tpl.label}</>
                )}
              </button>

              {activeChannel === 'whatsapp' && (
                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  Fonnte BYON required. Anti-ban rate limiting applied automatically. Risk disclosure accepted.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function BroadcastWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BroadcastContent eventId={id} />;
}

export default function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading...</div>}>
      <BroadcastWrapper params={params} />
    </Suspense>
  );
}
