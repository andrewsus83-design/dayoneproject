'use client';

import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckCircle2, ClipboardCheck, Download, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload, XCircle,
} from 'lucide-react';
import type { Guest } from '@/lib/types';
import {
  findForm, formatGuestNumber, formLabel, listForms, makePassToken, newId, numberDigits, readGuests, useEventConfig, useGuestList, writeGuests,
} from '@/lib/eventStore';
import {
  addGuest, deleteGuests, importGuests, passCode, SKIP_REASONS, splitContact, updateGuest,
  type GuestInput, type ImportResult,
} from '@/lib/guestsApi';
import { downloadBlob, toCsv } from '@/lib/image';
import { FormFilter, inForm } from './FormFilter';

type SubTab = 'list' | 'invitation' | 'import';

/** Spreadsheet apps run cells that start with = + - @ as formulas; a leading ' keeps them as text. */
const cell = (v: string | number) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v);

/** One spreadsheet row → a guest. Column names are matched loosely (Name, Phone, Email, "Phone / Email", Category, Table). */
function rowToGuest(row: Record<string, unknown>): GuestInput {
  const keys = Object.keys(row);
  const pick = (test: (h: string) => boolean) => {
    const k = keys.find((h) => test(h.toLowerCase().trim()));
    return k ? String(row[k] ?? '').trim() : '';
  };
  const name = pick((h) => h.includes('name') && !h.includes('company'));
  const email = pick((h) => h.includes('email') && !h.includes('phone'));
  const phone = pick((h) => (h.includes('phone') || h.includes('whatsapp') || h.includes('mobile') || h === 'wa') && !h.includes('email'));
  const contact = pick((h) => h.includes('contact') || (h.includes('phone') && h.includes('email')));
  const fromContact = splitContact(contact);
  return {
    name,
    email: email || fromContact.email,
    phone: phone || fromContact.phone,
    tags: pick((h) => h.includes('category') || h.includes('tag') || h === 'type'),
    table_no: pick((h) => h.includes('table') || h.includes('seat')),
  };
}

function importSummary(res: ImportResult): string {
  if (!res.ok) {
    if (res.reason === 'too_many') return `That file has more than ${res.max.toLocaleString()} rows. Split it and import the parts.`;
    return `Nothing was imported: this would add ${res.adding} guest${res.adding === 1 ? '' : 's'} to ${res.total}, and this event's package holds ${res.capacity}. Remove rows, or ask the platform admin to raise the package.`;
  }
  const parts = [`Imported ${res.inserted} new guest${res.inserted === 1 ? '' : 's'}`];
  if (res.updated) parts.push(`updated ${res.updated}`);
  if (res.skipped.length) {
    const examples = res.skipped.slice(0, 4).map((s) => `row ${s.row + 1}${s.name ? ` (${s.name})` : ''}: ${SKIP_REASONS[s.reason] ?? s.reason}`);
    parts.push(`skipped ${res.skipped.length} — ${examples.join('; ')}${res.skipped.length > 4 ? '; …' : ''}`);
  }
  return `${parts.join(' · ')}. ${res.total} of ${res.capacity} guests used.`;
}

interface Draft {
  name: string;
  contact: string;
  category: string;
  table: string;
}

