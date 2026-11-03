'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowUp, Camera, CheckCircle2, Clock, Download, Heart, Home, Images, Play, Plus, Share2, Trash2, User, Volume2, VolumeX, XCircle,
} from 'lucide-react';
import { guestAppPath } from '@/lib/guestsApi';
import { downloadMedia, shareMedia } from '@/lib/mediaShare';
import { isVideoPath, photoErrorMessage, thumbUrl, type GuestPhoto, type GuestPhotoState } from '@/lib/photoWallApi';
import { BrandMark } from '@/components/BrandMark';
import { GuestPostSheet } from '@/components/events/GuestPostSheet';

/** One photo or video in the feed. `status` is set only on the guest's own posts. */
export interface FeedItem {
  id: string;
  url: string;
  caption: string | null;
  /** The guest's short name ("Budi S."). */
  name: string | null;
  at: string;
  status?: GuestPhoto['status'];
}

/** What the guest needs to post: null where posting is off (sample events). */
export interface FeedPost {
  token: string;
  state: GuestPhotoState;
  onChange: () => Promise<void>;
}

type Tab = 'wall' | 'mine';

const STATUS: Partial<Record<GuestPhoto['status'], { label: string; className: string; Icon: typeof Clock }>> = {
  pending: { label: 'Waiting for approval', className: 'bg-premium-gold/20 text-premium-gold border-premium-gold/50', Icon: Clock },
  approved: { label: 'On the wall', className: 'bg-premium-success/20 text-premium-success border-premium-success/50', Icon: CheckCircle2 },
  rejected: { label: 'Not approved', className: 'bg-premium-danger/20 text-premium-danger border-premium-danger/50', Icon: XCircle },
};

const NAV_HEIGHT = 'calc(3.5rem + env(safe-area-inset-bottom))';
const TOP_SAFE = 'max(0.75rem, env(safe-area-inset-top))';

const newestFirst = (items: FeedItem[]) => [...items].sort((a, b) => b.at.localeCompare(a.at));
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Keeps the wall in the order the guest started watching. New photos that arrive while they scroll wait behind a
 * "new photos" pill instead of pushing the one on screen away; only the first load fills the feed by itself.
 */
