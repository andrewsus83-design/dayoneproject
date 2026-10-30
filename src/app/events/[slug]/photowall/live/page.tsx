'use client';

import { useEventConfigBySlug } from '@/lib/eventStore';
import React, { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { getClientDomain, getEffectiveClientUrl } from '@/lib/domain';
import { isSampleSlug } from '@/lib/events';
import { feedToUploads, useWallFeed } from '@/lib/photoWallApi';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import { ScreenControls } from '@/components/screens/ScreenControls';
import { Camera, Maximize2, Minimize2, QrCode, WifiOff } from 'lucide-react';
import QRCode from 'qrcode';

const SAMPLE_PHOTOS = MOCK_PHOTO_WALL_UPLOADS.filter((p) => p.is_approved);

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center space-y-3 p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
        <h2 className="text-xl font-display font-bold text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function LivePhotoWallContent({ slug }: { slug: string }) {
  const { event, eventId } = useEventConfigBySlug(slug);
  const sample = isSampleSlug(slug);
  const key = useSearchParams().get('key');
  const clientDomain = getClientDomain(slug);
  const { feed, state } = useWallFeed(slug, sample ? null : key, 4000);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    // Guests scan this to open the uploader on their phone (their pass on that phone identifies them).
    QRCode.toDataURL(getEffectiveClientUrl(slug, '/photowall'), {
      width: 220,
      margin: 1,
      color: { dark: '#09090B', light: '#ffffff' },
    }).then(setQrDataUrl);
  }, [slug]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return;
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const photos = sample ? SAMPLE_PHOTOS : feedToUploads(feed?.photos ?? []);
  const captionsEnabled = sample ? event.settings?.enablePhotoWallCaptions ?? true : feed?.captions ?? true;
  const total = sample ? SAMPLE_PHOTOS.length : feed?.total ?? 0;
  const title = feed?.event.name || event.name;

  let body: React.ReactNode;
  if (sample) {
    body = <PinterestMasonryPhotoWall photos={photos} showCaptions={captionsEnabled} canLike={false} />;
  } else if (!key) {
    body = (
      <Notice title="This wall needs its key">
        <p className="text-sm text-zinc-400">Open the live wall from the Photo Wall tab in your dashboard. That link includes the wall key.</p>
      </Notice>
    );
  } else if (state === 'loading') {
    body = <Notice title="Loading the wall…" />;
  } else if (state === 'missing') {
    body = (
      <Notice title="This wall link no longer works">
        <p className="text-sm text-zinc-400">The event isn&apos;t published, or the wall key was changed. Copy the new link from the Photo Wall tab.</p>
      </Notice>
    );
  } else if (state === 'offline' && !feed) {
    body = (
      <Notice title="We couldn't reach the wall">
        <p className="text-sm text-zinc-400">Check this screen&apos;s internet connection. The wall retries every few seconds.</p>
      </Notice>
    );
  } else if (feed && !feed.enabled) {
    body = (
      <Notice title="The photo wall is switched off">
        <p className="text-sm text-zinc-400">Switch on guest uploads in the Photo Wall tab to show photos here.</p>
      </Notice>
    );
  } else if (!photos.length) {
    body = (
      <Notice title="Be the first on the wall">
        <p className="text-sm text-zinc-400">Scan the code below with your phone camera to share a photo.</p>
      </Notice>
    );
  } else {
    body = <PinterestMasonryPhotoWall photos={photos} showCaptions={captionsEnabled} canLike={false} />;
  }

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between overflow-x-hidden relative select-none font-sans">
      <ScreenControls backHref={`/dashboard/events/${eventId}?tab=live`} backLabel="Dashboard" />
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-premium-neon/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-premium-gold/10 blur-[180px] pointer-events-none rounded-full" />

      <header className="h-20 px-8 flex items-center justify-between z-20 backdrop-blur-md bg-premium-surfaceDark/80 border-b border-premium-borderDark">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold flex-shrink-0">
            D1
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2 truncate">
              <span className="truncate">{title}</span>
              <span className="px-3 py-1 bg-premium-neon/15 text-premium-neon border border-premium-neon/30 rounded-full font-mono font-bold text-xs flex-shrink-0">
                LIVE PHOTO WALL
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono truncate">
              <span className="text-premium-neon font-bold">{clientDomain}</span>
              {sample && <span> • sample event</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">On the wall</span>
            <span className="text-sm font-bold text-premium-success flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
              <span>
                {total} photo{total === 1 ? '' : 's'}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white transition-colors scale-on-click"
            title="Toggle fullscreen (key: F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full z-10 flex flex-col">{body}</main>

      <footer className="h-28 px-8 bg-premium-surfaceDark/95 border-t border-premium-borderDark flex items-center justify-between relative z-20 backdrop-blur-2xl">
        <div className="flex items-center gap-6 min-w-0">
          <div className="p-2.5 bg-white rounded-2xl shadow-2xl flex-shrink-0 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan to share a photo" className="w-20 h-20 object-contain" />
            ) : (
              <QrCode className="w-16 h-16 text-black" />
            )}
          </div>

          <div className="min-w-0">
            <div className="text-base font-display font-medium text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-premium-neon flex-shrink-0" />
              <span>Share your photo on this wall</span>
            </div>
            <div className="text-xs font-mono text-premium-gold font-bold mt-0.5 truncate">
              Scan with your phone camera, or visit {clientDomain}/photowall
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">Checked-in guests can share up to 10 photos each.</p>
          </div>
        </div>

        {!sample && key && state === 'offline' && feed && (
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-premium-danger">
            <WifiOff className="w-4 h-4" />
            <span>Reconnecting…</span>
          </div>
        )}
      </footer>
    </div>
  );
}

function LivePhotoWallWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <LivePhotoWallContent slug={unwrappedParams.slug} />;
}

export default function LivePhotoWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black p-8 text-xs text-zinc-500">Loading live wall…</div>}>
      <LivePhotoWallWrapper params={params} />
    </Suspense>
  );
}
