'use client';

import React, { useCallback, useEffect, useMemo, useState, use, Suspense, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Camera, QrCode, RefreshCw } from 'lucide-react';
import { useEventConfigBySlug } from '@/lib/eventStore';
import { isSampleSlug } from '@/lib/events';
import { guestAppPath } from '@/lib/guestsApi';
import { MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { GuestPhotoFeed, type FeedItem } from '@/components/events/GuestPhotoFeed';
import {
  guestPhotoApi,
  photoUrl,
  readStoredPass,
  useWallFeed,
  type GuestPhotoState,
  type WallPhoto,
} from '@/lib/photoWallApi';
import { BrandMark } from '@/components/BrandMark';

const noopSubscribe = () => () => {};
const REFRESH_MS = 20_000;
function Shell({ slug, title, subtitle, children }: { slug: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="guest-app min-h-screen bg-premium-black text-zinc-100 font-sans">
      <div className="max-w-md mx-auto min-h-screen flex flex-col border-x border-premium-borderDark">
        <header className="h-16 px-4 border-b border-premium-borderDark bg-premium-surfaceDark/90 backdrop-blur-md flex items-center gap-3 sticky top-0 z-40">
          <Link
            href={guestAppPath(slug, 'activity')}
            aria-label="Back to the guest app"
            className="p-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-display font-bold text-white truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>}
          </div>
          <BrandMark size={32} />
        </header>
        <main className="py-4 px-[5%] space-y-4 flex-1">{children}</main>
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

const SAMPLE_ITEMS: FeedItem[] = MOCK_PHOTO_WALL_UPLOADS.filter((p) => p.is_approved).map((p) => ({
  id: p.id,
  url: p.video_url ?? p.image_url,
  caption: p.caption ?? null,
  name: p.guest?.name ?? null,
  at: p.created_at,
}));

const wallItem = (p: WallPhoto): FeedItem => ({ id: p.id, url: p.url, caption: p.caption, name: p.name, at: p.approved_at });

function GuestPhotoWallContent({ slug }: { slug: string }) {
  const { event } = useEventConfigBySlug(slug);
  const fromUrl = useSearchParams().get('t');
  const stored = useSyncExternalStore(noopSubscribe, () => readStoredPass(slug), () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const token = fromUrl || stored;

  if (!hydrated) {
    return (
      <Shell slug={slug} title="Photo wall" subtitle={event.name}>
        <p className="text-xs text-zinc-500 text-center py-12">Loading…</p>
      </Shell>
    );
  }
  if (isSampleSlug(slug)) {
    return (
      <GuestPhotoFeed
        slug={slug}
        eventName={event.name}
        total={SAMPLE_ITEMS.length}
        showCaptions
        wall={SAMPLE_ITEMS}
        mine={[]}
        post={null}
        postOffNote="This is a sample event, so uploads are off. On your own event, checked-in guests share up to 10 photos each."
      />
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

  const wall = useMemo(() => (feed?.photos ?? []).map(wallItem), [feed]);
  const mine = useMemo<FeedItem[]>(
    () =>
      (state?.photos ?? [])
        .filter((p) => p.status !== 'removed')
        .map((p) => ({ id: p.id, url: photoUrl(p.storage_path), caption: p.caption, name: null, at: p.created_at, status: p.status }))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state?.photos],
  );

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
  if (!state.enabled) {
    return (
      <Shell slug={slug} title={title} subtitle={subtitle}>
        <Gate icon={<Camera className="w-6 h-6 text-zinc-400" />} title="The photo wall isn't open yet">
          <p className="text-sm text-zinc-400">Your host hasn&apos;t switched on photo sharing for this event.</p>
        </Gate>
      </Shell>
    );
  }
  if (!state.checked_in) {
    return (
      <Shell slug={slug} title={title} subtitle={subtitle}>
        <Gate icon={<QrCode className="w-6 h-6 text-premium-gold" />} title="Show your QR pass at the entrance first">
          <p className="text-sm text-zinc-400 leading-relaxed">
            Once you&apos;re checked in, you can share up to {state.photo_quota} photos here, {state.guest_name.split(/\s+/)[0]}.
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
      </Shell>
    );
  }

  return (
    <GuestPhotoFeed
      slug={slug}
      eventName={subtitle}
      total={feed?.total ?? 0}
      showCaptions={feed?.captions ?? true}
      wall={wall}
      mine={mine}
      post={{ token, state, onChange: refresh }}
      onRemove={async (id) => {
        await guestPhotoApi.remove(token, id);
        await refresh();
      }}
    />
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
