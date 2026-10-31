'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makePassToken, readGuests, useSampleGuests, writeGuests } from '@/lib/eventStore';
import {
  addWalkIn, checkInByToken, checkInGuest, checkInStats, deskGuests, isServerEventId, parsePassToken, searchDeskGuests,
  undoCheckIn, type CheckInCard, type CheckInStats, type DoorGuest,
} from '@/lib/guestsApi';
import type { Guest } from '@/lib/types';

/** A guest as the register desk shows them (no contacts or pass tokens for saved events). */
export interface DeskGuest {
  id: string;
  number?: number;
  name: string;
  table: string | null;
  tags: string[];
  checkedInAt: string | null;
  /** Sample events only: the demo pass code. */
  token?: string;
  /** The invitation form (activity) the guest belongs to; '' is the first form. */
  form?: string;
}

export interface ScanResult {
  /** queued: scanned with no internet; the server checks the pass once the desk is back online. */
  status: 'success' | 'duplicate' | 'invalid' | 'queued';
  guest?: DeskGuest;
  message: string;
  timestamp: string;
}

export interface WalkInInput {
  name: string;
  table: string;
  phone: string;
  category: string;
}

/** How often every desk refreshes the door numbers, and the full list while it is open. */
const STATS_MS = 4_000;
const LIST_MS = 20_000;

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hhmm = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier';

function fromDoor(g: DoorGuest): DeskGuest {
  return { id: g.id, number: g.guest_number, name: g.name, table: g.table_no, tags: g.tags, checkedInAt: g.checked_in_at, form: g.form_id ?? '' };
}

function fromSample(g: Guest): DeskGuest {
  return {
    id: g.id,
    number: g.guest_number,
    name: g.name,
    table: g.table_number,
    tags: g.category ? [g.category] : [],
    checkedInAt: g.is_checked_in ? g.checked_in_at ?? new Date(0).toISOString() : null,
    token: g.qr_code_token,
    form: g.form_id ?? '',
  };
}

function fromCard(card: CheckInCard): ScanResult {
  const g = card.guest;
  const guest: DeskGuest | undefined = g && {
    id: g.id, number: g.guest_number, name: g.name, table: g.table_no, tags: g.tags ?? [], checkedInAt: card.checked_in_at ?? null,
  };
  const timestamp = clock();
  switch (card.outcome) {
    case 'checked_in':
      return { status: 'success', guest, message: card.matched ? 'Already on the list — admitted' : 'Admission verified', timestamp };
    case 'already_checked_in':
      return { status: 'duplicate', guest, message: `Already checked in at ${hhmm(card.checked_in_at)}`, timestamp };
    case 'other_event':
      return { status: 'invalid', message: `This pass is for ${card.event_name ?? 'another event'}`, timestamp };
    case 'other_form':
      return { status: 'invalid', message: `This pass is for ${card.form_name || 'another activity'}. Switch the desk's activity to admit it.`, timestamp };
    case 'full':
      return { status: 'invalid', message: 'The guest list is full (package limit). Ask the organizer.', timestamp };
    case 'invalid':
      return { status: 'invalid', message: card.field === 'phone' ? 'Check the phone number' : card.field === 'table_no' ? 'Table is too long' : 'Check the name', timestamp };
    default:
      return { status: 'invalid', message: 'Pass not found in roster', timestamp };
  }
}

/* ── Working without internet ── */

/** A check-in made while the desk was offline, sent to the server in order once it is back. */
type Pending =
  | { kind: 'token'; token: string; at: string; form?: string | null }
  | { kind: 'guest'; id: string; name: string; at: string }
  | { kind: 'walkin'; id: string; input: { name: string; phone: string; table_no: string; tags: string[]; form?: string | null }; at: string };

const queueKey = (eventId: string) => `d1-desk-queue-${eventId}`;
/** The guest list this desk saved, per activity (the whole list when the desk admits every form). */
const listKey = (eventId: string, form: string | null) => `d1-desk-list-${eventId}${form === null ? '' : `~${form || 'first'}`}`;

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** No internet (as opposed to the server saying no). */
function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /no connection|failed to fetch|networkerror|network|load failed/i.test(msg);
}

const offline = (e: unknown): ScanResult => ({
  status: 'invalid',
  message: e instanceof Error && e.message ? e.message : 'Could not reach the server. Try again.',
  timestamp: clock(),
});