/** Guests tab of the event dashboard: the guest list on the server (sample events: on this device). */
export function GuestsTab({ eventId, onOpenInvitationBuilder }: { eventId: string; onOpenInvitationBuilder: () => void }) {
  const { config, event } = useEventConfig(eventId);
  const info = config.info;
  const isWedding = event.event_type === 'wedding';
  // Polls so check-ins from the door show up while the tab is open.
  const list = useGuestList(eventId, 20_000);
  const guests = list.guests;
  const digits = numberDigits(guests, list.capacity ?? info.capacity);

  const [subTab, setSubTab] = useState<SubTab>('list');
  // Events with several invitation forms: the list shows one form (or all), and guests added here join that form.
  const forms = useMemo(() => listForms(config), [config]);
  const multi = forms.length > 1;
  const [formFilter, setFormFilter] = useState<string | null>(null);
  const addTo = formFilter ?? '';
  const addToLabel = formLabel(findForm(config, addTo));
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: '', contact: '', category: isWedding ? 'Guest' : 'VIP Delegate', table: '' });
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [working, setWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const say = (text: string, tone: 'ok' | 'error' = 'ok') => setStatus({ text, tone });
  const checkedIn = guests.filter((g) => g.is_checked_in).length;

  /* ── Sample events keep their list on this device ── */
  const sampleGuest = (d: Draft): Guest => {
    const now = new Date().toISOString();
    const { email, phone } = splitContact(d.contact);
    return {
      id: newId('g'), event_id: eventId, name: d.name.trim(), email, phone, category: d.category.trim() || 'Guest',
      table_number: d.table.trim() || null, plus_one_count: 0, rsvp_status: 'attending', rsvp_notes: null, custom_fields: {},
      qr_code_token: makePassToken(), form_id: addTo, is_checked_in: false, checked_in_at: null, checked_in_by: null,
      photos_uploaded_count: 0, emails_sent_count: 0, whatsapp_sent_count: 0, created_at: now, updated_at: now,
    };
  };

  const toInput = (d: Draft): GuestInput => ({ name: d.name.trim(), ...splitContact(d.contact), tags: d.category.trim() ? [d.category.trim()] : [], table_no: d.table.trim() || null });

  const handleAdd = async () => {
    if (!draft.name.trim() || working) return;
    if (list.isSample) {
      writeGuests(eventId, [...readGuests(eventId), sampleGuest(draft)]);
    } else {
      setWorking(true);
      try {
        const res = await addGuest(eventId, toInput(draft), addTo || undefined);
        if (!res.ok || res.inserted === 0) {
          const skip = res.ok ? res.skipped[0] : undefined;
          return say(
            !res.ok ? importSummary(res)
              : skip?.reason === 'exists' ? `A guest with that email or phone is already on the list${multi ? ` of ${addToLabel}` : ''}.`
              : `Not added: ${skip ? SKIP_REASONS[skip.reason] : 'please check the details'}.`,
            'error',
          );
        }
      } catch (e) {
        return say(e instanceof Error ? e.message : 'Could not add the guest.', 'error');
      } finally {
        setWorking(false);
      }
    }
    setStatus(null);
    setDraft((d) => ({ ...d, name: '', contact: '', table: '' }));
    setShowAdd(false);
  };

  const startEdit = (g: Guest) =>
    setEditing({ id: g.id, draft: { name: g.name, contact: g.phone || g.email || '', category: (g.tags ?? [g.category]).filter(Boolean).join(', '), table: g.table_number ?? '' } });

  const saveEdit = async () => {
    if (!editing || working) return;
    const d = editing.draft;
    if (!d.name.trim()) return say('A guest needs a name.', 'error');
    if (list.isSample) {
      const { email, phone } = splitContact(d.contact);
      writeGuests(eventId, readGuests(eventId).map((g) => (g.id === editing.id
        ? { ...g, name: d.name.trim(), email, phone, category: d.category.trim(), table_number: d.table.trim() || null }
        : g)));
      setEditing(null);
      return;
    }
    const current = guests.find((g) => g.id === editing.id);
    const contact = splitContact(d.contact);
    setWorking(true);
    try {
      const res = await updateGuest(eventId, editing.id, {
        name: d.name.trim(),
        // The contact box edits whichever the guest has; the other one stays.
        ...(contact.email !== null ? { email: contact.email } : current?.email && !d.contact.trim() ? { email: null } : {}),
        ...(contact.phone !== null ? { phone: contact.phone } : current?.phone && !d.contact.trim() ? { phone: null } : {}),
        tags: d.category.split(',').map((t) => t.trim()).filter(Boolean),
        table_no: d.table.trim() || null,
      });
      if (!res.ok) {
        const field = res.field === 'phone' ? 'phone number' : res.field === 'email' ? 'email' : res.field ?? 'details';
        return say(res.reason === 'taken' ? `Another guest already has that ${field}.` : res.reason === 'not_found' ? 'That guest is no longer on the list.' : `Please check the ${field}.`, 'error');
      }
      setStatus(null);
      setEditing(null);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (g: Guest) => {
    if (!confirm(`Remove ${g.name} from the guest list? Their RSVP, check-in and photos go too.`)) return;
    if (list.isSample) return void writeGuests(eventId, readGuests(eventId).filter((x) => x.id !== g.id));
    try {
      await deleteGuests(eventId, [g.id]);
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not remove the guest.', 'error');
    }
  };

  const handleExport = () => {
    const rows = [
      ['No.', ...(multi ? ['Form'] : []), 'Name', 'Email', 'Phone', 'Category', 'Table', 'RSVP', 'Party', 'QR Token', 'Checked in'],
      ...guests.filter((g) => inForm(g, formFilter)).map((g) => [
        formatGuestNumber(g.guest_number, digits), ...(multi ? [formLabel(findForm(config, g.form_id ?? ''))] : []),
        g.name, g.email ?? '', g.phone ?? '', (g.tags ?? [g.category]).filter(Boolean).join(', '),
        g.table_number ?? '', g.rsvp_status, g.rsvp_status === 'attending' ? g.party_size || g.plus_one_count + 1 : '', g.qr_code_token,
        g.is_checked_in ? 'Yes' : 'No',
      ].map(cell)),
    ];
    downloadBlob(`${info.slug}${formFilter ? `-${formFilter}` : ''}-guests.csv`, new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const handleTemplate = () => {
    const rows = [['Name', 'Phone', 'Email', 'Category', 'Table No.'], ['Jane Doe', '0812 3456 7890', 'jane@example.com', 'VIP', 'Table 05']];
    downloadBlob('dayoneproject-guest-template.csv', new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }).map(rowToGuest);
      const named = rows.filter((r) => r.name);
      if (!named.length) return say('That file has no guests. Use a .csv or .xlsx with a Name column.', 'error');

      if (list.isSample) {
        const current = readGuests(eventId);
        const seen = new Set(current.map((g) => `${g.name.toLowerCase()}|${(g.email ?? g.phone ?? '').toLowerCase()}`));
        const added: Guest[] = [];
        for (const r of named) {
          const key = `${r.name.toLowerCase()}|${(r.email ?? r.phone ?? '').toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          added.push(sampleGuest({ name: r.name, contact: r.email || r.phone || '', category: String(r.tags || 'Guest'), table: r.table_no ?? '' }));
        }
        writeGuests(eventId, [...current, ...added]);
        say(`Imported ${added.length} guest${added.length === 1 ? '' : 's'}${named.length - added.length ? ` · ${named.length - added.length} duplicates skipped` : ''}.`);
      } else {
        setWorking(true);
        // Rows keep their spreadsheet position so skipped rows can be found (row numbers count the header).
        const res = await importGuests(eventId, rows, true, addTo || undefined);
        say(importSummary(res), res.ok ? 'ok' : 'error');
      }
      setSubTab('list');
    } catch (e) {
      say(e instanceof Error && e.message && !/read|parse|zip/i.test(e.message) ? e.message : 'That file could not be read. Use a .csv or .xlsx with a Name column.', 'error');
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const q = search.toLowerCase();
  const filtered = guests.filter((g) => inForm(g, formFilter) &&
    `${formatGuestNumber(g.guest_number, digits)} ${g.name} ${g.email ?? ''} ${g.phone ?? ''} ${(g.tags ?? [g.category]).join(' ')} ${g.table_number ?? ''}`.toLowerCase().includes(q),
  );

  const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-2.5 rounded-xl outline-none focus:border-premium-gold';
  const capacityNote = !list.isSample && list.capacity
    ? `${guests.length} of ${list.capacity} guests on the ${list.packageTier ?? 'current'} package${guests.length >= list.capacity ? ' — the list is full' : ''}. The platform admin can raise the package.`
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold text-white">Guests</h3>
          <p className="text-xs text-zinc-400">
            Total {guests.length} {isWedding ? 'guests' : 'delegates'} enrolled • {checkedIn} checked in at the gate
          </p>
          {capacityNote && (
            <p className={`text-[11px] mt-1 ${list.capacity && guests.length >= list.capacity ? 'text-premium-danger' : 'text-zinc-500'}`}>{capacityNote}</p>
          )}
        </div>

        {subTab === 'list' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={!guests.length}
              className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold scale-on-click flex items-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Attendee</span>
            </button>
          </div>
        )}
        {subTab === 'import' && (
          <button
            type="button"
            disabled={working}
            onClick={() => fileRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60"
          >
            {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload CSV</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => void handleImport(e.target.files?.[0])} />
      </div>

      {status && (
        <div className={`p-3 rounded-xl bg-premium-surfaceDark border text-xs flex items-center justify-between gap-3 ${status.tone === 'error' ? 'border-premium-danger/50 text-premium-danger' : 'border-premium-gold/40 text-white'}`}>
          <span>{status.text}</span>
          <button type="button" onClick={() => setStatus(null)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Dismiss">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {subTab === 'list' && showAdd && (
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
          <div className="sm:col-span-2">
            <label className="text-zinc-400 font-bold block mb-1">Full name</label>
            <input autoFocus value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }} className={input} />
          </div>
          <div>
            <label className="text-zinc-400 font-bold block mb-1">Phone or email</label>
            <input value={draft.contact} placeholder="0812… or name@…" onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))} className={input} />
          </div>
          <div>
            <label className="text-zinc-400 font-bold block mb-1">Category · Table</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className={input} />
              <input value={draft.table} placeholder="T-05" onChange={(e) => setDraft((d) => ({ ...d, table: e.target.value }))} className={input} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!draft.name.trim() || working}
            className="py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold scale-on-click disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {working && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add guest
          </button>
          {multi && <p className="sm:col-span-5 text-[11px] text-zinc-500">Joins <span className="text-premium-gold font-bold">{addToLabel}</span> with its own QR pass. Pick another form above the list to add to it instead.</p>}
        </div>
      )}

      {subTab !== 'invitation' && <FormFilter forms={forms} guests={guests} value={formFilter} onChange={setFormFilter} />}

      {subTab === 'list' && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, contact, category or table…"
          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold"
        />
      )}

      {/* Sub-tab pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {([
          { id: 'list', label: 'Guest Roster' },
          { id: 'invitation', label: 'Invitation Form' },
          { id: 'import', label: 'Import CSV' },
        ] as const).map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setSubTab(st.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap scale-on-click transition-all ${
              subTab === st.id
                ? 'bg-premium-gold/15 text-white border border-premium-gold/40'
                : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* ── Guest Roster sub-tab ── */}
      {subTab === 'list' && (
        <div className="rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark overflow-x-auto shadow-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-premium-borderDark bg-premium-black text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                <th className="p-4 pl-6 w-16">#</th>
                <th className="p-4">Attendee</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Category</th>
                <th className="p-4">Table / Seat</th>
                <th className="p-4">QR Pass</th>
                <th className="p-4 text-right">Gate Status</th>
                <th className="p-4 pr-6 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-premium-borderDark/60">
              {(list.status === 'loading' || list.status === 'idle') && !guests.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-zinc-500">
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading guests…</span>
                  </td>
                </tr>
              )}
              {list.status === 'error' && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-premium-danger">
                    {list.error}{' '}
                    <button type="button" onClick={() => void list.refresh()} className="ml-2 inline-flex items-center gap-1 text-zinc-300 hover:text-white font-bold scale-on-click">
                      <RefreshCw className="w-3.5 h-3.5" /> Try again
                    </button>
                  </td>
                </tr>
              )}
              {list.status === 'ready' && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-zinc-500">
                    {guests.length ? `No guests match “${search}”.` : 'No guests yet. Add them here, import a spreadsheet, or share the invitation form.'}
                  </td>
                </tr>
              )}
              {filtered.map((g) => {
                const edit = editing?.id === g.id ? editing.draft : null;
                const setEdit = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
                return (
                  <tr key={g.id} className="hover:bg-premium-surfaceDark/40 transition-colors">
                    <td className="p-4 pl-6 font-mono text-premium-gold font-bold">{formatGuestNumber(g.guest_number, digits)}</td>
                    {edit ? (
                      <>
                        <td className="p-2"><input autoFocus value={edit.name} onChange={(e) => setEdit({ name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(); }} className={input} /></td>
                        <td className="p-2"><input value={edit.contact} placeholder="Phone or email" onChange={(e) => setEdit({ contact: e.target.value })} className={`${input} font-mono`} /></td>
                        <td className="p-2"><input value={edit.category} placeholder="VIP, Family" onChange={(e) => setEdit({ category: e.target.value })} className={input} /></td>
                        <td className="p-2"><input value={edit.table} placeholder="T-05" onChange={(e) => setEdit({ table: e.target.value })} className={input} /></td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <div className="font-bold text-white">{g.name}</div>
                          {g.rsvp_status !== 'pending' && (
                            <div className={`text-[10px] font-bold mt-0.5 ${g.rsvp_status === 'attending' ? 'text-premium-success' : 'text-premium-danger'}`}>
                              {g.rsvp_status === 'attending' ? `RSVP yes · ${g.party_size || g.plus_one_count + 1}` : 'RSVP no'}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-zinc-400 font-mono text-[11px]">
                          {g.phone && <div>{g.phone}</div>}
                          {g.email && <div className="truncate max-w-[180px]">{g.email}</div>}
                        </td>
                        <td className="p-4">
                          {(g.tags ?? [g.category]).filter(Boolean).length ? (
                            <span className="inline-flex flex-wrap gap-1">
                              {(g.tags ?? [g.category]).filter(Boolean).map((t) => (
                                <span key={t} className="px-2.5 py-1 rounded-full bg-premium-gold/15 text-premium-gold border border-premium-gold/30 font-bold uppercase text-[10px]">{t}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-zinc-300 font-medium">{g.table_number || 'General Seating'}</td>
                      </>
                    )}
                    <td className="p-4 text-zinc-500 font-mono text-[10px]" title={g.qr_code_token}>{passCode(g.qr_code_token)}</td>
                    <td className="p-4 text-right">
                      {g.is_checked_in ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-premium-success/15 text-premium-success font-bold text-[10px] border border-premium-success/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Checked-in</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-premium-surfaceDark text-zinc-400 font-mono text-[10px]">Awaiting</span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      {edit ? (
                        <span className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => void saveEdit()} disabled={working} className="px-3 py-1.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-[11px] shadow-gold scale-on-click disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white text-[11px] font-bold scale-on-click">Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          <button type="button" onClick={() => startEdit(g)} className="text-zinc-600 hover:text-premium-gold scale-on-click" aria-label={`Edit ${g.name}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => void handleDelete(g)} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label={`Remove ${g.name}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invitation Form sub-tab ── */}
      {subTab === 'invitation' && (
        <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-xl flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-premium-gold/15 flex items-center justify-center">
            <ClipboardCheck className="w-7 h-7 text-premium-gold" />
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-base">Invitation & RSVP Form Builder</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">Guests who reply to the form join this list with their own QR pass. A reply with the email or phone of a guest already here updates that guest.</p>
          </div>
          <button type="button" onClick={onOpenInvitationBuilder} className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click">
            Open Invitation Builder →
          </button>
        </div>
      )}

      {/* ── Import CSV sub-tab ── */}
      {subTab === 'import' && (
        <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-dashed border-premium-borderDark shadow-xl flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-center">
            <Download className="w-7 h-7 text-zinc-400" />
          </div>
          <div>
            <h4 className="font-display font-bold text-white text-base">Bulk Import via CSV</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Upload a CSV or Excel file with columns: Name, Phone, Email, Category, Table No. Phones like 0812… are saved as +62….
              A row with the email or phone of a guest already on the list updates that guest; repeated rows are skipped.
            </p>
            {multi && <p className="text-[11px] text-zinc-400 mt-2">Imports into <span className="text-premium-gold font-bold">{addToLabel}</span>. Pick another form above to import into it.</p>}
            {capacityNote && <p className="text-[11px] text-zinc-500 mt-2">{capacityNote}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={working}
              onClick={() => fileRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60"
            >
              {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Choose CSV / Excel file
            </button>
            <button type="button" onClick={handleTemplate} className="text-[11px] font-mono text-premium-neon hover:underline scale-on-click">
              Download CSV template ↓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
