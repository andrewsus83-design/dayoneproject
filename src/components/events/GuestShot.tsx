'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { AlertCircle, Camera, CheckCircle2, ChevronRight, Download, Images, RefreshCw, Share2, ShieldCheck, Upload, Video, X } from 'lucide-react';
import { MAX_CAPTION, guestPhotoApi, photoErrorMessage, type GuestPhotoState, type UploadJob } from '@/lib/photoWallApi';

/*
 * Shot: the guest app's camera once the guest is checked in. Take or pick a photo or a video, then post the photo
 * to the event's photo wall and/or share either to social media (the phone's share sheet). The wall takes photos
 * only; videos are shared from the phone.
 */

type Shot = { file: File; url: string; kind: 'image' | 'video' };

/** The phone's share sheet with the file, or a download where sharing files is not supported. */
async function shareFile(file: File, title: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const data: ShareData = { files: [file], title };
  if (typeof navigator !== 'undefined' && navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name || (file.type.startsWith('video') ? 'video.mp4' : 'photo.jpg');
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}

export function GuestShot({ slug, token, eventName, sample }: { slug: string; token: string | null; eventName: string; sample: boolean }) {
  const [wall, setWall] = useState<GuestPhotoState | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const jobRef = useRef<UploadJob>({});
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (sample || !token) return;
    try {
      setWall(await guestPhotoApi.state(token));
    } catch {
      // The camera and sharing still work without the wall.
    }
  }, [sample, token]);

  useEffect(() => {
    // Loads once; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Free the preview's memory when it changes or the tab closes.
  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  const pick = (file: File | undefined, kind: Shot['kind']) => {
    if (!file) return;
    setShot({ file, url: URL.createObjectURL(file), kind });
    setCaption('');
    setMessage(null);
    jobRef.current = {};
    if (photoRef.current) photoRef.current.value = '';
    if (videoRef.current) videoRef.current.value = '';
  };

  const share = async () => {
    if (!shot) return;
    const result = await shareFile(shot.file, eventName);
    if (result === 'saved') setMessage({ tone: 'ok', text: 'Saved to your phone. Post it from your gallery to any app.' });
  };

  const agree = async () => {
    if (!token) return;
    setAgreeing(true);
    setMessage(null);
    try {
      await guestPhotoApi.consent(token);
      await refresh();
    } catch (e) {
      setMessage({ tone: 'error', text: photoErrorMessage(e) });
    } finally {
      setAgreeing(false);
    }
  };

  const post = async () => {
    if (!shot || !token || !wall) return;
    setMessage(null);
    try {
      const photo = await guestPhotoApi.upload(token, shot.file, wall.captions_enabled ? caption : '', jobRef.current, setStep);
      jobRef.current = {};
      if (photo.status === 'approved') confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setMessage({ tone: 'ok', text: photo.status === 'approved' ? 'Your photo is on the wall!' : 'Sent! The host approves it before it shows on the wall.' });
    } catch (e) {
      setMessage({ tone: 'error', text: photoErrorMessage(e) });
    } finally {
      setStep('idle');
      await refresh();
    }
  };

  const busy = step !== 'idle';
  const remaining = wall ? Math.max(0, wall.photo_quota - wall.photos_used) : 0;
  const wallReady = !!wall && wall.enabled && wall.checked_in && wall.uploads_open;
  const stepLabel = step === 'compressing' ? 'Optimizing…' : step === 'uploading' ? 'Uploading…' : 'Saving…';

  return (
    <div className="space-y-4">
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0], 'image')} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0], 'video')} />

      {!shot ? (
        <>
          <div className="text-center pt-2 space-y-1">
            <h2 className="text-xl font-display font-bold text-white">Shot</h2>
            <p className="text-[12px] text-zinc-400">Capture the moment. Post photos to the wall or share to your socials.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="aspect-square rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 hover:border-premium-gold flex flex-col items-center justify-center gap-3 scale-on-click shadow-gold"
            >
              <span className="w-16 h-16 rounded-full bg-premium-gold text-black flex items-center justify-center"><Camera className="w-8 h-8" /></span>
              <span className="text-sm font-display font-bold text-white">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="aspect-square rounded-[2rem] bg-premium-charcoal border border-premium-neon/40 hover:border-premium-neon flex flex-col items-center justify-center gap-3 scale-on-click"
            >
              <span className="w-16 h-16 rounded-full bg-premium-neon text-black flex items-center justify-center"><Video className="w-8 h-8" /></span>
              <span className="text-sm font-display font-bold text-white">Video</span>
            </button>
          </div>
          {wall?.enabled && (
            <p className="text-center text-[11px] text-zinc-500 font-mono">{wall.photos_used}/{wall.photo_quota} photos on the wall</p>
          )}
        </>
      ) : (
        <>
          <div className="relative rounded-[2rem] overflow-hidden border border-premium-borderDark bg-black aspect-[4/5]">
            {shot.kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot.url} alt="Your shot" className="w-full h-full object-cover" />
            ) : (
              <video src={shot.url} controls playsInline className="w-full h-full object-contain" />
            )}
            <button
              type="button"
              onClick={() => { setShot(null); setMessage(null); }}
              disabled={busy}
              className="absolute top-3 right-3 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-white scale-on-click"
              aria-label="Discard and take another"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 border ${message.tone === 'ok' ? 'bg-premium-success/10 border-premium-success/40 text-white' : 'bg-premium-danger/10 border-premium-danger/50 text-white'}`}>
              {message.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 text-premium-success flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Photo wall: photos only, once the host has it open and the guest has agreed. */}
          {shot.kind === 'image' && !sample && wallReady && wall && (
            !wall.consented_at ? (
              <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-gold/40 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="w-4 h-4 text-premium-gold" /> Share on the photo wall</div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  Your photos show on the event&apos;s wall and album with your first name and initial.
                  {wall.moderation === 'manual' ? ' The host approves each one first.' : ''} You can remove them any time, and they are deleted 30 days after the event.
                </p>
                <button type="button" onClick={agree} disabled={agreeing} className="w-full py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-60">
                  {agreeing ? 'Saving…' : 'I agree'}
                </button>
              </div>
            ) : remaining <= 0 ? (
              <p className="text-[12px] text-zinc-400 p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                You&apos;ve shared {wall.photo_quota} photos on the wall. Remove one in My photos to post another. You can still share this one.
              </p>
            ) : (
              <>
                {wall.captions_enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-1 text-[11px] text-zinc-400">
                      <span>Caption (optional)</span>
                      <span className="font-mono">{caption.length}/{MAX_CAPTION}</span>
                    </div>
                    <textarea
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
                  onClick={post}
                  disabled={busy}
                  className="w-full py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {busy ? stepLabel : wall.moderation === 'manual' ? 'Send to the wall for approval' : 'Post to the photo wall'}
                </button>
              </>
            )
          )}
          {shot.kind === 'image' && !sample && wall && !wallReady && (
            <p className="text-[12px] text-zinc-500 text-center">{wall.enabled ? 'Photo wall uploads have closed.' : "The host hasn't opened the photo wall yet."} You can still share this.</p>
          )}
          {shot.kind === 'video' && (
            <p className="text-[12px] text-zinc-500 text-center">The photo wall takes photos. Share your video to your socials.</p>
          )}
          {sample && <p className="text-[12px] text-zinc-500 text-center">This is a sample event, so nothing is posted to a wall.</p>}

          <button
            type="button"
            onClick={share}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark hover:border-premium-neon/50 text-white font-bold text-sm scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 className="w-4 h-4 text-premium-neon" /> : <Download className="w-4 h-4 text-premium-neon" />}
            Share to social media
          </button>
        </>
      )}

      {!sample && (
        <Link href={`/events/${slug}/photowall`} className="flex items-center gap-3 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark hover:border-zinc-600 scale-on-click">
          <Images className="w-5 h-5 text-premium-neon flex-shrink-0" />
          <span className="flex-1 text-[13px] font-bold text-white">My photos &amp; event album</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </Link>
      )}
    </div>
  );
}
