'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Camera, Clock, Images, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import { guestAppPath } from '@/lib/guestsApi';
import {
  MAX_CAPTION,
  guestPhotoApi,
  photoErrorMessage,
  type GuestPhoto,
  type GuestPhotoState,
  type UploadJob,
} from '@/lib/photoWallApi';

/**
 * The bottom sheet a guest posts from on the photo wall: first the one-time consent, then pick or take a photo, add a
 * caption and post. Photos are shrunk on the phone before they upload; frames, filters and video live in the camera tab.
 */
export function GuestPostSheet({
  slug, token, state, onClose, onPosted, onChange,
}: {
  slug: string;
  token: string;
  state: GuestPhotoState;
  onClose: () => void;
  onPosted: (photo: GuestPhoto) => void;
  onChange: () => Promise<void>;
}) {
  const remaining = Math.max(0, state.photo_quota - state.photos_used);

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Post to the photo wall"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-[2rem] border-t border-x border-premium-borderDark bg-premium-charcoal px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-fadeIn"
      >
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-white/20" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 scale-on-click"
        >
          <X className="w-4 h-4" />
        </button>

        {!state.uploads_open ? (
          <Notice icon={<Clock className="w-6 h-6 text-zinc-400" />} title="Photo uploads have closed">
            You can still watch the wall and remove your own posts.
          </Notice>
        ) : !state.consented_at ? (
          <Consent token={token} state={state} onDone={onChange} />
        ) : remaining <= 0 ? (
          <Notice icon={<Images className="w-6 h-6 text-premium-gold" />} title={`You've shared ${state.photo_quota} photos`}>
            That&apos;s the most each guest can share. Remove one of yours in Mine to add another.
          </Notice>
        ) : (
          <Composer slug={slug} token={token} state={state} remaining={remaining} onPosted={onPosted} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="py-6 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-premium-surfaceDark border border-premium-borderDark">{icon}</div>
      <h2 className="text-lg font-display font-bold text-white">{title}</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
    </div>
  );
}

function Consent({ token, state, onDone }: { token: string; state: GuestPhotoState; onDone: () => Promise<void> }) {
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
    <div className="space-y-4 pb-1">
      <div className="flex items-center gap-3 pr-10">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-premium-gold/15 border border-premium-gold/40">
          <ShieldCheck className="w-5 h-5 text-premium-gold" />
        </div>
        <h2 className="text-lg font-display font-bold text-white">Share photos on the wall</h2>
      </div>
      <ul className="space-y-2 pl-5 text-sm text-zinc-300 leading-relaxed list-disc">
        <li>Photos you share appear on the event&apos;s photo wall and in the album other guests see, with your first name and initial.</li>
        <li>{state.moderation === 'manual' ? 'The host approves each photo before it appears.' : 'Your photos go straight onto the wall.'}</li>
        <li>You can remove your photos at any time.</li>
        <li>All photos are deleted 30 days after the event.</li>
      </ul>
      {error && <p className="text-xs text-premium-danger">{error}</p>}
      <button
        type="button"
        onClick={agree}
        disabled={busy}
        className="w-full rounded-xl bg-premium-gold py-3.5 font-display text-sm font-bold text-black shadow-gold hover:bg-premium-goldHover scale-on-click disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'I agree, let me share photos'}
      </button>
    </div>
  );
}

function Composer({
  slug, token, state, remaining, onPosted, onChange,
}: {
  slug: string;
  token: string;
  state: GuestPhotoState;
  remaining: number;
  onPosted: (photo: GuestPhoto) => void;
  onChange: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<UploadJob>({});
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Free the preview's memory when it changes or the sheet closes.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const busy = step !== 'idle';
  const manual = state.moderation === 'manual';
  const stepLabel = step === 'compressing' ? 'Optimizing your photo…' : step === 'uploading' ? 'Uploading…' : 'Saving…';

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setError(null);
    jobRef.current = {};
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    let posted: GuestPhoto | null = null;
    try {
      posted = await guestPhotoApi.upload(token, file, state.captions_enabled ? caption : '', jobRef.current, setStep);
      jobRef.current = {};
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setStep('idle');
      await onChange();
    }
    if (posted) onPosted(posted);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pr-10">
        <h2 className="text-lg font-display font-bold text-white">New post</h2>
        <span className="font-mono text-[11px] text-zinc-400">{state.photos_used}/{state.photo_quota} photos · {remaining} left</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-premium-danger/50 bg-premium-danger/10 p-3 text-xs text-white">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-premium-danger" />
          <span>{error}</span>
        </div>
      )}

      {preview ? (
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
          className="relative block w-full overflow-hidden rounded-[2rem] border border-premium-borderDark bg-black scale-on-click disabled:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your photo" className="mx-auto max-h-[42dvh] w-full object-contain" />
          {!busy && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
              <Camera className="w-3.5 h-3.5 text-premium-neon" />
              Change photo
            </span>
          )}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[2rem] border border-premium-gold/50 bg-premium-surfaceDark text-center scale-on-click"
          >
            <Camera className="w-9 h-9 text-premium-gold" />
            <span className="font-display text-sm font-bold text-white">Take a photo</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[2rem] border border-premium-borderDark bg-premium-surfaceDark text-center scale-on-click"
          >
            <Images className="w-9 h-9 text-premium-neon" />
            <span className="font-display text-sm font-bold text-white">From gallery</span>
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => pick(e.target.files?.[0])} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="hidden" />

      {state.captions_enabled && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="post-caption" className="text-xs font-semibold text-zinc-300">Caption (optional)</label>
            <span className="font-mono text-[10px] text-zinc-500">{caption.length}/{MAX_CAPTION}</span>
          </div>
          <textarea
            id="post-caption"
            rows={2}
            maxLength={MAX_CAPTION}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about this moment…"
            className="w-full resize-none rounded-xl border border-premium-borderDark bg-premium-surfaceDark px-3.5 py-2.5 text-base text-white focus:border-premium-gold focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!file || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-premium-gold py-3.5 font-display text-sm font-bold text-black shadow-gold hover:bg-premium-goldHover scale-on-click disabled:opacity-50"
      >
        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span>{busy ? stepLabel : manual ? 'Send for approval' : 'Post to the wall'}</span>
      </button>
      <p className="text-center text-[11px] text-zinc-500">
        {manual ? 'The host approves each photo before it appears on the wall.' : 'Photos go straight to the wall.'}
      </p>
      <Link href={guestAppPath(slug, 'shot')} className="block text-center text-xs font-semibold text-premium-neon">
        Want frames, filters or a video? Open the camera
      </Link>
    </div>
  );
}