function useStableOrder(items: FeedItem[]) {
  const [order, setOrder] = useState<string[]>([]);
  const [seen, setSeen] = useState<FeedItem[] | null>(null);
  if (items !== seen) {
    setSeen(items);
    const ids = new Set(items.map((i) => i.id));
    const kept = order.filter((id) => ids.has(id));
    const next = kept.length ? kept : newestFirst(items).map((i) => i.id);
    if (next.length !== order.length || next.some((id, i) => id !== order[i])) setOrder(next);
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const list = order.flatMap((id) => byId.get(id) ?? []);
  const merge = () => setOrder(newestFirst(items).map((i) => i.id));
  return { list, waiting: Math.max(0, items.length - list.length), merge };
}

/** The hearts a guest gave, kept on this phone. There is no shared counter, so a heart is a private favourite. */
function useLikes(slug: string) {
  const key = `d1-likes-${slug}`;
  const [liked, setLiked] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const toggle = (id: string) => {
    const next = new Set(liked);
    if (!next.delete(id)) next.add(id);
    setLiked(next);
    try {
      localStorage.setItem(key, JSON.stringify([...next].slice(-500)));
    } catch {
      // Private mode: the heart still shows for this visit.
    }
  };
  return { liked, toggle };
}

/**
 * The guest photo wall, laid out like TikTok, Reels and Shorts: one photo or video fills the screen, swipe up for the
 * next, double-tap to heart, buttons down the right edge, the caption over the bottom, and a + to post. Videos play
 * (muted) while they are on screen. "Mine" is the guest's own posts, with their approval status and a delete button.
 */
export function GuestPhotoFeed({
  slug, eventName, total, showCaptions, wall, mine, post, postOffNote, onRemove,
}: {
  slug: string;
  eventName: string;
  total: number;
  showCaptions: boolean;
  wall: FeedItem[];
  mine: FeedItem[];
  post: FeedPost | null;
  postOffNote?: string;
  onRemove?: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>('wall');
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [topToken, setTopToken] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);
  const { list: wallList, waiting, merge } = useStableOrder(wall);
  const { liked, toggle } = useLikes(slug);
  const pending = mine.filter((m) => m.status === 'pending').length;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const openPost = () => {
    if (post) setSheet(true);
    else notify(postOffNote ?? 'Posting is off for this event.');
  };

  const posted = (photo: GuestPhoto) => {
    setSheet(false);
    setTab('mine');
    if (photo.status === 'approved') confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    notify(photo.status === 'approved' ? 'Your photo is on the wall!' : 'Sent! Waiting for the host to approve it.');
  };

  const remove = async (id: string) => {
    if (!onRemove || !window.confirm('Remove this photo from the wall and the album?')) return;
    try {
      await onRemove(id);
      notify('Photo removed');
    } catch (e) {
      notify(photoErrorMessage(e));
    }
  };

  return (
    <div className="guest-feed fixed inset-0 bg-black text-white font-sans">
      <div className="relative mx-auto h-full w-full max-w-[480px] md:border-x md:border-white/10">
        <FeedPane
          key={tab}
          tab={tab}
          list={tab === 'wall' ? wallList : mine}
          showCaptions={showCaptions}
          liked={liked}
          onLike={toggle}
          onPost={openPost}
          onRemove={tab === 'mine' && onRemove ? remove : undefined}
          notify={notify}
          suspended={sheet}
          topToken={topToken}
        />

        <header
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 bg-gradient-to-b from-black/65 to-transparent px-4 pb-8"
          style={{ paddingTop: TOP_SAFE }}
        >
          <BrandMark size={28} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-tight drop-shadow">{eventName}</h1>
            <p className="font-mono text-[11px] leading-tight text-white/70">{tab === 'wall' ? `${total} on the wall` : 'Your posts'}</p>
          </div>
        </header>

        {tab === 'wall' && waiting > 0 && (
          <button
            type="button"
            onClick={() => { merge(); setTopToken((t) => t + 1); }}
            className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-premium-gold px-4 py-2 font-display text-xs font-bold text-black shadow-gold scale-on-click"
            style={{ top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)' }}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {waiting} new {waiting === 1 ? 'photo' : 'photos'}
          </button>
        )}

        {toast && (
          <div
            role="status"
            className="absolute inset-x-6 z-30 rounded-2xl border border-white/15 bg-black/85 px-4 py-3 text-center text-sm font-semibold animate-fadeIn"
            style={{ bottom: `calc(${NAV_HEIGHT} + 1rem)` }}
          >
            {toast}
          </div>
        )}

        <nav
          aria-label="Photo wall"
          className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]"
          style={{ height: NAV_HEIGHT }}
        >
          <Link href={guestAppPath(slug, 'activity')} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-white/60 scale-on-click">
            <Home className="w-6 h-6" />
            Home
          </Link>
          <NavButton active={tab === 'wall'} onClick={() => setTab('wall')} icon={<Images className="w-6 h-6" />} label="Wall" />
          <button
            type="button"
            onClick={openPost}
            aria-label="Post a photo"
            className="mx-auto flex h-9 w-14 items-center justify-center rounded-xl bg-premium-gold text-black shadow-gold hover:bg-premium-goldHover scale-on-click"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
          </button>
          <NavButton
            active={tab === 'mine'}
            onClick={() => setTab('mine')}
            icon={<User className="w-6 h-6" />}
            label="Mine"
            badge={pending}
          />
          <Link href={guestAppPath(slug, 'shot')} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-white/60 scale-on-click">
            <Camera className="w-6 h-6" />
            Camera
          </Link>
        </nav>

        {sheet && post && (
          <GuestPostSheet
            slug={slug}
            token={post.token}
            state={post.state}
            onClose={() => setSheet(false)}
            onPosted={posted}
            onChange={post.onChange}
          />
        )}
      </div>
    </div>
  );
}

function NavButton({
  active, onClick, icon, label, badge = 0,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-0.5 text-[10px] font-semibold scale-on-click ${active ? 'text-white' : 'text-white/60'}`}
    >
      <span className="relative">
        {icon}
        {badge > 0 && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border border-black bg-premium-gold" aria-label={`${badge} waiting for approval`} />}
      </span>
      {label}
      {active && <span className="absolute -top-px h-0.5 w-6 rounded-full bg-premium-gold" />}
    </button>
  );
}

function FeedPane({
  tab, list, showCaptions, liked, onLike, onPost, onRemove, notify, suspended, topToken,
}: {
  tab: Tab;
  list: FeedItem[];
  showCaptions: boolean;
  liked: Set<string>;
  onLike: (id: string) => void;
  onPost: () => void;
  onRemove?: (id: string) => Promise<void>;
  notify: (message: string) => void;
  /** Something sits over the feed (the post sheet): videos pause. */
  suspended: boolean;
  topToken: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const current = Math.min(active, Math.max(0, list.length - 1));
  const currentItem = list[current];

  // The "new photos" pill takes the guest back to the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [topToken]);

  // Arrow keys and J/K step through the feed on a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = scroller.current;
      if (!el || suspended || (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
      const step = e.key === 'ArrowDown' || e.key === 'j' ? 1 : e.key === 'ArrowUp' || e.key === 'k' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      el.scrollBy({ top: step * el.clientHeight, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [suspended]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
    if (index !== active) {
      setActive(index);
      setPaused(false);
    }
  };

  // Autoplay with sound was refused by the browser: carry on muted.
  const soundBlocked = useCallback(() => setMuted(true), []);

  return (
    <div className="absolute inset-x-0 top-0" style={{ bottom: NAV_HEIGHT }}>
      {list.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Images className="w-8 h-8 text-premium-gold" />
          </span>
          <p className="font-display text-lg font-bold">{tab === 'wall' ? 'No photos on the wall yet' : "You haven't posted yet"}</p>
          <p className="text-sm text-white/60">
            {tab === 'wall' ? 'Be the first to share a moment from the event.' : 'Your photos and their approval status show up here.'}
          </p>
          <button
            type="button"
            onClick={onPost}
            className="flex items-center gap-2 rounded-xl bg-premium-gold px-6 py-3 font-display text-sm font-bold text-black shadow-gold hover:bg-premium-goldHover scale-on-click"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Post a photo
          </button>
        </div>
      ) : (
        <div
          ref={scroller}
          onScroll={onScroll}
          className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
        >
          {list.map((item, i) => (
            <Slide
              key={item.id}
              item={item}
              near={Math.abs(i - current) <= 2}
              active={i === current}
              playing={i === current && !paused && !suspended}
              paused={i === current && paused}
              muted={muted}
              showCaption={showCaptions}
              liked={liked.has(item.id)}
              onLike={() => onLike(item.id)}
              onTogglePlay={() => setPaused((p) => !p)}
              onSoundBlocked={soundBlocked}
              notify={notify}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
            />
          ))}
        </div>
      )}

      {currentItem && isVideoPath(currentItem.url) && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          className="absolute right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 scale-on-click"
          style={{ top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 3.25rem)' }}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}

function Slide({
  item, near, active, playing, paused, muted, showCaption, liked, onLike, onTogglePlay, onSoundBlocked, notify, onRemove,
}: {
  item: FeedItem;
  near: boolean;
  active: boolean;
  playing: boolean;
  paused: boolean;
  muted: boolean;
  showCaption: boolean;
  liked: boolean;
  onLike: () => void;
  onTogglePlay: () => void;
  onSoundBlocked: () => void;
  notify: (message: string) => void;
  onRemove?: () => Promise<void>;
}) {
  const video = isVideoPath(item.url);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [full, setFull] = useState(true);
  const tap = useRef<{ at: number; timer?: number }>({ at: 0 });
  useEffect(() => {
    const t = tap.current;
    return () => window.clearTimeout(t.timer);
  }, []);

  if (!near) return <section className="h-full w-full snap-start snap-always bg-black" aria-hidden />;

  // One tap pauses or plays a video; two quick taps heart the photo wherever the finger landed.
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const now = Date.now();
    const t = tap.current;
    if (now - t.at < 280) {
      window.clearTimeout(t.timer);
      t.at = 0;
      if (!liked) onLike();
      setHearts((h) => [...h, { id: now, x: e.clientX - box.left, y: e.clientY - box.top }]);
    } else {
      t.at = now;
      t.timer = window.setTimeout(() => {
        t.at = 0;
        if (video) onTogglePlay();
      }, 280);
    }
  };

  const share = async () => {
    const outcome = await shareMedia({ url: item.url, id: item.id, caption: item.caption });
    if (outcome === 'copied') notify('Link copied');
    else if (outcome === 'failed') notify('Could not share this one');
  };

  const save = () => {
    downloadMedia(item.url, item.id, video ? (/\.webm(\?|$)/i.test(item.url) ? 'webm' : 'mp4') : /\.jpe?g(\?|$)/i.test(item.url) ? 'jpg' : 'webp');
    notify('Saving to your phone…');
  };

  const status = item.status ? STATUS[item.status] : undefined;
  const live = !item.status || item.status === 'approved';
  const caption = showCaption || item.status ? item.caption : null;

  return (
    <section className="relative h-full w-full snap-start snap-always overflow-hidden bg-black" aria-label={`Photo by ${item.name ?? 'a guest'}`}>
      {/* A tiny copy of the photo, stretched, fills the bars around a photo that does not fit the screen (no blur to paint). */}
      {!video && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(item.url, 48)} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60" />
      )}
      {video ? (
        <FeedVideo src={item.url} active={active} playing={playing} muted={muted} onSoundBlocked={onSoundBlocked} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={full ? thumbUrl(item.url, 1080) : item.url}
          alt={item.caption || 'Event photo'}
          loading={active ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onError={() => setFull(false)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      <div className="absolute inset-0 z-[1]" onClick={onTap} />
      {hearts.map((h) => (
        <Heart
          key={h.id}
          onAnimationEnd={() => setHearts((cur) => cur.filter((x) => x.id !== h.id))}
          className="pointer-events-none absolute z-[2] h-24 w-24 fill-premium-danger text-premium-danger drop-shadow-lg animate-heart-pop"
          style={{ left: h.x, top: h.y }}
        />
      ))}
      {paused && (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45">
            <Play className="ml-1 h-10 w-10 fill-white text-white" />
          </span>
        </div>
      )}

      <div className="absolute bottom-5 right-3 z-10 flex flex-col items-center gap-5">
        <RailButton label={liked ? 'Liked' : 'Like'} onClick={onLike} pressed={liked}>
          <Heart key={String(liked)} className={`h-7 w-7 ${liked ? 'fill-premium-danger text-premium-danger animate-like-beat' : ''}`} />
        </RailButton>
        {live && (
          <RailButton label="Share" onClick={() => void share()}>
            <Share2 className="h-7 w-7" />
          </RailButton>
        )}
        <RailButton label="Save" onClick={save}>
          <Download className="h-7 w-7" />
        </RailButton>
        {onRemove && (
          <RailButton
            label={removing ? 'Removing' : 'Delete'}
            disabled={removing}
            onClick={() => {
              setRemoving(true);
              void onRemove().finally(() => setRemoving(false));
            }}
          >
            <Trash2 className="h-7 w-7" />
          </RailButton>
        )}
      </div>

      <div className="absolute bottom-5 left-4 right-20 z-10 space-y-2">
        {status && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>
            <status.Icon className="h-3 w-3" />
            {status.label}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/25 bg-premium-charcoal font-display text-sm font-bold text-premium-gold">
            {(item.name ?? (item.status ? 'You' : 'G')).charAt(0).toUpperCase()}
          </span>
          <p className="min-w-0 truncate font-display text-base font-bold drop-shadow">
            {item.name ?? (item.status ? 'You' : 'Guest')}
            <span className="ml-2 font-mono text-[11px] font-normal text-white/60">{clock(item.at)}</span>
          </p>
        </div>
        {caption && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`block w-full text-left text-sm leading-snug text-white drop-shadow ${expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-2'}`}
          >
            {caption}
          </button>
        )}
      </div>
    </section>
  );
}

