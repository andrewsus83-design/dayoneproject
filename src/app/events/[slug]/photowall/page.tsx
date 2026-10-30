'use client';

import React, { useCallback, useEffect, useRef, useState, use, Suspense, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Images,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useEventConfigBySlug } from '@/lib/eventStore';
import { isSampleSlug } from '@/lib/events';
import { MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import {
  MAX_CAPTION,
  feedToUploads,
  guestPhotoApi,
  photoErrorMessage,
  photoUrl,
  readStoredPass,
  useWallFeed,
  type GuestPhoto,
  type GuestPhotoState,
  type UploadJob,
} from '@/lib/photoWallApi';

const noopSubscribe = () => () => {};
const REFRESH_MS = 20_000;
const SAMPLE_PHOTOS = MOCK_PHOTO_WALL_UPLOADS.filter((p) => p.is_approved);

const STATUS_LABEL: Record<GuestPhoto['status'], { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: 'Waiting for approval', className: 'bg-premium-gold/15 text-premium-gold border-premium-gold/40', Icon: Clock },
  approved: { label: 'On the wall', className: 'bg-premium-success/15 text-premium-success border-premium-success/40', Icon: CheckCircle2 },
  rejected: { label: 'Not approved', className: 'bg-premium-danger/15 text-premium-danger border-premium-danger/40', Icon: XCircle },
  removed: { label: 'Removed', className: 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark', Icon: XCircle },
};

function Shell({ slug, title, subtitle, children }: { slug: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans">
      <div className="max-w-md mx-auto min-h-screen flex flex-col border-x border-premium-borderDark">
        <header className="h-16 px-4 border-b border-premium-borderDark bg-premium-surfaceDark/90 backdrop-blur-md flex items-center gap-3 sticky top-0 z-40">
          <Link
            href={`/events/${slug}`}
            aria-label="Back to the event"
            className="p-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-display font-bold text-white truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>}
          </div>
          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold flex-shrink-0">
            D1
          </div>
        </header>
        <main className="p-4 space-y-4 flex-1">{children}</main>
      </div>
    </div>
  );
}

function Gate({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-center">{icon}</div>
      <h2 className="text-lg font-display font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function SamplePhotoWall({ slug, eventName }: { slug: string; eventName: string }) {
  return (
    <Shell slug={slug} title="Photo wall" subtitle={eventName}>
      <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-400 leading-relaxed">
        This is a sample event, so uploads are off here. On your own published event, checked-in guests share up to
        10 photos each from this page.
      </div>
      <PinterestMasonryPhotoWall photos={SAMPLE_PHOTOS} canLike={false} />
    </Shell>
  );
}

function GuestPhotoWallContent({ slug }: { slug: string }) {
  const { event } = useEventConfigBySlug(slug);
  const fromUrl = useSearchParams().get('t');
  const stored = useSyncExternalStore(noopSubscribe, () => readStoredPass(slug), () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const token = fromUrl || stored;

  if (isSampleSlug(slug)) return <SamplePhotoWall slug={slug} eventName={event.name} />;
  if (!hydrated) {
    return (
      <Shell slug={slug} title="Photo wall" subtitle={event.name}>
        <p className="text-xs text-zinc-500 text-center py-12">Loading…</p>
      </Shell>
    );
  }
  if (!token) {
    return (
      <Shell slug={slug} title="Photo wall" subtitle={event.name}>
        <Gate icon={<QrCode className="w-6 h-6 text-premium-gold" />} title="Show your QR pass at the entrance first">
          <p className="text-sm text-zinc-400 leading-relaxed">
            After you&apos;re checked in, open this page from your pass link on this phone so we know it&apos;s you.
          </p>
        </Gate>
      </Shell>
    );
  }
  return <GuestPhotoWall slug={slug} token={token} fallbackName={event.name} />;
}

function GuestPhotoWall({ slug, token, fallbackName }: { slug: string; token: string; fallbackName: string }) {
  const [state, setState] = useState<GuestPhotoState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'offline'>('loading');

  const refresh = useCallback(
    () =>
      guestPhotoApi
        .state(token)
        .then((s) => {
          setState(s);
          setStatus(s ? 'ready' : 'not-found');
        })
        .catch(() => setStatus((v) => (v === 'ready' ? v : 'offline'))),
    [token],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // This call is per guest (not cached), so only keep asking while something can change on its own:
  // waiting for check-in, for the host to open the wall, or for a photo to be approved.
  const needsPoll = !state || !state.enabled || !state.checked_in || state.photos.some((p) => p.status === 'pending');
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    const timer = needsPoll ? window.setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_MS) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [refresh, needsPoll]);

  const { feed, state: feedState } = useWallFeed(slug, state?.wall_key ?? null, 6000);
  // The host made a new wall key: fetch it so the album keeps working.
  useEffect(() => {
    if (feedState === 'missing' && state?.wall_key) refresh();
  }, [feedState, state?.wall_key, refresh]);
  const title = 'Photo wall';
  const subtitle = state?.event_name || fallbackName;

  if (status === 'loading') {
    return (
      <Shell slug={slug} title={title} subtitle={subtitle}>
        <p className="text-xs text-zinc-500 text-center py-12">Loading your photos…</p>
      </Shell>
    );
  }
  if (status === 'offline') {
    return (
      <Shell slug={slug} title={title} subtitle={subtitle}>
        <Gate icon={<AlertCircle className="w-6 h-6 text-premium-danger" />} title="We couldn't load the photo wall">
          <p className="text-sm text-zinc-400">Check your internet connection and try again.</p>
          <button
            type="button"
            onClick={refresh}
            className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click"
          >
            Try again
          </button>
        </Gate>
      </Shell>
    );
  }
  if (status === 'not-found' || !state) {
    return (
      <Shell slug={slug} title={title} subtitle={subtitle}>
        <Gate icon={<QrCode className="w-6 h-6 text-premium-gold" />} title="We couldn't find your pass">
          <p className="text-sm text-zinc-400 leading-relaxed">Open the photo wall from the pass link you received for this event.</p>
        </Gate>
      </Shell>
    );
  }

  const album = feedToUploads(feed?.photos ?? []);
  const firstName = state.guest_name.split(/\s+/)[0];

  return (
    <Shell slug={slug} title={title} subtitle={subtitle}>
      {!state.enabled ? (
        <Gate icon={<Camera className="w-6 h-6 text-zinc-400" />} title="The photo wall isn't open yet">
          <p className="text-sm text-zinc-400">Your host hasn&apos;t switched on photo sharing for this event.</p>
        </Gate>
      ) : !state.checked_in ? (
        <Gate icon={<QrCode className="w-6 h-6 text-premium-gold" />} title="Show your QR pass at the entrance first">
          <p className="text-sm text-zinc-400 leading-relaxed">
            Once you&apos;re checked in, you can share up to {state.photo_quota} photos here, {firstName}.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-bold text-white hover:border-premium-gold/50 scale-on-click"
          >
            <RefreshCw className="w-4 h-4" />
            I&apos;m checked in
          </button>
        </Gate>
      ) : !state.consented_at ? (
        <ConsentCard token={token} state={state} onDone={refresh} />
      ) : state.uploads_open ? (
        <Uploader token={token} state={state} onChange={refresh} />
      ) : (
        <Gate icon={<Clock className="w-6 h-6 text-zinc-400" />} title="Photo uploads have closed">
          <p className="text-sm text-zinc-400">You can still see the album and remove your own photos.</p>
        </Gate>
      )}

      {state.photos.length > 0 && <MyPhotos token={token} photos={state.photos} onChange={refresh} />}

      {state.wall_key && (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <Images className="w-4 h-4 text-premium-neon" />
            Event album
            <span className="text-[11px] font-mono font-normal text-zinc-500">{feed?.total ?? 0} on the wall</span>
          </h2>
          {album.length ? (
            <PinterestMasonryPhotoWall photos={album} showCaptions={feed?.captions ?? true} canLike={false} />
          ) : (
            <p className="text-xs text-zinc-500 p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
              No photos on the wall yet.
            </p>
          )}
        </section>
      )}
    </Shell>
  );
}

function ConsentCard({ token, state, onDone }: { token: string; state: GuestPhotoState; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      await guestPhotoApi.consent(token);
      await onDone();
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/50 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-premium-gold/15 border border-premium-gold/40 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-premium-gold" />
        </div>
        <h2 className="text-lg font-display font-bold text-white">Share photos on the wall</h2>
      </div>
      <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
        <li>Photos you share appear on the event&apos;s photo wall and in the album other guests see, with your first name and initial.</li>
        <li>
          {state.moderation === 'manual'
            ? 'The host approves each photo before it appears.'
            : 'Your photos go straight onto the wall.'}
        </li>
        <li>You can remove your photos at any time.</li>
        <li>All photos are deleted 30 days after the event.</li>
      </ul>
      {error && <p className="text-xs text-premium-danger">{error}</p>}
      <button
        type="button"
        onClick={agree}
        disabled={busy}
        className="w-full py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'I agree, let me share photos'}
      </button>
    </div>
  );
}

function Uploader({ token, state, onChange }: { token: string; state: GuestPhotoState; onChange: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<GuestPhoto | null>(null);
  const jobRef = useRef<UploadJob>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Free the preview's memory when it changes or the page closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const remaining = Math.max(0, state.photo_quota - state.photos_used);
  const busy = step !== 'idle';

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setError(null);
    setPosted(null);
    jobRef.current = {};
    if (inputRef.current) inputRef.current.value = '';
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    try {
      const photo = await guestPhotoApi.upload(token, file, state.captions_enabled ? caption : '', jobRef.current, setStep);
      jobRef.current = {};
      setFile(null);
      setPreview(null);
      setCaption('');
      setPosted(photo);
      if (photo.status === 'approved') confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setStep('idle');
      await onChange();
    }
  };

  const stepLabel = step === 'compressing' ? 'Optimizing your photo…' : step === 'uploading' ? 'Uploading…' : 'Saving…';
  const manual = state.moderation === 'manual';

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-premium-success flex-shrink-0" />
          <span className="font-bold text-white truncate">{state.guest_name}</span>
          <span className="text-premium-success font-mono flex-shrink-0">checked in</span>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono flex-shrink-0">
          {state.photos_used}/{state.photo_quota} photos
        </span>
      </div>

      {posted && (
        <div className="p-4 rounded-2xl bg-premium-success/10 border border-premium-success/40 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-premium-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-display font-bold text-white">
              {posted.status === 'approved' ? 'Your photo is on the wall!' : 'Sent! Waiting for the host to approve it.'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {remaining > 0 ? `You can share ${remaining} more.` : 'That was your last photo. Remove one to add another.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/50 text-xs text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {remaining <= 0 ? (
        <Gate icon={<Images className="w-6 h-6 text-premium-gold" />} title={`You've shared ${state.photo_quota} photos`}>
          <p className="text-sm text-zinc-400">That&apos;s the most each guest can share. Remove one of yours below to add another.</p>
        </Gate>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="relative w-full rounded-[2rem] overflow-hidden border border-premium-borderDark bg-premium-charcoal aspect-[4/5] flex items-center justify-center scale-on-click disabled:opacity-80"
          >
            {preview ? (
              <img src={preview} alt="Your photo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Camera className="w-12 h-12 text-premium-gold mx-auto" />
                <p className="text-sm font-display font-bold text-white">Take or choose a photo</p>
                <p className="text-xs text-zinc-400">We shrink it to a light WebP before it uploads.</p>
              </div>
            )}
            {preview && !busy && (
              <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-premium-neon" />
                Change photo
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => pick(e.target.files?.[0])}
            className="hidden"
          />

          {state.captions_enabled && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="photo-caption" className="text-xs font-semibold text-zinc-300">
                  Caption (optional)
                </label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {caption.length}/{MAX_CAPTION}
                </span>
              </div>
              <textarea
                id="photo-caption"
                rows={2}
                maxLength={MAX_CAPTION}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about this moment…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white focus:outline-none focus:border-premium-gold resize-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!file || busy}
            className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{busy ? stepLabel : manual ? 'Send for approval' : 'Post to the wall'}</span>
          </button>
          <p className="text-[11px] text-zinc-500 text-center">
            {manual ? 'The host approves each photo before it appears on the wall.' : 'Photos go straight to the wall.'}
          </p>
        </>
      )}
    </div>
  );
}

function MyPhotos({ token, photos, onChange }: { token: string; photos: GuestPhoto[]; onChange: () => Promise<void> }) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (photo: GuestPhoto) => {
    if (!window.confirm('Remove this photo from the wall and the album?')) return;
    setRemoving(photo.id);
    setError(null);
    try {
      await guestPhotoApi.remove(token, photo.id);
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setRemoving(null);
      await onChange();
    }
  };

  return (
    <section className="space-y-3 pt-2">
      <h2 className="text-sm font-display font-bold text-white">Your photos</h2>
      {error && <p className="text-xs text-premium-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => {
          const s = STATUS_LABEL[photo.status];
          return (
            <div key={photo.id} className="rounded-2xl overflow-hidden bg-premium-charcoal border border-premium-borderDark">
              <div className="relative aspect-square bg-premium-surfaceDark">
                <img src={photoUrl(photo.storage_path)} alt={photo.caption || 'Your photo'} loading="lazy" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(photo)}
                  disabled={removing === photo.id}
                  aria-label="Remove this photo"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white hover:text-premium-danger flex items-center justify-center scale-on-click disabled:opacity-50"
                >
                  {removing === photo.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-2.5 space-y-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${s.className}`}>
                  <s.Icon className="w-3 h-3" />
                  {s.label}
                </span>
                {photo.caption && <p className="text-[11px] text-zinc-400 line-clamp-2">{photo.caption}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GuestPhotoWallWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <GuestPhotoWallContent slug={unwrappedParams.slug} />;
}

export default function GuestPhotoWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black p-8 text-xs text-zinc-500">Loading photo wall…</div>}>
      <GuestPhotoWallWrapper params={params} />
    </Suspense>
  );
}