/**
 * The register desk's data. Saved events check in on the server, so several desks can work at once (each one
 * polls the counts every few seconds); the sample events check in on this device.
 * form: the activity (invitation form id, '' for the first form) this desk admits; null admits every form. The list,
 * search, counts and walk-ins then cover that form only, and passes for another form are turned away.
 */
export function useDesk(eventId: string, listOpen: boolean, form: string | null = null, formName: (id: string) => string = () => 'another activity') {
  const sample = !isServerEventId(eventId);
  const allSampleGuests = useSampleGuests(eventId);
  const sampleGuests = useMemo(
    () => (form === null ? allSampleGuests : allSampleGuests.filter((g) => (g.form_id ?? '') === form)),
    [allSampleGuests, form],
  );
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [list, setList] = useState<DoorGuest[] | null>(null);
  const [connection, setConnection] = useState<'ok' | 'offline'>('ok');
  // Check-ins waiting for the internet, and what happened to the ones sent since (problems first).
  const [queue, setQueueState] = useState<Pending[]>([]);
  const [synced, setSynced] = useState<ScanResult[]>([]);
  const queueRef = useRef<Pending[]>([]);
  const flushing = useRef(false);

  const setQueue = useCallback(
    (next: Pending[]) => {
      queueRef.current = next;
      setQueueState(next);
      writeStored(queueKey(eventId), next);
    },
    [eventId],
  );

  // The queue and the last guest list survive a reload, so the desk keeps working through an outage.
  useEffect(() => {
    if (sample) return;
    // Restores what this device saved before the reload.
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = readStored<Pending[]>(queueKey(eventId)) ?? [];
    queueRef.current = saved;
    setQueueState(saved);
    // A desk switching activity starts from that activity's saved list and counts.
    setList(readStored<DoorGuest[]>(listKey(eventId, form)));
    setStats(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sample, eventId, form]);

  const refreshStats = useCallback(async () => {
    if (sample) return;
    try {
      setStats(await checkInStats(eventId, 6, form));
      setConnection('ok');
    } catch {
      setConnection('offline');
    }
  }, [eventId, sample, form]);

  const refreshList = useCallback(async () => {
    if (sample) return;
    try {
      const next = await deskGuests(eventId, form);
      setList(next);
      writeStored(listKey(eventId, form), next);
      setConnection('ok');
    } catch {
      setConnection('offline');
    }
  }, [eventId, sample, form]);

  useEffect(() => {
    if (sample) return;
    const tick = () => document.visibilityState === 'visible' && void refreshStats();
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, STATS_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [sample, refreshStats]);

  // Keep a copy of the guest list on this device from the start, for searching and checking in offline.
  useEffect(() => {
    if (sample) return;
    const t = window.setTimeout(() => void refreshList(), 0);
    return () => window.clearTimeout(t);
  }, [sample, refreshList]);

  useEffect(() => {
    if (sample || !listOpen) return;
    const tick = () => document.visibilityState === 'visible' && void refreshList();
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, LIST_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [sample, listOpen, refreshList]);

  /** Shows a check-in at once, before the next poll. */
  const markLocal = useCallback(
    (id: string, at: string | null) => {
      setList((prev) => {
        const next = prev && prev.map((g) => (g.id === id ? { ...g, checked_in_at: at } : g));
        if (next) writeStored(listKey(eventId, form), next);
        return next;
      });
    },
    [eventId, form],
  );

  const afterCard = useCallback(
    (card: CheckInCard) => {
      const result = fromCard(card);
      if (result.status === 'success' && result.guest) markLocal(result.guest.id, card.checked_in_at ?? new Date().toISOString());
      void refreshStats();
      return result;
    },
    [markLocal, refreshStats],
  );

  /* ── Offline queue ── */

  const enqueue = useCallback((item: Pending) => setQueue([...queueRef.current, item]), [setQueue]);

  const queueToken = useCallback(
    (token: string): ScanResult => {
      const timestamp = clock();
      const earlier = queueRef.current.find((p) => p.kind === 'token' && p.token.toLowerCase() === token.toLowerCase());
      if (earlier) return { status: 'duplicate', message: `Already scanned offline at ${hhmm(earlier.at)}`, timestamp };
      enqueue({ kind: 'token', token, at: new Date().toISOString(), form });
      return { status: 'queued', message: 'No internet: saved on this device. The pass is checked as soon as the desk is back online.', timestamp };
    },
    [enqueue, form],
  );

  /** Sends the saved check-ins in order. Stops at the first sign the internet is still down. */
  const flush = useCallback(async () => {
    if (sample || flushing.current || queueRef.current.length === 0) return;
    flushing.current = true;
    const results: ScanResult[] = [];
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];
        let result: ScanResult;
        try {
          const card =
            item.kind === 'token' ? await checkInByToken(eventId, item.token, item.form)
            : item.kind === 'guest' ? await checkInGuest(eventId, item.id)
            : await addWalkIn(eventId, item.input);
          result = fromCard(card);
          if (item.kind === 'walkin' && result.status === 'success') result.message = 'Walk-in added';
        } catch (e) {
          if (isNetworkError(e)) break;
          result = { ...offline(e), guest: item.kind === 'guest' ? { id: item.id, name: item.name, table: null, tags: [], checkedInAt: null } : undefined };
        }
        results.push({ ...result, message: `Synced (${hhmm(item.at)}): ${result.message}` });
        setQueue(queueRef.current.slice(1));
      }
    } finally {
      flushing.current = false;
    }
    if (results.length) {
      setConnection('ok');
      // Problems first, so the desk sees which offline scans were not valid.
      const order = { invalid: 0, duplicate: 1, queued: 2, success: 3 } as const;
      setSynced((prev) => [...results.sort((a, b) => order[a.status] - order[b.status]), ...prev].slice(0, 30));
      void refreshList();
    }
  }, [sample, eventId, setQueue, refreshList]);

  // Send the queue when the internet comes back.
  useEffect(() => {
    if (sample) return;
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sample, flush]);
  useEffect(() => {
    // Sends the queue once the server answers again; setState happens after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (connection === 'ok' && queue.length > 0) void flush();
  }, [connection, queue.length, flush]);

  /* ── Sample events (this device) ── */

  const sampleCheckIn = useCallback(
    (found: Guest | undefined): ScanResult => {
      const timestamp = clock();
      if (!found) return { status: 'invalid', message: 'Pass not found in roster', timestamp };
      if (form !== null && (found.form_id ?? '') !== form) {
        return { status: 'invalid', message: `This pass is for ${formName(found.form_id ?? '')}. Switch the desk's activity to admit it.`, timestamp };
      }
      if (found.is_checked_in) {
        return { status: 'duplicate', guest: fromSample(found), message: `Already checked in at ${hhmm(found.checked_in_at)}`, timestamp };
      }
      const updated: Guest = { ...found, is_checked_in: true, checked_in_at: new Date().toISOString(), checked_in_by: 'Gate Register PWA' };
      writeGuests(eventId, readGuests(eventId).map((g) => (g.id === found.id ? updated : g)));
      return { status: 'success', guest: fromSample(updated), message: 'Admission verified', timestamp };
    },
    [eventId, form, formName],
  );

  /* ── Actions ── */

  const checkInToken = useCallback(
    async (raw: string): Promise<ScanResult> => {
      const token = parsePassToken(raw);
      if (sample) {
        return sampleCheckIn(readGuests(eventId).find((g) => g.qr_code_token.toLowerCase() === token.toLowerCase()));
      }
      try {
        return afterCard(await checkInByToken(eventId, token, form));
      } catch (e) {
        if (!isNetworkError(e)) return offline(e);
        setConnection('offline');
        return queueToken(token);
      }
    },
    [sample, eventId, form, sampleCheckIn, afterCard, queueToken],
  );

  const checkInById = useCallback(
    async (id: string): Promise<ScanResult> => {
      if (sample) return sampleCheckIn(readGuests(eventId).find((g) => g.id === id));
      try {
        return afterCard(await checkInGuest(eventId, id));
      } catch (e) {
        if (!isNetworkError(e)) return offline(e);
        setConnection('offline');
        // The guest is on the list this desk saved, so they can come in now; the server hears about it later.
        const found = list?.find((g) => g.id === id);
        const timestamp = clock();
        if (!found) return { status: 'invalid', message: 'No internet, and this guest is not in the list saved on this device.', timestamp };
        if (found.checked_in_at) return { status: 'duplicate', guest: fromDoor(found), message: `Already checked in at ${hhmm(found.checked_in_at)}`, timestamp };
        const at = new Date().toISOString();
        enqueue({ kind: 'guest', id, name: found.name, at });
        markLocal(id, at);
        return { status: 'success', guest: { ...fromDoor(found), checkedInAt: at }, message: 'Admitted offline: syncs when the desk is back online', timestamp };
      }
    },
    [sample, eventId, sampleCheckIn, afterCard, list, enqueue, markLocal],
  );

  const undo = useCallback(
    async (id: string): Promise<string | null> => {
      if (sample) {
        writeGuests(eventId, readGuests(eventId).map((g) => (g.id === id ? { ...g, is_checked_in: false, checked_in_at: null, checked_in_by: null } : g)));
        return null;
      }
      // A check-in still waiting for the internet is simply dropped.
      const waiting = queueRef.current.find((p) => p.kind !== 'token' && p.id === id);
      if (waiting) {
        setQueue(queueRef.current.filter((p) => p !== waiting));
        markLocal(id, null);
        return null;
      }
      try {
        const res = await undoCheckIn(eventId, id);
        markLocal(id, null);
        void refreshStats();
        return res.ok ? null : 'That guest was not checked in.';
      } catch (e) {
        if (isNetworkError(e)) return 'Undo needs the internet. Try again when the desk is back online.';
        return e instanceof Error ? e.message : 'Could not undo. Try again.';
      }
    },
    [sample, eventId, markLocal, refreshStats, setQueue],
  );

  const walkIn = useCallback(
    async (input: WalkInInput): Promise<ScanResult> => {
      const tags = input.category && input.category !== 'Regular' ? [input.category] : [];
      if (sample) {
        const now = new Date().toISOString();
        const guest: Guest = {
          id: `walk-in-${Date.now()}`,
          event_id: eventId,
          name: input.name.trim(),
          email: null,
          phone: input.phone.trim() || null,
          table_number: input.table.trim() || null,
          category: input.category,
          plus_one_count: 0,
          rsvp_status: 'attending',
          rsvp_notes: null,
          qr_code_token: makePassToken(),
          is_checked_in: true,
          checked_in_at: now,
          checked_in_by: 'Gate Register — Manual',
          photos_uploaded_count: 0,
          emails_sent_count: 0,
          whatsapp_sent_count: 0,
          custom_fields: {},
          form_id: form ?? '',
          created_at: now,
          updated_at: now,
        };
        writeGuests(eventId, [guest, ...readGuests(eventId)]);
        return { status: 'success', guest: fromSample(guest), message: 'Walk-in admitted manually', timestamp: clock() };
      }
      const payload = { name: input.name.trim(), phone: input.phone.trim(), table_no: input.table.trim(), tags, form };
      try {
        const card = await addWalkIn(eventId, payload);
        const result = afterCard(card);
        if (result.status === 'success' && !card.matched) {
          result.message = 'Walk-in admitted manually';
          void refreshList();
        }
        return result;
      } catch (e) {
        if (!isNetworkError(e)) return offline(e);
        setConnection('offline');
        const id = `offline-${Date.now().toString(36)}`;
        const at = new Date().toISOString();
        enqueue({ kind: 'walkin', id, input: payload, at });
        return {
          status: 'success',
          guest: { id, name: payload.name, table: payload.table_no || null, tags, checkedInAt: at },
          message: 'Walk-in saved offline: added to the list when the desk is back online',
          timestamp: clock(),
        };
      }
    },
    [sample, eventId, form, afterCard, refreshList, enqueue],
  );

  const search = useCallback(
    async (query: string): Promise<DeskGuest[] | null> => {
      if (sample) return null;
      try {
        return (await searchDeskGuests(eventId, query, form)).map(fromDoor);
      } catch (e) {
        if (!isNetworkError(e) || !list) return null;
        // Offline: search the list saved on this device.
        const q = query.trim().toLowerCase().replace(/^#/, '');
        return list
          .filter((g) => g.name.toLowerCase().includes(q) || String(g.guest_number) === q)
          .slice(0, 20)
          .map(fromDoor);
      }
    },
    [sample, eventId, form, list],
  );

  const guests = useMemo(() => (sample ? sampleGuests.map(fromSample) : (list ?? []).map(fromDoor)), [sample, sampleGuests, list]);
  const total = sample ? sampleGuests.length : stats?.total_guests ?? list?.length ?? 0;
  const checkedIn = sample ? sampleGuests.filter((g) => g.is_checked_in).length : stats?.checked_in ?? 0;

  return {
    sample,
    guests,
    listLoaded: sample || list !== null,
    total,
    checkedIn,
    /** Latest check-ins at every desk (saved events). */
    recent: stats?.recent ?? [],
    connection,
    /** Check-ins saved on this device while offline, not yet on the server. */
    pending: queue.length,
    /** What happened to offline check-ins once they were sent (problems first). */
    synced,
    syncNow: flush,
    checkInToken,
    checkInById,
    undo,
    walkIn,
    search,
    refreshList,
  };
}