function RailButton({
  label, onClick, pressed, disabled, children,
}: { label: string; onClick: () => void; pressed?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className="flex flex-col items-center gap-1 text-white scale-on-click disabled:opacity-50"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40">{children}</span>
      <span className="text-[11px] font-semibold drop-shadow">{label}</span>
    </button>
  );
}

/** A video that plays (looping) only while it is the one on screen, with a thin progress line along the bottom. */
function FeedVideo({
  src, active, playing, muted, onSoundBlocked,
}: { src: string; active: boolean; playing: boolean; muted: boolean; onSoundBlocked: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && playing) {
      v.play().catch(() => {
        if (v.muted) return;
        v.muted = true;
        onSoundBlocked();
        v.play().catch(() => undefined);
      });
    } else {
      v.pause();
      if (!active) v.currentTime = 0;
    }
  }, [active, playing, onSoundBlocked]);

  return (
    <>
      <video
        ref={video}
        src={src}
        muted
        loop
        playsInline
        preload={active ? 'auto' : 'metadata'}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (bar.current && v.duration) bar.current.style.width = `${(v.currentTime / v.duration) * 100}%`;
        }}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute inset-x-0 bottom-0 z-[3] h-0.5 bg-white/25">
        <div ref={bar} className="h-full bg-white" style={{ width: 0 }} />
      </div>
    </>
  );
}
