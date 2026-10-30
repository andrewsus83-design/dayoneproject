'use client';

import React, { use, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Star } from 'lucide-react';
import { addFeedback, fillVariables, formatEventDate, formatEventTime, newId, useEventConfigBySlug, useSampleGuests } from '@/lib/eventStore';
import { guestAppPath, isServerEventId, useMyPass } from '@/lib/guestsApi';
import { resolveTheme } from '@/lib/eventTheme';
import { EventFonts } from '@/components/events/EventFonts';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];

function FeedbackContent({ slug }: { slug: string }) {
  const token = useSearchParams().get('t');
  const { eventId, hydrated, config } = useEventConfigBySlug(slug);
  // Who is giving feedback: the pass in the Thank You link (or saved on this phone); samples look it up locally.
  const sample = !isServerEventId(eventId);
  const sampleGuests = useSampleGuests(eventId);
  const mine = useMyPass(slug, { token: sample ? null : token });
  const sampleGuest = sample && token ? sampleGuests.find((g) => g.qr_code_token === token) : undefined;
  const guest = sample
    ? sampleGuest && { id: sampleGuest.id, name: sampleGuest.name }
    : mine.pass ? { id: undefined, name: mine.pass.guest.name } : undefined;
  const fb = config.broadcast.feedback;
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fill = (text: string) =>
    fillVariables(text, {
      name: guest?.name.split(' ')[0],
      fullname: guest?.name,
      event: config.info.name,
      date: formatEventDate(config.info.startDate),
      time: formatEventTime(config.info.startTime),
      venue: config.info.venue,
    });

  const submit = () => {
    if (!rating) return setError('Please pick a rating.');
    const r = addFeedback(eventId, {
      id: newId('fb'),
      at: new Date().toISOString(),
      rating,
      comment: comment.trim().slice(0, 1000),
      guestId: guest?.id,
      name: guest?.name,
    });
    if (!r.ok) return setError(r.error ?? 'Your feedback could not be saved. Please try again.');
    setError(null);
    setDone(true);
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading…</div>;
  }

  const headingStyle = { fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking };
  const primaryBtn = { background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius };

  return (
    <div className="min-h-screen flex flex-col" style={{ ...theme.vars, background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}>
      <EventFonts href={theme.fontsHref} />
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-5 py-6" style={{ gap: theme.space.stack }}>
        <Link href={guestAppPath(slug, 'setting')} className="inline-flex items-center gap-1.5 text-xs font-bold self-start scale-on-click" style={{ color: theme.muted }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex-1 flex flex-col justify-center" style={{ gap: theme.space.stack }}>
          {!fb.on ? (
            <div className="text-center space-y-2" style={{ ...theme.cardStyle, padding: theme.space.card }}>
              <h1 className="text-2xl font-bold" style={headingStyle}>Feedback is closed</h1>
              <p className="text-sm" style={{ color: theme.muted }}>Thank you for coming to {config.info.name}.</p>
            </div>
          ) : done ? (
            <div className="text-center flex flex-col items-center" style={{ ...theme.cardStyle, padding: theme.space.card * 1.3, gap: theme.space.gap }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: theme.primary }}>
                <Check className="w-7 h-7" style={{ color: theme.onPrimary }} />
              </div>
              <h1 className="text-2xl font-bold" style={headingStyle}>{fill(fb.thanks)}</h1>
              <p className="text-sm" style={{ color: theme.muted }}>We read every reply.</p>
              <Link href={`/events/${slug}`} className="px-5 py-3 text-sm font-bold scale-on-click" style={primaryBtn}>Back to the event</Link>
            </div>
          ) : (
            <div className="flex flex-col" style={{ ...theme.cardStyle, padding: theme.space.card * 1.2, gap: theme.space.stack }}>
              <div>
                <h1 className="text-2xl font-bold leading-tight" style={headingStyle}>{fill(fb.title)}</h1>
                {guest && <p className="text-sm mt-1" style={{ color: theme.muted }}>Hi {guest.name.split(' ')[0]}, thanks for coming.</p>}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold">{fill(fb.question)}</p>
                <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = n <= (hover || rating);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => { setRating(n); setError(null); }}
                        onMouseEnter={() => setHover(n)}
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        aria-pressed={rating === n}
                        className="p-1 scale-on-click"
                      >
                        <Star className="w-9 h-9 transition-colors" style={{ color: on ? theme.primary : theme.border, fill: on ? theme.primary : 'transparent' }} />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm font-bold" style={{ color: theme.primaryText }}>{LABELS[hover || rating]}</span>
                </div>
              </div>
              {fb.askComment && (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">Anything you’d like to tell us? <span style={{ color: theme.subtle }}>(optional)</span></span>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    placeholder="What did you enjoy? What could be better?"
                    className="w-full px-4 py-3 text-base outline-none border resize-none bg-[var(--ev-surface)] text-[var(--ev-text)] border-[var(--ev-border)] focus:border-[var(--ev-primary)] placeholder:text-[var(--ev-subtle)]"
                    style={{ borderRadius: theme.buttonRadius }}
                  />
                </label>
              )}
              {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
              <button type="button" onClick={submit} className="w-full py-4 text-base font-bold scale-on-click" style={primaryBtn}>
                Send feedback
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <FeedbackContent slug={slug} />;
}

export default function FeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}>
      <FeedbackWrapper params={params} />
    </Suspense>
  );
}
