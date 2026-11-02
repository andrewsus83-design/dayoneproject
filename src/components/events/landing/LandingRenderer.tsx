'use client';

import React, { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Users, Globe, Copy, CheckCircle2, Star, Quote, ChevronDown, Navigation, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatEventTime, formPath, useAssetUrl, type EventInfo, type FormButton, type LandingConfig, type DesignConfig } from '@/lib/eventStore';
import type { LandingBlock, HeroBlock, CtaTarget, ProgramItem } from '@/lib/landingBlocks';
import { alpha, gradientText, luminance, mix, PRISM_COLORS, type ResolvedTheme } from '@/lib/eventTheme';
import { BrandMark } from '@/components/BrandMark';
import { venueDisplay } from '@/lib/utils';

interface RendererProps {
  slug: string;
  info: EventInfo;
  landing: LandingConfig;
  design: DesignConfig;
  theme: ResolvedTheme;
  isWedding: boolean;
  defaultCover: string;
  embedded?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** The open invitation forms, when the event has more than one (landingFormButtons): invitation buttons become one per form. */
  forms?: FormButton[];
}

function shortDate(date: string, long = false) {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: long ? 'long' : undefined,
    month: long ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function useCountdown(date: string, time: string) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const target = new Date(`${date}T${time || '00:00'}:00`).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (Number.isNaN(diff) || diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0 });
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date, time]);
  return t;
}

