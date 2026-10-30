'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
}

export interface ScanResult {
  status: 'success' | 'duplicate' | 'invalid';
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
  return { id: g.id, number: g.guest_number, name: g.name, table: g.table_no, tags: g.tags, checkedInAt: g.checked_in_at };
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
    case 'full':
      return { status: 'invalid', message: 'The guest list is full (package limit). Ask the organizer.', timestamp };
    case 'invalid':
      return { status: 'invalid', message: card.field === 'phone' ? 'Check the phone number' : card.field === 'table_no' ? 'Table is too long' : 'Check the name', timestamp };
    default:
      return { status: 'invalid', message: 'Pass not found in roster', timestamp };
  }
}

const offline = (e: unknown): ScanResult => ({
  status: 'invalid',
  message: e instanceof Error && e.message ? e.message : 'Could not reach the server. Try again.',
  timestamp: clock(),
});

/**
 * The register desk's data. Saved events check in on the server, so several desks can work at once (each one
 * polls the counts every few seconds); the sample events check in on this device.
 */
export function useDesk(eventId: string, listOpen: boolean) {
  const sample = !isServerEventId(eventId);
  const sampleGuests = useSampleGuests(eventId);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [list, setList] = useState<DoorGuest[] | null>(null);
  const [connection, setConnection] = useState<'ok' | 'offline'>('ok');

  const refreshStats = useCallback(async () => {
    if (sample) return;
    try {
      setStats(await checkInStats(eventId, 6));
      setConnection('ok');
    } catch {
      setConnection('offline');
    }
  }, [eventId, sample]);

  const refreshList = useCallback(async () => {
    if (sample) return;
    try {
      setList(await deskGuests(eventId));
      setConnection('ok');
    } catch {
      setConnection('offline');
    }
  }, [eventId, sample]);

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
  const markLocal = useCallback((id: string, at: string | null) => {
    setList((prev) => prev && prev.map((g) => (g.id === id ? { ...g, checked_in_at: at } : g)));
  }, []);

  const afterCard = useCallback(
    (card: CheckInCard) => {
      const result = fromCard(card);
      if (result.status === 'success' && result.guest) markLocal(result.guest.id, card.checked_in_at ?? new Date().toISOString());
      void refreshStats();
      return result;
    },
    [markLocal, refreshStats],
  );

  /* ── Sample events (this device) ── */

  const sampleCheckIn = useCallback(
    (found: Guest | undefined): ScanResult => {
      const timestamp = clock();
      if (!found) return { status: 'invalid', message: 'Pass not found in roster', timestamp };
      if (found.is_checked_in) {
        return { status: 'duplicate', guest: fromSample(found), message: `Already checked in at ${hhmm(found.checked_in_at)}`, timestamp };
      }
      const updated: Guest = { ...found, is_checked_in: true, checked_in_at: new Date().toISOString(), checked_in_by: 'Gate Register PWA' };
      writeGuests(eventId, readGuests(eventId).map((g) => (g.id === found.id ? updated : g)));
      return { status: 'success', guest: fromSample(updated), message: 'Admission verified', timestamp };
    },
    [eventId],
  );

  /* ── Actions ── */

  const checkInToken = useCallback(
    async (raw: string): Promise<ScanResult> => {
      const token = parsePassToken(raw);
      if (sample) {
        return sampleCheckIn(readGuests(eventId).find((g) => g.qr_code_token.toLowerCase() === token.toLowerCase()));
      }
      try {
        return afterCard(await checkInByToken(eventId, token));
      } catch (e) {
        return offline(e);
      }
    },
    [sample, eventId, sampleCheckIn, afterCard],
  );

  const checkInById = useCallback(
    async (id: string): Promise<ScanResult> => {
      if (sample) return sampleCheckIn(readGuests(eventId).find((g) => g.id === id));
      try {
        return afterCard(await checkInGuest(eventId, id));
      } catch (e) {
        return offline(e);
      }
    },
    [sample, eventId, sampleCheckIn, afterCard],
  );

  const undo = useCallback(
    async (id: string): Promise<string | null> => {
      if (sample) {
        writeGuests(eventId, readGuests(eventId).map((g) => (g.id === id ? { ...g, is_checked_in: false, checked_in_at: null, checked_in_by: null } : g)));
        return null;
      }
      try {
        const res = await undoCheckIn(eventId, id);
        markLocal(id, null);
        void refreshStats();
        return res.ok ? null : 'That guest was not checked in.';
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not undo. Try again.';
      }
    },
    [sample, eventId, markLocal, refreshStats],
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
          created_at: now,
          updated_at: now,
        };
        writeGuests(eventId, [guest, ...readGuests(eventId)]);
        return { status: 'success', guest: fromSample(guest), message: 'Walk-in admitted manually', timestamp: clock() };
      }
      try {
        const card = await addWalkIn(eventId, { name: input.name.trim(), phone: input.phone.trim(), table_no: input.table.trim(), tags });
        const result = afterCard(card);
        if (result.status === 'success' && !card.matched) {
          result.message = 'Walk-in admitted manually';
          void refreshList();
        }
        return result;
      } catch (e) {
        return offline(e);
      }
    },
    [sample, eventId, afterCard, refreshList],
  );

  const search = useCallback(
    async (query: string): Promise<DeskGuest[] | null> => {
      if (sample) return null;
      try {
        return (await searchDeskGuests(eventId, query)).map(fromDoor);
      } catch {
        return null;
      }
    },
    [sample, eventId],
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
    checkInToken,
    checkInById,
    undo,
    walkIn,
    search,
    refreshList,
  };
}
