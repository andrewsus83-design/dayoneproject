'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Camera, Check, X, Trash2, Copy, ExternalLink, Download, RefreshCw, ShieldCheck, MessageSquare,
  KeyRound, Images, Clock, EyeOff, AlertCircle,
} from 'lucide-react';
import { MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { getClientDomain, getEffectiveClientUrl } from '@/lib/domain';
import { downloadDataUrl } from '@/lib/image';
import {
  PHOTO_QUOTA,
  organizerPhotoApi,
  photoErrorMessage,
  photoUrl,
  isVideoPath,
  type Moderation,
  type PhotoSettings,
  type PhotoStats,
  type QueuePhoto,
} from '@/lib/photoWallApi';

type Filter = 'pending' | 'approved' | 'rejected';
type Action = 'approve' | 'reject' | 'remove';

/** One photo as the moderation grid draws it (server photo or sample). */
interface Item {
  id: string;
  status: Filter;
  url: string;
  caption: string | null;
  guestName: string;
  tableNo: string | null;
  createdAt: string;
}

const FILTERS: { id: Filter; label: string; stat: keyof PhotoStats }[] = [
  { id: 'pending', label: 'Pending', stat: 'pending_count' },
  { id: 'approved', label: 'On the wall', stat: 'approved_count' },
  { id: 'rejected', label: 'Rejected', stat: 'rejected_count' },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_MS = 10_000;

function toItem(p: QueuePhoto): Item {
  return {
    id: p.id,
    status: p.status,
    url: photoUrl(p.storage_path),
    caption: p.caption,
    guestName: p.guest_name,
    tableNo: p.table_no,
    createdAt: p.created_at,
  };
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// ---------------------------------------------------------------------------------------------
// Pieces shared by the live and the sample manager
// ---------------------------------------------------------------------------------------------

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors scale-on-click flex items-center flex-shrink-0 disabled:opacity-50 ${
        on ? 'bg-premium-success justify-end pr-0.5' : 'bg-premium-borderDark pl-0.5'
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white" />
    </button>
  );
}

function SettingsCard({
  settings,
  pending,
  saving,
  onChange,
  onApproveAll,
}: {
  settings: Pick<PhotoSettings, 'enabled' | 'moderation' | 'captions_enabled'>;
  pending: number;
  saving: boolean;
  onChange: (patch: { enabled?: boolean; moderation?: Moderation; captionsEnabled?: boolean }) => void;
  onApproveAll: () => void;
}) {
  const manual = settings.moderation === 'manual';
  return (
    <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-display font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-premium-gold" />
            Guest uploads
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Checked-in guests share up to {PHOTO_QUOTA} photos each (WebP, 2 MB max). Kept 30 days after the event.
          </p>
        </div>
        <Switch label="Guest uploads" on={settings.enabled} disabled={saving} onChange={(v) => onChange({ enabled: v })} />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-display font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-premium-gold" />
          Moderation
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            ['manual', 'Moderation: ON', 'You approve each photo'],
            ['auto', 'Moderation: OFF', 'Photos go straight to the wall'],
          ] as const).map(([value, title, sub]) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => settings.moderation !== value && onChange({ moderation: value })}
              className={`p-3 rounded-2xl border text-left transition-all scale-on-click disabled:opacity-60 ${
                settings.moderation === value
                  ? 'border-premium-gold/50 bg-premium-gold/10'
                  : 'border-premium-borderDark bg-premium-surfaceDark hover:border-zinc-600'
              }`}
            >
              <div className={`text-xs font-bold ${settings.moderation === value ? 'text-premium-gold' : 'text-white'}`}>{title}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">({sub})</div>
            </button>
          ))}
        </div>
        {!manual && pending > 0 && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
            <span className="text-[11px] text-zinc-400">
              {pending} photo{pending === 1 ? ' is' : 's are'} still waiting from when moderation was on.
            </span>
            <button
              type="button"
              onClick={onApproveAll}
              className="px-3 py-1.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-[11px] font-display font-bold shadow-gold scale-on-click flex-shrink-0"
            >
              Approve all
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-display font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-premium-gold" />
            Guest captions
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Guests can add a caption to each photo (up to 300 characters).</p>
        </div>
        <Switch label="Guest captions" on={settings.captions_enabled} disabled={saving} onChange={(v) => onChange({ captionsEnabled: v })} />
      </div>
    </div>
  );
}

