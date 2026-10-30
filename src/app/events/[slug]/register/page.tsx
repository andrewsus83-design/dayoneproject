'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
} from '@/lib/mockData';
import {
  ArrowRight, ArrowLeft, Check, Heart, Building2, QrCode,
  User, Mail, Phone, Utensils, Users, Sparkles, Download,
  Share2, CalendarDays, MapPin,
} from 'lucide-react';

type Step = 'name' | 'contact' | 'details' | 'confirm' | 'success';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dietary: string;
  plusOne: boolean;
  plusOneName: string;
  tableNote: string;
  agreedToTerms: boolean;
}

const DIETARY_OPTIONS = ['No restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Nut allergy', 'Other'];

const STEPS: Step[] = ['name', 'contact', 'details', 'confirm', 'success'];
const STEP_LABELS = ['Your Name', 'Contact', 'Details', 'Confirm', 'Done'];

function generateQRToken() {
  return `ALL41-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  if (step === 'success') return null;
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.slice(0, 4).map((s, i) => (
        <React.Fragment key={s}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < idx ? 'bg-premium-gold text-black' :
            i === idx ? 'bg-premium-gold text-black ring-4 ring-premium-gold/20' :
            'bg-premium-charcoal border border-premium-borderDark text-zinc-600'
          }`}>
            {i < idx ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < 3 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all ${i < idx ? 'bg-premium-gold' : 'bg-premium-borderDark'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function RSVPFormContent({ slug }: { slug: string }) {
  const event =
    slug === 'aria-daniel' ? MOCK_WEDDING_EVENT
    : slug === 'sophia-marco' ? MOCK_WEDDING_BALI_EVENT
    : slug === 'nexus' ? MOCK_CORPORATE_NEXUS_EVENT
    : slug === 'popverse' ? MOCK_POPVERSE_EVENT
    : MOCK_EVENT;

  const isWedding = event.event_type === 'wedding';
  const [step, setStep] = useState<Step>('name');
  const [qrToken, setQrToken] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    dietary: 'No restrictions', plusOne: false, plusOneName: '',
    tableNote: '', agreedToTerms: false,
  });

  useEffect(() => {
    setQrToken(generateQRToken());
    setEventDateStr(new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }, [event.start_date]);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const setCheck = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const next = () => {
    const cur = STEPS.indexOf(step);
    if (cur < STEPS.length - 1) setStep(STEPS[cur + 1]);
  };

  const back = () => {
    const cur = STEPS.indexOf(step);
    if (cur > 0) setStep(STEPS[cur - 1]);
  };

  const inputCls = "w-full px-4 py-3.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white placeholder-zinc-600 focus:outline-none focus:border-premium-gold/60 focus:ring-2 focus:ring-premium-gold/10 transition-all font-sans text-sm";
  const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen bg-premium-black font-sans flex flex-col">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-premium-borderDark/60">
        <Link href={`/events/${slug}`} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to event
        </Link>
        <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold">41</div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">

          {/* Event summary chip */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isWedding ? 'bg-premium-danger/10' : 'bg-premium-neon/10'}`}>
              {isWedding ? <Heart className="w-4 h-4 text-premium-danger" /> : <Building2 className="w-4 h-4 text-premium-neon" />}
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-white text-sm truncate">{event.name}</div>
              <div className="text-xs text-zinc-500 truncate">{event.location_name}</div>
            </div>
          </div>

          <ProgressBar step={step} />

          {/* ── STEP: name ── */}
          {step === 'name' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">What's your name?</h1>
                <p className="text-sm text-zinc-500 mt-1">This will appear on your personalised QR pass.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First name</label>
                  <input type="text" placeholder="Sophia" value={form.firstName} onChange={set('firstName')} className={inputCls} autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Last name</label>
                  <input type="text" placeholder="Rossi" value={form.lastName} onChange={set('lastName')} className={inputCls} />
                </div>
              </div>
              <button
                type="button"
                onClick={next}
                disabled={!form.firstName.trim() || !form.lastName.trim()}
                className="w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-bold text-base shadow-gold scale-on-click transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP: contact ── */}
          {step === 'contact' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">How can we reach you?</h1>
                <p className="text-sm text-zinc-500 mt-1">Your QR pass and event reminders will be sent here.</p>
              </div>
              <div>
                <label className={labelCls}><Mail className="w-3 h-3 inline mr-1" />Email address</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}><Phone className="w-3 h-3 inline mr-1" />WhatsApp number</label>
                <input type="tel" placeholder="+62 812 3456 7890" value={form.phone} onChange={set('phone')} className={inputCls} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={back} className="px-6 py-4 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-bold scale-on-click">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!form.email.includes('@') || !form.phone.trim()}
                  className="flex-1 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-bold text-base shadow-gold scale-on-click transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: details ── */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">A few more details</h1>
                <p className="text-sm text-zinc-500 mt-1">Help us make your experience perfect.</p>
              </div>
              <div>
                <label className={labelCls}><Utensils className="w-3 h-3 inline mr-1" />Dietary preference</label>
                <select value={form.dietary} onChange={set('dietary')} className={inputCls}>
                  {DIETARY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {isWedding && (
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.plusOne ? 'bg-premium-gold border-premium-gold' : 'border-premium-borderDark'}`}>
                      {form.plusOne && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <input type="checkbox" className="sr-only" checked={form.plusOne} onChange={setCheck('plusOne')} />
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Bringing a plus-one</div>
                      <div className="text-xs text-zinc-500">Subject to seat availability</div>
                    </div>
                  </label>
                  {form.plusOne && (
                    <div>
                      <label className={labelCls}>Plus-one name</label>
                      <input type="text" placeholder="Full name" value={form.plusOneName} onChange={set('plusOneName')} className={inputCls} />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className={labelCls}>Special note (optional)</label>
                <textarea
                  value={form.tableNote}
                  onChange={set('tableNote')}
                  placeholder={isWedding ? 'Seating request, accessibility needs, note for the couple...' : 'Any requests or questions for the organizer...'}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={back} className="px-6 py-4 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-bold scale-on-click">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-base shadow-gold scale-on-click transition-all flex items-center justify-center gap-2"
                >
                  Review RSVP <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Confirm your RSVP</h1>
                <p className="text-sm text-zinc-500 mt-1">Check everything looks right before we send your pass.</p>
              </div>
              <div className="rounded-2xl border border-premium-borderDark bg-premium-charcoal divide-y divide-premium-borderDark overflow-hidden">
                {[
                  { label: 'Name', val: `${form.firstName} ${form.lastName}` },
                  { label: 'Email', val: form.email },
                  { label: 'WhatsApp', val: form.phone },
                  { label: 'Dietary', val: form.dietary },
                  ...(isWedding && form.plusOne ? [{ label: 'Plus-one', val: form.plusOneName || 'TBD' }] : []),
                  ...(form.tableNote ? [{ label: 'Note', val: form.tableNote }] : []),
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-xs font-mono text-zinc-600 uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-semibold text-white text-right max-w-[60%] truncate">{val}</span>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${form.agreedToTerms ? 'bg-premium-gold border-premium-gold' : 'border-premium-borderDark'}`}>
                  {form.agreedToTerms && <Check className="w-3 h-3 text-black" />}
                </div>
                <input type="checkbox" className="sr-only" checked={form.agreedToTerms} onChange={setCheck('agreedToTerms')} />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  I agree to receive event reminders and updates via email and WhatsApp from the organizer.
                </p>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={back} className="px-6 py-4 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-white hover:border-zinc-600 transition-all font-bold scale-on-click">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!form.agreedToTerms}
                  className="flex-1 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-bold text-base shadow-gold scale-on-click transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {isWedding ? 'Confirm RSVP' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div className="space-y-8 text-center">
              {/* Success badge */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-premium-success/10 border-2 border-premium-success/40 flex items-center justify-center">
                  <Check className="w-9 h-9 text-premium-success" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-white">You're on the list!</h1>
                  <p className="text-sm text-zinc-400 mt-1">
                    Welcome, {form.firstName}. Your QR pass is ready.
                  </p>
                </div>
              </div>

              {/* QR pass card */}
              <div className="relative rounded-[2rem] overflow-hidden border border-premium-gold/30 shadow-gold">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793297932531_67c9874e_1793297932595_76652526.png)` }}
                />
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <div className="relative p-8 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-base shadow-gold">41</div>
                    {isWedding
                      ? <span className="text-xs font-mono text-premium-danger flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> Wedding</span>
                      : <span className="text-xs font-mono text-premium-neon">Corporate</span>
                    }
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-display font-bold text-white">{form.firstName} {form.lastName}</div>
                    <div className="text-sm text-zinc-400">{event.name}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {eventDateStr}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location_name?.split(',')[0]}</span>
                  </div>
                  {/* QR code placeholder */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center">
                      <QrCode className="w-20 h-20 text-black" />
                    </div>
                    <span className="font-mono text-xs text-zinc-500 tracking-widest">{qrToken}</span>
                  </div>
                  <div className="text-[10px] text-zinc-700 text-center font-mono uppercase tracking-widest">
                    Present at gate entry · Valid for 1 person
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="py-3.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white transition-all font-bold text-sm scale-on-click flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Save Pass
                </button>
                <button type="button" className="py-3.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white transition-all font-bold text-sm scale-on-click flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>

              <p className="text-xs text-zinc-600">
                Confirmation sent to <span className="text-zinc-400">{form.email}</span> & WhatsApp {form.phone}
              </p>

              <Link
                href={`/events/${slug}`}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Back to event page
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RSVPFormWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <RSVPFormContent slug={slug} />;
}

export default function RSVPPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading...</div>}>
      <RSVPFormWrapper params={params} />
    </Suspense>
  );
}