function ctaHref(slug: string, target: CtaTarget, url: string) {
  if (target === 'custom') return url ? (/^(https?:|mailto:|tel:|#|\/)/i.test(url) ? url : `https://${url}`) : '#';
  // 'invitation' and the older 'register' both open the invitation form.
  return `/events/${slug}/invitation`;
}

/** A call-to-action's buttons: one per open form when an invitation button belongs to an event with several forms. */
function ctaButtons(p: RendererProps, target: CtaTarget, url: string, label: string): { key: string; href: string; label: string }[] {
  if (target !== 'custom' && p.forms && p.forms.length > 1) return p.forms.map((f) => ({ key: f.id || 'first', href: f.href, label: f.name }));
  if (target !== 'custom' && p.forms?.length === 1) return [{ key: 'cta', href: p.forms[0].href, label }];
  return [{ key: 'cta', href: ctaHref(p.slug, target, url), label }];
}

/** The small label over a heading: spaced capitals, or one larger line when the accent font is a handwriting script. */
function labelLook(theme: ResolvedTheme, color: string, size: 'md' | 'lg' = 'md'): { className: string; style: CSSProperties } {
  const script = theme.accentFamily !== theme.headingFamily;
  return script
    ? { className: size === 'lg' ? 'text-2xl leading-tight' : 'text-xl leading-tight', style: { fontFamily: theme.accentFamily, color } }
    : { className: `${size === 'lg' ? 'text-xs @md:text-sm font-semibold' : 'text-[11px] font-bold'} uppercase tracking-[0.3em]`, style: { fontFamily: theme.accentFamily, color } };
}

function Logo({ refId, size, fallback }: { refId: string; size: 's' | 'm' | 'l'; fallback?: boolean }) {
  const url = useAssetUrl(refId);
  const h = size === 's' ? 32 : size === 'l' ? 64 : 44;
  if (!url) {
    return fallback ? (
      <BrandMark size={40} />
    ) : null;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Event logo" style={{ height: h, width: 'auto', maxWidth: h * 4 }} className="object-contain" />;
}

function SectionHead({ label, heading, intro, theme, center }: { label?: string; heading?: string; intro?: string; theme: ResolvedTheme; center?: boolean }) {
  if (!label && !heading) return null;
  return (
    <div className={center ? 'text-center' : ''} style={{ marginBottom: theme.space.stack * 1.4 }}>
      {label && (
        <p className={`${labelLook(theme, theme.primaryText).className} mb-3`} style={labelLook(theme, theme.primaryText).style}>
          {label}
        </p>
      )}
      {heading && (
        <h2 className="font-bold leading-tight" style={{ fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking, fontSize: 'clamp(24px, 5cqw, 44px)' }}>
          {heading}
        </h2>
      )}
      {intro && <p className={`text-[15px] leading-relaxed mt-3 max-w-2xl ${center ? 'mx-auto' : ''}`} style={{ color: theme.muted }}>{intro}</p>}
    </div>
  );
}

function Diamond({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-[2px] rotate-45 shrink-0 mt-1.5" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />;
}

function HeroSection({ b, p, onLearnMore }: { b: HeroBlock; p: RendererProps; onLearnMore: () => void }) {
  const { theme, info, design, slug, isWedding, embedded } = p;
  const asset = useAssetUrl(b.imageUrl);
  const image = asset || p.defaultCover;
  const time = useCountdown(info.startDate, info.startTime);
  const [copied, setCopied] = useState(false);
  const light = theme.mode === 'light';
  const center = b.layout === 'center' && b.placement !== 'split';
  const placement = b.placement ?? 'inside';
  const onImage = placement === 'inside';
  /** Split: a brand-colour band with the text beside the framed picture. Light text, and gold where the brand colour would vanish. */
  const split = placement === 'split';
  const onDark = onImage || split;
  const key = split ? theme.accent : theme.primary;
  const onKey = split ? (luminance(theme.accent) > 0.4 ? '#14110A' : '#FFFFFF') : theme.onPrimary;
  /** Below the image or on the card, the image is a band of its own and the text takes the theme's colours. */
  const imageHeight = placement === 'card' ? (embedded ? 440 : '64vh') : embedded ? 380 : '58vh';
  const ink = onDark ? '#FFFFFF' : theme.text;
  const soft = onDark ? 'rgba(255,255,255,0.85)' : theme.muted;
  const heading: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: `calc(${theme.space.headingTracking} - 0.01em)` };
  const title = b.title || info.name;
  const titleStyle: CSSProperties =
    b.titleStyle === 'prism' ? gradientText(PRISM_COLORS, true)
    : b.titleStyle === 'gradient' ? gradientText([theme.primary, theme.secondary, theme.accent])
    : { color: ink };
  const taglineSplit = center ? b.tagline.lastIndexOf('. ', b.tagline.length - 2) : -1;

  const share = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{
        minHeight: onImage ? (embedded ? 680 : '92vh') : undefined,
        ...(split ? { background: `linear-gradient(140deg, ${mix(theme.primary, '#000000', 0.55)}, ${mix(theme.primary, '#000000', 0.2)} 70%, ${theme.primary})` } : {}),
      }}
    >
      {!split && <div className={onImage ? 'absolute inset-0 z-0' : 'relative z-0 shrink-0'} style={onImage ? undefined : { height: imageHeight }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className="w-full h-full object-cover" style={{ objectPosition: center ? 'center 20%' : 'center' }} />}
        {onImage && b.overlay && (
          <div
            className="absolute inset-0"
            style={{
              background: light
                ? 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7))'
                : center
                  ? `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 25%, rgba(0,0,0,0.5) 60%, ${theme.bg} 100%)`
                  : `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3) 50%, ${theme.bg})`,
            }}
          />
        )}
        {onImage && !b.overlay && !light && <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(180deg, transparent, ${theme.bg})` }} />}
        {/* Off the image: a shade behind the logo and Share, and a fade into the page under the text. */}
        {!onImage && (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.45), transparent 28%${placement === 'outside' ? `, transparent 72%, ${theme.bg}` : ''})` }}
          />
        )}
      </div>}

      {b.decoration === 'prism' && (
        <>
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              className="absolute top-0 z-[1] pointer-events-none"
              style={{
                [side]: 0,
                ...(onImage ? { bottom: 0 } : { height: imageHeight }),
                width: 'clamp(40px, 9cqw, 120px)',
                opacity: 0.5,
                background: `repeating-linear-gradient(to bottom, ${(side === 'left' ? PRISM_COLORS : [...PRISM_COLORS].reverse())
                  .map((c, i, arr) => `${c} ${((i * 100) / arr.length).toFixed(1)}%, ${c} ${(((i + 1) * 100) / arr.length).toFixed(1)}%`)
                  .join(', ')})`,
                maskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.85), transparent)`,
                WebkitMaskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.85), transparent)`,
              }}
            />
          ))}
        </>
      )}

      <nav className={`${onDark ? 'relative' : 'absolute inset-x-0 top-0'} z-10 flex items-center justify-between px-6 pt-6 gap-3`}>
        <Logo refId={design.logoUrl} size={design.logoSize} fallback />
        <div className="flex items-center gap-2">
          <Link href={`/events/${slug}/invitation`} className="hidden @md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all scale-on-click">
            Invitation Form
          </Link>
          <button type="button" onClick={share} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold scale-on-click" style={{ background: key, color: onKey, borderRadius: theme.buttonRadius }}>
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </nav>

      <div
        className={`relative z-10 flex-1 flex w-full ${
          split ? 'flex-col @3xl:flex-row @3xl:items-center gap-10 px-6 pt-4 pb-16 mx-auto' : `flex-col ${placement === 'card' ? 'px-4' : 'px-6'} ${center ? 'items-center text-center' : ''} ${
            onImage ? (center ? 'justify-center mx-auto py-16' : 'justify-end pb-16 max-w-3xl') : `mx-auto pb-14 ${placement === 'outside' ? 'pt-8' : ''}`
          }`
        }`}
        style={{
          ...(center || !onImage ? { maxWidth: theme.pageWidth } : {}),
          // The card sits half over the bottom of the image.
          ...(placement === 'card' ? { marginTop: embedded ? -150 : 'calc(-1 * min(22vh, 200px))' } : {}),
        }}
      >
        <div
          className={`flex flex-col ${placement === 'card' ? 'w-full p-6 @md:p-10' : ''} ${split ? 'min-w-0 @3xl:flex-1' : ''}`}
          style={{
            gap: theme.space.stack,
            alignItems: center ? 'center' : 'flex-start',
            ...(placement === 'card'
              ? { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: Math.max(theme.radius, 16) * 1.5, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }
              : {}),
          }}
        >
          {center && b.showLogo && design.logoUrl && <Logo refId={design.logoUrl} size="l" />}
          {b.badge && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur"
              style={{
                background: alpha(isWedding ? '#FF3366' : theme.accent, 0.2),
                border: `1px solid ${alpha(isWedding ? '#FF3366' : theme.accent, 0.35)}`,
                color: isWedding ? '#FF3366' : theme.accent,
              }}
            >
              {b.badge}
            </span>
          )}
          {b.eyebrow && (
            <p className={labelLook(theme, soft, 'lg').className} style={labelLook(theme, soft, 'lg').style}>
              {b.eyebrow}
            </p>
          )}
          {center && b.eyebrow && <span className="text-[10px]" style={{ color: theme.primary }}>✦</span>}
          <h1
            className="font-black leading-[0.95]"
            style={{
              ...heading,
              ...titleStyle,
              fontSize: !center ? 'clamp(36px, 8cqw, 64px)' : onImage ? 'clamp(44px, 13cqw, 160px)' : 'clamp(36px, 10cqw, 112px)',
              textShadow: b.titleStyle === 'solid' && onImage ? '0 2px 24px rgba(0,0,0,0.4)' : undefined,
            }}
          >
            {title}
          </h1>
          {b.tagline && (
            <p className={center ? 'uppercase tracking-[0.22em]' : ''} style={{ color: onDark ? 'rgba(255,255,255,0.9)' : theme.text, fontSize: center ? 'clamp(13px, 2.8cqw, 21px)' : 16 }}>
              {taglineSplit > 0 ? (
                <>
                  {b.tagline.slice(0, taglineSplit + 1)}{' '}
                  <strong className="font-black" style={{ color: theme.accent }}>{b.tagline.slice(taglineSplit + 2)}</strong>
                </>
              ) : (
                b.tagline
              )}
            </p>
          )}
          {b.showDescription && info.description && <p className="text-base leading-relaxed max-w-xl" style={{ color: soft }}>{info.description}</p>}

          {b.meta === 'inline' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: soft, justifyContent: center ? 'center' : 'flex-start' }}>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: key }} /> {shortDate(info.startDate)}</span>
              {info.startTime && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: key }} /> {formatEventTime(info.startTime)}</span>}
              {info.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: key }} /> {info.venue}</span>}
            </div>
          )}
          {b.meta === 'pills' && (
            <div className="flex flex-wrap gap-2.5" style={{ justifyContent: center ? 'center' : 'flex-start' }}>
              {[`📅 ${shortDate(info.startDate, true).toUpperCase()}`, info.venue && `📍 ${info.venue.toUpperCase()}`].filter(Boolean).map((t) => (
                <span key={t as string} className="px-5 py-2.5 rounded-full text-xs font-bold tracking-wider backdrop-blur" style={{ background: 'rgba(0,0,0,0.65)', border: `1px solid ${alpha(theme.primary, 0.45)}`, color: mixLight(theme) }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {b.showCountdown && (
            <div className="flex gap-2 justify-center flex-wrap">
              {[{ v: time.d, l: 'DAYS' }, { v: time.h, l: 'HRS' }, { v: time.m, l: 'MIN' }, { v: time.s, l: 'SEC' }].map(({ v, l }) => (
                <div key={l} className="flex flex-col items-center gap-1.5">
                  <div className="w-16 h-16 @md:w-[72px] @md:h-[72px] rounded-xl flex items-center justify-center text-3xl font-black backdrop-blur" style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${alpha(theme.primary, 0.5)}`, color: theme.accent, fontFamily: theme.monoFamily || theme.headingFamily }}>
                    {String(v).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] tracking-[0.18em] font-bold" style={{ color: soft }}>{l}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col @sm:flex-row @sm:flex-wrap gap-3 pt-1" style={{ justifyContent: center ? 'center' : 'flex-start' }}>
            {b.ctaLabel && ctaButtons(p, b.ctaTarget, b.ctaUrl, b.ctaLabel).map((cta) => (
              <Link
                key={cta.key}
                href={cta.href}
                onClick={() => confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-base scale-on-click transition-all"
                style={{ background: key, color: onKey, borderRadius: theme.buttonRadius, boxShadow: `0 0 28px ${alpha(key, 0.35)}`, fontFamily: theme.headingFamily }}
              >
                <Sparkles className="w-5 h-5" />
                {cta.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
            {b.secondaryLabel && (
              <button
                type="button"
                onClick={onLearnMore}
                className={`inline-flex items-center justify-center gap-2 px-6 py-4 border font-bold text-sm transition-all scale-on-click backdrop-blur ${onDark ? 'border-white/25 text-white hover:bg-white/10' : ''}`}
                style={{ borderRadius: theme.buttonRadius, ...(onDark ? {} : { borderColor: theme.border, color: theme.text }) }}
              >
                {b.secondaryLabel} <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
          {b.note && <p className="text-xs tracking-wide" style={{ color: onDark ? 'rgba(255,255,255,0.6)' : theme.subtle }}>{b.note}</p>}
        </div>
        {split && image && (
          <figure className="shrink-0 w-full max-w-[22rem] mx-auto @3xl:mx-0 @3xl:w-[36%] @3xl:max-w-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: '3 / 4', borderRadius: 28, border: `3px solid ${alpha(theme.accent, 0.85)}`, boxShadow: `0 0 0 8px ${alpha(theme.accent, 0.16)}, 0 30px 70px rgba(0,0,0,0.45)` }}
            />
          </figure>
        )}
      </div>
    </section>
  );
}

function mixLight(theme: ResolvedTheme) {
  return theme.mode === 'dark' ? '#F7E7CE' : '#FFFFFF';
}

function GalleryImage({ refId, radius }: { refId: string; radius: number }) {
  const url = useAssetUrl(refId);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-full mb-3 break-inside-avoid object-cover" style={{ borderRadius: radius }} loading="lazy" />;
}

function ImageSection({ refId, caption, theme }: { refId: string; caption: string; theme: ResolvedTheme }) {
  const url = useAssetUrl(refId);
  return (
    <figure className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={caption} className="w-full object-cover" style={{ borderRadius: theme.radius }} />
      ) : (
        <div className="w-full h-48 flex items-center justify-center text-xs" style={{ background: theme.surface, border: `1px dashed ${theme.border}`, borderRadius: theme.radius, color: theme.subtle }}>
          Upload an image in the builder
        </div>
      )}
      {caption && <figcaption className="text-xs text-center" style={{ color: theme.subtle }}>{caption}</figcaption>}
    </figure>
  );
}

function ProgramCard({ it, p }: { it: ProgramItem; p: RendererProps }) {
  const { theme, slug } = p;
  const image = useAssetUrl(it.imageUrl);
  const heading: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking };
  // An event with several forms passes the open ones; a form that is missing from them is closed.
  const open = !p.forms || p.forms.some((f) => f.id === it.formId);
  const href = p.forms?.find((f) => f.id === it.formId)?.href ?? formPath(slug, it.formId);
  const onAccent = luminance(theme.accent) > 0.4 ? '#14110A' : '#FFFFFF';
  return (
    <article className="flex flex-col overflow-hidden min-w-0" style={{ ...theme.cardStyle, padding: 0 }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10', background: theme.surface }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
        {it.date && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-black tracking-wide" style={{ background: theme.accent, color: onAccent }}>
            {it.date}
          </span>
        )}
        {it.badge && (
          <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur" style={{ background: 'rgba(0,0,0,0.6)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.25)' }}>
            {it.badge}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 gap-3" style={{ padding: theme.space.card }}>
        {it.tag && <p className="text-[10px] font-bold uppercase tracking-[0.18em] leading-relaxed" style={{ color: theme.primaryText }}>{it.tag}</p>}
        <h3 className="font-black text-xl leading-tight" style={heading}>{it.title}</h3>
        {it.body && <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{it.body}</p>}
        {it.meta.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-3 mt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
            {it.meta.map((m) => (
              <div key={m.id} className="min-w-0">
                <dt className="text-[9px] font-mono uppercase tracking-wider" style={{ color: theme.subtle, fontFamily: theme.monoFamily || undefined }}>{m.label}</dt>
                <dd className="text-xs font-semibold leading-snug" style={{ ...heading, color: m.color || undefined }}>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {it.buttonLabel && (
          <div className="mt-auto pt-3">
            {open ? (
              <Link
                href={href}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 font-bold text-sm scale-on-click transition-all"
                style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius, ...heading }}
              >
                {it.buttonLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <p className="text-center text-xs font-bold px-5 py-3" style={{ background: theme.surface, color: theme.subtle, borderRadius: theme.buttonRadius }}>Registration is closed</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function CountdownBand({ label, until, info, theme }: { label: string; until?: string; info: EventInfo; theme: ResolvedTheme }) {
  const t = useCountdown(until || info.startDate, until ? '23:59' : info.startTime);
  return (
    <section style={{ background: theme.card, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: `${theme.space.stack * 1.6}px 24px` }}>
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
        {label && <p className="text-xs font-mono uppercase tracking-widest" style={{ color: theme.subtle, fontFamily: theme.monoFamily || undefined }}>{label}</p>}
        <div className="flex items-center gap-4 @sm:gap-8">
          {[{ v: t.d, l: 'Days' }, { v: t.h, l: 'Hours' }, { v: t.m, l: 'Min' }, { v: t.s, l: 'Sec' }].map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center gap-1">
              <span className="text-4xl @sm:text-5xl font-bold tabular-nums" style={{ fontFamily: theme.monoFamily || theme.headingFamily, color: theme.primaryText }}>{String(v).padStart(2, '0')}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: theme.subtle, fontFamily: theme.monoFamily || undefined }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingRenderer(p: RendererProps) {
  const { landing, theme, info, slug, embedded, selectedId, onSelect } = p;
  const visible = landing.blocks.filter((b) => !b.hidden);
  const heading: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking };
  const firstIsHero = visible[0]?.type === 'hero';
  const learnMore = (fromId: string) => {
    const idx = visible.findIndex((b) => b.id === fromId);
    const next = visible[idx + 1];
    if (next) document.getElementById(`blk-${next.id}`)?.scrollIntoView({ behavior: 'smooth' });
  };
  const directions = venueDisplay(info).mapsUrl;
  const pad = `${theme.space.section / 2}px 24px`;
  /** The content column, as wide as the Design Studio's page width. */
  const column: CSSProperties = { width: theme.pageWidth, marginInline: 'auto' };

  const renderBlock = (b: LandingBlock) => {
    switch (b.type) {
      case 'hero':
        return <HeroSection b={b} p={p} onLearnMore={() => learnMore(b.id)} />;
      case 'countdown':
        return <CountdownBand label={b.label} until={b.until} info={info} theme={theme} />;
      case 'details': {
        const items = [
          b.showDate && { icon: Calendar, label: 'Date', val: shortDate(info.startDate) },
          b.showVenue && { icon: MapPin, label: 'Venue', val: info.venue.split(',')[0] ?? '' },
          b.showCapacity && { icon: Users, label: 'Capacity', val: `${info.capacity} Guests` },
          b.showLink && { icon: Globe, label: 'Link', val: `app.dayoneproject.xyz/events/${info.slug}` },
        ].filter(Boolean) as { icon: typeof Calendar; label: string; val: string }[];
        return (
          <div style={{ ...column, padding: pad }}>
            <div className="grid grid-cols-2 @2xl:grid-cols-4" style={{ gap: theme.space.gap }}>
              {items.map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex flex-col gap-2 min-w-0" style={{ ...theme.cardStyle, padding: theme.space.card * 0.85 }}>
                  <Icon className="w-5 h-5" style={{ color: theme.primaryText }} />
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.subtle, fontFamily: theme.monoFamily || undefined }}>{label}</div>
                  <div className="text-sm font-semibold leading-snug break-words" style={heading}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'text':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} center={b.align === 'center'} />
            <div style={b.card ? { ...theme.cardStyle, padding: theme.space.card * 1.4 } : undefined}>
              <p className={`text-[15px] leading-[1.85] whitespace-pre-line ${b.align === 'center' ? 'text-center' : ''}`} style={{ color: theme.muted }}>{b.body}</p>
            </div>
          </div>
        );
      case 'features':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} intro={b.intro} theme={theme} />
            {b.layout === 'list' ? (
              <div style={{ ...theme.cardStyle, padding: theme.space.card * 1.4 }}>
                {b.items.map((it, i) => (
                  <div key={it.id} className="flex gap-5" style={{ paddingTop: i ? theme.space.stack : 0, marginTop: i ? theme.space.stack : 0, borderTop: i ? `1px solid ${alpha(theme.primary, 0.15)}` : 'none' }}>
                    <Diamond color={it.color || theme.primary} />
                    <div>
                      <p className="font-black text-[15px]" style={heading}>{it.title}</p>
                      {it.subtitle && <p className="text-xs font-bold tracking-wide mt-0.5 mb-2" style={{ color: it.color || theme.secondaryText }}>{it.subtitle}</p>}
                      {it.body && <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{it.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${b.items.length % 3 === 0 ? '@2xl:grid-cols-3' : '@lg:grid-cols-2'}`} style={{ gap: theme.space.gap }}>
                {b.items.map((it) => (
                  <div key={it.id} className="flex gap-4" style={{ ...theme.cardStyle, padding: theme.space.card }}>
                    <Diamond color={it.color || theme.primary} />
                    <div className="min-w-0">
                      {it.subtitle && <span className="text-xs font-mono font-bold" style={{ color: it.color || theme.primaryText, fontFamily: theme.monoFamily || undefined }}>{it.subtitle}</span>}
                      <h3 className="font-bold text-sm" style={heading}>{it.title}</h3>
                      {it.body && <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.muted }}>{it.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'gallery':
        return b.images.length ? (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} />
            <div className="columns-2 @2xl:columns-3 gap-3">
              {b.images.map((img) => <GalleryImage key={img.id} refId={img.url} radius={Math.min(theme.radius, 20)} />)}
            </div>
          </div>
        ) : embedded ? (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} />
            <div className="h-32 flex items-center justify-center text-xs" style={{ background: theme.surface, border: `1px dashed ${theme.border}`, borderRadius: theme.radius, color: theme.subtle }}>Add photos in the builder</div>
          </div>
        ) : null;
      case 'testimonials':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} />
            <div className="grid grid-cols-1 @lg:grid-cols-2" style={{ gap: theme.space.gap }}>
              {b.items.map((t) => (
                <div key={t.id} className="space-y-3" style={{ ...theme.cardStyle, padding: theme.space.card }}>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4" style={{ color: theme.primary, fill: theme.primary }} />)}
                  </div>
                  <p className="text-sm italic leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <p className="text-xs font-bold" style={{ color: theme.subtle }}>{t.name}{t.role ? ` · ${t.role}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'quote':
        return (
          <div style={{ ...column, padding: pad }}>
            <blockquote className="flex gap-4 items-start" style={{ ...theme.cardStyle, padding: theme.space.card * 1.4 }}>
              <Quote className="w-6 h-6 shrink-0" style={{ color: theme.primaryText }} />
              <div>
                <p className="text-lg italic leading-relaxed" style={{ fontFamily: theme.accentFamily === theme.headingFamily ? theme.headingFamily : theme.accentFamily }}>{b.text}</p>
                {b.author && <p className="text-xs mt-3 font-bold" style={{ color: theme.subtle }}>— {b.author}</p>}
              </div>
            </blockquote>
          </div>
        );
      case 'facts':
        return (
          <div style={{ ...column, padding: pad }}>
            <div style={{ ...theme.cardStyle, padding: theme.space.card * 1.4, border: `1px solid ${alpha(theme.primary, 0.25)}` }}>
              <SectionHead label={b.label} heading={b.heading} theme={theme} />
              <div className="grid grid-cols-1 @lg:grid-cols-3" style={{ gap: theme.space.gap }}>
                {b.items.map((it) => (
                  <div key={it.id}>
                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: theme.subtle, fontFamily: theme.monoFamily || undefined }}>{it.label}</div>
                    <div className="text-sm font-semibold" style={{ ...heading, color: it.color || undefined }}>{it.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'stats':
        return (
          <div style={{ ...column, padding: pad }}>
            <div style={{ ...theme.cardStyle, padding: theme.space.card * 1.3 }}>
              {b.label && (
                <span className={`inline-block px-4 py-1.5 mb-4 ${theme.accentFamily !== theme.headingFamily ? 'text-lg' : 'text-xs font-bold uppercase tracking-widest'}`} style={{ border: `1.5px solid ${theme.primary}`, borderRadius: 7, fontFamily: theme.accentFamily }}>
                  {b.label}
                </span>
              )}
              {b.heading && <p className="text-3xl font-black" style={heading}>{b.heading}</p>}
              {b.subheading && <p className="text-[11px] uppercase tracking-wider mt-1 mb-4" style={{ color: theme.subtle }}>{b.subheading}</p>}
              <div className="flex flex-wrap" style={{ gap: theme.space.gap * 0.75 }}>
                {b.items.map((it) => {
                  const c = it.color || theme.primary;
                  return (
                    <div key={it.id} className="flex-1 min-w-[110px] text-center p-3 rounded-xl" style={{ background: alpha(c, 0.1), border: `1px solid ${alpha(c, 0.3)}` }}>
                      <p className="text-2xl font-black" style={{ ...heading, color: c }}>{it.value}</p>
                      <p className="text-[11px]" style={{ color: theme.muted }}>{it.label}</p>
                    </div>
                  );
                })}
              </div>
              {(b.note || b.noteValue) && (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${alpha(theme.primary, 0.2)}` }}>
                  {b.note && <p className="text-xs" style={{ color: theme.muted }}>{b.note}</p>}
                  {b.noteValue && <p className="text-base font-black mt-1" style={{ ...heading, color: theme.accent }}>{b.noteValue}</p>}
                </div>
              )}
            </div>
          </div>
        );
      case 'venue':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} />
            <div style={{ ...theme.cardStyle, padding: theme.space.card * 1.3 }} className="space-y-4">
              <p className="text-sm font-bold" style={heading}>{info.venue}</p>
              {b.body && <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: theme.muted }}>{b.body}</p>}
              {b.tips.length > 0 && (
                <div className="space-y-3">
                  {b.tips.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base" style={{ background: t.color || theme.primary }}>{t.label}</span>
                      <p className="text-[13px]" style={{ color: theme.muted }}>{t.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {b.showDirections && (
                <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold scale-on-click" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.buttonRadius }}>
                  <Navigation className="w-4 h-4" /> Get directions
                </a>
              )}
            </div>
          </div>
        );
      case 'programs':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} intro={b.intro} theme={theme} center />
            <div className={`grid grid-cols-1 ${b.items.length >= 3 ? '@3xl:grid-cols-3' : b.items.length === 2 ? '@2xl:grid-cols-2' : 'max-w-md mx-auto w-full'}`} style={{ gap: theme.space.gap }}>
              {b.items.map((it) => <ProgramCard key={it.id} it={it} p={p} />)}
            </div>
          </div>
        );
      case 'faq':
        return (
          <div style={{ ...column, padding: pad }}>
            <SectionHead label={b.label} heading={b.heading} theme={theme} center />
            <div className="max-w-3xl mx-auto flex flex-col" style={{ gap: theme.space.gap * 0.6 }}>
              {b.items.map((it) => (
                <details key={it.id} className="group" style={{ ...theme.cardStyle, padding: 0 }}>
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 font-bold text-[15px] [&::-webkit-details-marker]:hidden" style={heading}>
                    <span className="min-w-0">{it.question}</span>
                    <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" style={{ color: theme.primaryText }} />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed whitespace-pre-line" style={{ color: theme.muted }}>{it.answer}</p>
                </details>
              ))}
            </div>
          </div>
        );
      case 'image':
        return (
          <div style={b.fullWidth ? { padding: `${theme.space.section / 2}px 0` } : { ...column, padding: pad }}>
            <ImageSection refId={b.url} caption={b.caption} theme={theme} />
          </div>
        );
      case 'cta':
        return (
          <div className="text-center" style={{ ...column, padding: `${theme.space.section * 0.75}px 24px` }}>
            {b.label && <p className={`${labelLook(theme, theme.primaryText).className} mb-3`} style={labelLook(theme, theme.primaryText).style}>{b.label}</p>}
            {b.heading && <h2 className="font-bold mb-4" style={{ ...heading, fontSize: 'clamp(26px, 5cqw, 44px)' }}>{b.heading}</h2>}
            {b.body && <p className="max-w-md mx-auto mb-8" style={{ color: theme.muted }}>{b.body}</p>}
            {b.ctaLabel && (
              <div className="flex flex-wrap justify-center gap-3">
                {ctaButtons(p, b.ctaTarget, b.ctaUrl, b.ctaLabel).map((cta) => (
                  <Link
                    key={cta.key}
                    href={cta.href}
                    className="inline-flex items-center gap-2 px-10 py-5 font-bold text-lg scale-on-click transition-all"
                    style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius, boxShadow: `0 0 28px ${alpha(theme.primary, 0.35)}`, ...heading }}
                  >
                    <Sparkles className="w-5 h-5" /> {cta.label} <ArrowRight className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            )}
            {b.note && <p className="text-xs mt-4" style={{ color: theme.subtle }}>{b.note}</p>}
          </div>
        );
    }
  };

  return (
    <div className={`@container min-h-full ${embedded ? '' : 'guest-landing'}`} style={{ ...theme.vars, background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}>
      {!firstIsHero && (
        <nav className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <Logo refId={p.design.logoUrl} size={p.design.logoSize} fallback />
          <Link href={`/events/${slug}/invitation`} className="px-4 py-2 text-xs font-bold scale-on-click" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius }}>
            Invitation Form
          </Link>
        </nav>
      )}

      {visible.map((b) => (
        <div
          key={b.id}
          id={`blk-${b.id}`}
          onClick={onSelect ? (e) => { e.preventDefault(); onSelect(b.id); } : undefined}
          className={onSelect ? 'relative cursor-pointer' : 'relative'}
          style={embedded && selectedId === b.id ? { outline: `3px solid ${theme.primary}`, outlineOffset: -3 } : undefined}
        >
          {renderBlock(b)}
        </div>
      ))}

      {visible.length === 0 && (
        <div className="py-32 text-center text-sm" style={{ color: theme.subtle }}>No sections yet — add a block in the builder.</div>
      )}

      <footer className="px-6 text-center" style={{ borderTop: `1px solid ${theme.border}`, padding: `${theme.space.section * 0.6}px 24px` }}>
        {landing.footerTitle && (
          <p className="font-black mb-2" style={{ ...heading, fontSize: 'clamp(32px, 7cqw, 60px)', ...gradientText(PRISM_COLORS, true) }}>{landing.footerTitle}</p>
        )}
        {landing.footerTagline && <p className="text-[11px] uppercase tracking-[0.22em] mb-6" style={{ color: theme.muted }}>{landing.footerTagline}</p>}
        {landing.footerText && <p className="text-xs mb-4" style={{ color: theme.subtle }}>{landing.footerText}</p>}
        <div className="flex flex-col @md:flex-row items-center justify-between gap-4 pt-2" style={column}>
          <div className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="text-xs" style={{ color: theme.subtle }}>Powered by dayoneproject.xyz</span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: theme.subtle }}>
            <Link href={`/events/${slug}/stage`} className="hover:underline">Stage Display</Link>
            <Link href="/dashboard" className="hover:underline">Organizer Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