function StatsRow({ stats }: { stats: PhotoStats | null }) {
  const cells = [
    { label: 'Pending', value: stats?.pending_count ?? 0, className: 'text-premium-gold' },
    { label: 'On the wall', value: stats?.approved_count ?? 0, className: 'text-premium-success' },
    { label: 'Rejected', value: stats?.rejected_count ?? 0, className: 'text-premium-danger' },
    { label: 'Guests who agreed', value: stats?.consent_count ?? 0, className: 'text-white' },
    { label: 'Stored', value: megabytes(stats?.stored_bytes ?? 0), className: 'text-premium-neon' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cells.map((c) => (
        <div key={c.label} className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{c.label}</div>
          <div className={`text-xl font-display font-bold mt-1 ${c.className}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function PhotoGrid({
  items,
  filter,
  counts,
  busyIds,
  onFilter,
  onAction,
  onApproveAll,
  footer,
}: {
  items: Item[];
  filter: Filter;
  counts: Record<Filter, number>;
  busyIds: Set<string>;
  onFilter: (f: Filter) => void;
  onAction: (item: Item, action: Action) => void;
  onApproveAll: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all scale-on-click ${
                filter === f.id
                  ? 'bg-premium-gold/15 text-premium-gold border-premium-gold/40'
                  : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'
              }`}
            >
              {f.label} <span className="font-mono">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        {filter === 'pending' && counts.pending > 0 && (
          <button
            type="button"
            onClick={onApproveAll}
            className="px-3.5 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-display font-bold shadow-gold scale-on-click flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Approve all pending
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Images className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-500">
            {filter === 'pending' ? 'Nothing waiting for approval.' : filter === 'approved' ? 'No photos on the wall yet.' : 'No rejected photos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const busy = busyIds.has(item.id);
            return (
              <div key={item.id} className="rounded-2xl overflow-hidden bg-premium-surfaceDark border border-premium-borderDark flex flex-col">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square bg-premium-black">
                  {isVideoPath(item.url) ? (
                    <video src={item.url} muted loop autoPlay playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.caption || `Photo by ${item.guestName}`} loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {item.status === 'pending' && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-premium-gold text-black text-[9px] font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Pending
                    </span>
                  )}
                </a>
                <div className="p-2.5 space-y-1 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">
                    {item.guestName}
                    {item.tableNo && <span className="text-zinc-500 font-mono font-normal"> · {item.tableNo}</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500">{timeAgo(item.createdAt)}</div>
                  {item.caption && <p className="text-[11px] text-zinc-300 line-clamp-3">“{item.caption}”</p>}
                </div>
                <div className="grid grid-cols-3 border-t border-premium-borderDark">
                  {item.status !== 'approved' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction(item, 'approve')}
                      title="Approve: show on the wall"
                      className="py-2 text-premium-success hover:bg-premium-success/10 flex items-center justify-center scale-on-click disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                  {item.status !== 'rejected' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAction(item, 'reject')}
                      title={item.status === 'approved' ? 'Take off the wall' : 'Reject'}
                      className="py-2 text-premium-gold hover:bg-premium-gold/10 flex items-center justify-center scale-on-click disabled:opacity-40"
                    >
                      {item.status === 'approved' ? <EyeOff className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(item, 'remove')}
                    title="Remove for good (deletes the file)"
                    className="py-2 text-premium-danger hover:bg-premium-danger/10 flex items-center justify-center scale-on-click disabled:opacity-40"
                  >
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {footer}
    </div>
  );
}

function CopyField({ label, display, getValue, openHref }: { label: string; display: string; getValue: () => string; openHref?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(getValue()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  };
  return (
    <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-1.5 min-w-0">
      <p className="text-[10px] font-mono text-zinc-500 uppercase">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-premium-neon font-mono text-xs flex-1 truncate">{display}</span>
        <button type="button" onClick={copy} title="Copy link" className="p-2 rounded-xl bg-premium-black border border-premium-borderDark hover:border-zinc-600 scale-on-click">
          {copied ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
        </button>
        {openHref && (
          <Link href={openHref} target="_blank" title="Open" className="p-2 rounded-xl bg-premium-black border border-premium-borderDark hover:border-zinc-600 scale-on-click">
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        )}
      </div>
    </div>
  );
}

function LinksCard({ slug, wallKey, onNewKey, keyBusy }: { slug: string; wallKey: string | null; onNewKey?: () => void; keyBusy?: boolean }) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(getEffectiveClientUrl(slug, '/photowall'), { width: 600, margin: 2, color: { dark: '#09090B', light: '#ffffff' } })
      .then(setQr)
      .catch(() => undefined);
  }, [slug]);

  const domain = getClientDomain(slug);
  const livePath = wallKey ? `/events/${slug}/photowall/live?key=${wallKey}` : `/events/${slug}/photowall/live`;

  return (
    <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
      <h4 className="text-sm font-display font-bold text-white">Links</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {qr ? <img src={qr} alt="QR code for the guest uploader" className="w-full h-full" /> : <Camera className="w-10 h-10 text-black" />}
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-zinc-400 max-w-[12rem]">Print or project this so guests open the uploader.</p>
            <button
              type="button"
              disabled={!qr}
              onClick={() => downloadDataUrl(`${slug}-photowall-qr.png`, qr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-premium-gold hover:bg-premium-goldHover text-black rounded-xl text-xs font-display font-bold scale-on-click shadow-gold disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 flex-1 min-w-0">
          <CopyField
            label="Guest upload"
            display={`${domain}/photowall`}
            getValue={() => getEffectiveClientUrl(slug, '/photowall')}
            openHref={`/events/${slug}/photowall`}
          />
          <CopyField
            label="Live wall (screen / projector)"
            display={wallKey ? `${domain}/photowall/live?key=${wallKey.slice(0, 6)}…` : `${domain}/photowall/live`}
            getValue={() => `${getEffectiveClientUrl(slug, '/photowall/live')}${wallKey ? `?key=${wallKey}` : ''}`}
            openHref={livePath}
          />
        </div>
      </div>
      {onNewKey && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-premium-borderDark">
          <p className="text-[11px] text-zinc-500 max-w-md">
            The wall key keeps the live wall private. A new key stops every old wall link (including guests&apos; album) until they reload from a new link.
          </p>
          <button
            type="button"
            onClick={onNewKey}
            disabled={keyBusy}
            className="px-3.5 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold/50 scale-on-click flex items-center gap-1.5 disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5 text-premium-gold" />
            New wall key
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Live manager (events saved on the server)
// ---------------------------------------------------------------------------------------------

function LivePhotoWallManager({ eventId, slug }: { eventId: string; slug: string }) {
  const [settings, setSettings] = useState<PhotoSettings | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unsaved' | 'error'>('loading');
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [items, setItems] = useState<QueuePhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    organizerPhotoApi
      .settings(eventId)
      .then((s) => {
        if (!alive) return;
        setSettings(s);
        setLoadState(s ? 'ready' : 'unsaved');
        if (s?.moderation === 'auto') setFilter('approved');
      })
      .catch(() => alive && setLoadState('error'));
    return () => {
      alive = false;
    };
  }, [eventId]);

  const refresh = useCallback(
    () =>
      Promise.all([organizerPhotoApi.stats(eventId), organizerPhotoApi.queue(eventId, filter)])
        .then(([nextStats, rows]) => {
          setStats(nextStats);
          setItems(rows);
          setHasMore(rows.length >= 60);
        })
        .catch((e: unknown) => setError(photoErrorMessage(e))),
    [eventId, filter],
  );

  useEffect(() => {
    if (loadState !== 'ready') return;
    refresh();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadState, refresh]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    try {
      const rows = await organizerPhotoApi.queue(eventId, filter, last);
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      setHasMore(rows.length >= 60);
    } catch (e) {
      setError(photoErrorMessage(e));
    }
  };

  const change = async (patch: { enabled?: boolean; moderation?: Moderation; captionsEnabled?: boolean }) => {
    if (!settings) return;
    const before = settings;
    setSettings({
      ...settings,
      enabled: patch.enabled ?? settings.enabled,
      moderation: patch.moderation ?? settings.moderation,
      captions_enabled: patch.captionsEnabled ?? settings.captions_enabled,
    });
    setSaving(true);
    setError(null);
    try {
      setSettings(await organizerPhotoApi.update(eventId, patch));
    } catch (e) {
      setSettings(before);
      setError(photoErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const act = async (ids: string[] | null, action: Action) => {
    if (action === 'remove' && !window.confirm('Remove this photo for good? The file is deleted and the guest sees it removed.')) return;
    setError(null);
    setBusyIds((prev) => new Set([...prev, ...(ids ?? items.map((i) => i.id))]));
    try {
      await organizerPhotoApi.moderate(eventId, ids, action);
      await refresh();
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setBusyIds(new Set());
    }
  };

  const newKey = async () => {
    if (!window.confirm('Make a new wall key? Screens showing the live wall need the new link, and guests reload their album.')) return;
    setKeyBusy(true);
    setError(null);
    try {
      const key = await organizerPhotoApi.newWallKey(eventId);
      setSettings((s) => (s ? { ...s, wall_key: key } : s));
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setKeyBusy(false);
    }
  };

  if (loadState === 'loading') {
    return <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-xs text-zinc-500 text-center">Loading the photo wall…</div>;
  }
  if (loadState === 'unsaved' || loadState === 'error' || !settings) {
    return (
      <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-premium-gold mx-auto" />
        <p className="text-sm font-display font-bold text-white">
          {loadState === 'error' ? "We couldn't load the photo wall" : 'Save this event to your organization first'}
        </p>
        <p className="text-xs text-zinc-400">
          {loadState === 'error'
            ? 'Check your connection and reload the page.'
            : 'The photo wall works on events saved to the server. Use Save & publish, then come back here.'}
        </p>
      </div>
    );
  }

  const counts: Record<Filter, number> = {
    pending: stats?.pending_count ?? 0,
    approved: stats?.approved_count ?? 0,
    rejected: stats?.rejected_count ?? 0,
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/50 text-xs text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="text-zinc-400 hover:text-white scale-on-click">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <SettingsCard settings={settings} pending={counts.pending} saving={saving} onChange={change} onApproveAll={() => act(null, 'approve')} />
      <StatsRow stats={stats} />
      <PhotoGrid
        items={items.map(toItem)}
        filter={filter}
        counts={counts}
        busyIds={busyIds}
        onFilter={(f) => {
          setFilter(f);
          setItems([]);
        }}
        onAction={(item, action) => act([item.id], action)}
        onApproveAll={() => act(null, 'approve')}
        footer={
          hasMore && (
            <button
              type="button"
              onClick={loadMore}
              className="w-full py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-zinc-300 hover:text-white scale-on-click"
            >
              Load more
            </button>
          )
        }
      />
      <LinksCard slug={slug} wallKey={settings.wall_key} onNewKey={newKey} keyBusy={keyBusy} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Sample events keep their demo photos; nothing here is saved.
// ---------------------------------------------------------------------------------------------

const SAMPLE_ITEMS: Item[] = MOCK_PHOTO_WALL_UPLOADS.map((p) => ({
  id: p.id,
  status: p.is_approved ? 'approved' : 'pending',
  url: p.image_url,
  caption: p.caption,
  guestName: p.guest?.name ?? 'Guest',
  tableNo: p.guest?.table_number ?? null,
  createdAt: p.created_at,
}));

function SamplePhotoWallManager({ slug }: { slug: string }) {
  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS);
  const [filter, setFilter] = useState<Filter>('approved');
  const [settings, setSettings] = useState<Pick<PhotoSettings, 'enabled' | 'moderation' | 'captions_enabled'>>({
    enabled: true,
    moderation: 'manual',
    captions_enabled: true,
  });

  const counts: Record<Filter, number> = {
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };
  const act = (ids: string[] | null, action: Action) =>
    setItems((prev) =>
      action === 'remove'
        ? prev.filter((i) => !ids?.includes(i.id))
        : prev.map((i) =>
            (ids ? ids.includes(i.id) : i.status === 'pending')
              ? { ...i, status: action === 'approve' ? 'approved' : 'rejected' }
              : i,
          ),
    );

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-400">
        Sample event: these are demo photos and nothing here is saved. On your own events this tab shows real guest uploads.
      </div>
      <SettingsCard
        settings={settings}
        pending={counts.pending}
        saving={false}
        onChange={(patch) =>
          setSettings((s) => ({
            enabled: patch.enabled ?? s.enabled,
            moderation: patch.moderation ?? s.moderation,
            captions_enabled: patch.captionsEnabled ?? s.captions_enabled,
          }))
        }
        onApproveAll={() => act(null, 'approve')}
      />
      <PhotoGrid
        items={items.filter((i) => i.status === filter)}
        filter={filter}
        counts={counts}
        busyIds={new Set()}
        onFilter={setFilter}
        onAction={(item, action) => act([item.id], action)}
        onApproveAll={() => act(null, 'approve')}
      />
      <LinksCard slug={slug} wallKey={null} />
    </div>
  );
}

export function PhotoWallManager({ eventId, slug, sample }: { eventId: string; slug: string; sample: boolean }) {
  if (sample) return <SamplePhotoWallManager slug={slug} />;
  if (!UUID.test(eventId)) {
    return (
      <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-2">
        <AlertCircle className="w-6 h-6 text-premium-gold mx-auto" />
        <p className="text-sm font-display font-bold text-white">Save this event to your organization first</p>
        <p className="text-xs text-zinc-400">The photo wall works on events saved to the server. Use Save &amp; publish, then come back here.</p>
      </div>
    );
  }
  return <LivePhotoWallManager key={eventId} eventId={eventId} slug={slug} />;
}
