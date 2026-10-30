'use client';

import React, { useState, useEffect, useRef, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  QrCode,
  Mail,
  CheckCircle2,
  X,
  Send,
  Download,
  Search,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

const STORAGE_KEY = (id: string) => `all41-guests-${id}`;

function loadGuests(eventId: string): Guest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(eventId));
    if (raw) return JSON.parse(raw) as Guest[];
  } catch {}
  return MOCK_GUESTS;
}

function saveGuests(eventId: string, guests: Guest[]) {
  try {
    localStorage.setItem(STORAGE_KEY(eventId), JSON.stringify(guests));
  } catch {}
}

function GuestListContent({ eventId }: { eventId: string }) {
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [hydrated, setHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [selectedGuestQr, setSelectedGuestQr] = useState<Guest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailSentAlert, setEmailSentAlert] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('VIP Delegate');
  const [newTable, setNewTable] = useState('Table 05');

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadGuests(eventId);
    setGuests(saved);
    setHydrated(true);
  }, [eventId]);

  // Persist to localStorage whenever guests change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveGuests(eventId, guests);
  }, [guests, eventId, hydrated]);

  const updateGuests = (updated: Guest[]) => {
    setGuests(updated);
  };

  // Filtered Guests
  const filtered = guests.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.table_number && g.table_number.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'checked_in') return g.is_checked_in;
    if (statusFilter === 'pending') return !g.is_checked_in;
    return true;
  });

  const handleOpenQr = async (guest: Guest) => {
    setSelectedGuestQr(guest);
    try {
      const url = await QRCode.toDataURL(guest.qr_code_token, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0b0d13',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  const handleSendEmail = (guest: Guest) => {
    setEmailSentAlert(`Invitation email sent to ${guest.email || guest.name}!`);
    setTimeout(() => setEmailSentAlert(null), 4000);
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newGuest: Guest = {
      id: `gst-${Date.now()}`,
      event_id: eventId,
      name: newName,
      email: newEmail || null,
      phone: newPhone || null,
      category: newCategory,
      table_number: newTable || null,
      plus_one_count: 0,
      rsvp_status: 'attending',
      rsvp_notes: null,
      custom_fields: {},
      qr_code_token: `QR-D1-${newName.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      is_checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      photos_uploaded_count: 0,
      emails_sent_count: 0,
      whatsapp_sent_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    updateGuests([newGuest, ...guests]);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setIsAddModalOpen(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        let rows: Record<string, string>[] = [];

        if (file.name.endsWith('.csv')) {
          // Parse CSV manually
          const text = data as string;
          const lines = text.split('\n').filter(Boolean);
          const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
          rows = lines.slice(1).map((line) => {
            const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
            return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
          });
        } else {
          // Parse XLSX/XLS
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        }

        const imported: Guest[] = rows
          .filter((r) => r.name || r.Name || r.NAME)
          .map((r, idx) => {
            const name = String(r.name || r.Name || r.NAME || `Guest ${idx + 1}`).trim();
            return {
              id: `gst-import-${Date.now()}-${idx}`,
              event_id: eventId,
              name,
              email: String(r.email || r.Email || r.EMAIL || '').trim() || null,
              phone: String(r.phone || r.Phone || r.PHONE || r.whatsapp || '').trim() || null,
              category: String(r.category || r.Category || r.tag || r.Tag || 'General').trim(),
              table_number: String(r.table || r.Table || r.table_number || '').trim() || null,
              plus_one_count: 0,
              rsvp_status: 'attending' as const,
              rsvp_notes: null,
              custom_fields: {},
              qr_code_token: `QR-D1-${name.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
              is_checked_in: false,
              checked_in_at: null,
              checked_in_by: null,
              photos_uploaded_count: 0,
              emails_sent_count: 0,
              whatsapp_sent_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          });

        updateGuests([...imported, ...guests]);
        setImportStatus(`${imported.length} guests imported successfully from ${file.name}`);
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setTimeout(() => setImportStatus(null), 5000);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Category', 'Table', 'QR Token', 'Checked In'];
    const rows = guests.map((g) => [
      g.name, g.email ?? '', g.phone ?? '', g.category,
      g.table_number ?? '', g.qr_code_token, g.is_checked_in ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checkedInCount = guests.filter((g) => g.is_checked_in).length;

  return (
    <div className="flex-1 flex flex-col font-sans select-none bg-premium-black text-zinc-100 min-h-screen">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="px-8 py-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Breadcrumb */}
        <Link href={`/dashboard/events/${eventId}?tab=guests`} className="inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono">
          <ArrowLeft className="w-3 h-3" /> Back to event
        </Link>

        {/* Page title + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Guest Roster</h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">{guests.length} registered · {guests.filter(g => g.is_checked_in).length} checked in · auto-saved</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-400 hover:text-white hover:border-white/20 transition-all scale-on-click"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV / Excel
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-400 hover:text-white hover:border-white/20 transition-all scale-on-click"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <Link
              href={`/dashboard/events/${eventId}/checkin`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-premium-neon/30 text-xs font-bold text-premium-neon hover:bg-premium-neon/10 transition-all scale-on-click"
            >
              <QrCode className="w-3.5 h-3.5" />
              Gate Scanner
            </Link>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold shadow-gold scale-on-click"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Guest
            </button>
          </div>
        </div>

        {/* Import success / error alert */}
        {importStatus && (
          <div className={`p-4 rounded-2xl flex items-center justify-between text-sm border ${importStatus.startsWith('Import failed') ? 'bg-premium-danger/10 border-premium-danger/30 text-premium-danger' : 'bg-premium-success/10 border-premium-success/30 text-premium-success'}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{importStatus}</span>
            </div>
            <button onClick={() => setImportStatus(null)} className="text-zinc-500 hover:text-white scale-on-click"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Email Dispatched Alert */}
        {emailSentAlert && (
          <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-gold/40 text-premium-gold flex items-center justify-between text-sm shadow-gold">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-premium-gold flex-shrink-0" />
              <span>{emailSentAlert}</span>
            </div>
            <button onClick={() => setEmailSentAlert(null)} className="text-zinc-400 hover:text-white scale-on-click">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Guest Roster Master Table */}
        <div className="bg-premium-charcoal rounded-[2.5rem] border border-premium-borderDark overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-premium-borderDark flex flex-wrap gap-4 items-center justify-between bg-premium-surfaceDark">
            <div className="relative max-w-md w-full">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search guests by name, email, table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-premium-black border border-premium-borderDark rounded-xl text-sm outline-none focus:border-premium-gold text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  statusFilter === 'all'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white bg-premium-black border border-premium-borderDark'
                }`}
              >
                All ({guests.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('checked_in')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  statusFilter === 'checked_in'
                    ? 'bg-premium-success/20 text-premium-success border border-premium-success/30'
                    : 'text-zinc-400 hover:text-white bg-premium-black border border-premium-borderDark'
                }`}
              >
                Checked-in ({checkedInCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  statusFilter === 'pending'
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : 'text-zinc-400 hover:text-white bg-premium-black border border-premium-borderDark'
                }`}
              >
                Pending ({guests.length - checkedInCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-premium-black text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <tr>
                  <th className="px-8 py-5">Guest Name</th>
                  <th className="px-8 py-5">Tag / Category</th>
                  <th className="px-8 py-5">Table #</th>
                  <th className="px-8 py-5">Gate Status</th>
                  <th className="px-8 py-5">Pass Token</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-premium-borderDark">
                {filtered.map((guest) => {
                  const initials = guest.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isVip = guest.category.toLowerCase().includes('vip');

                  return (
                    <tr key={guest.id} className="hover:bg-premium-surfaceDark transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg border ${
                              isVip
                                ? 'bg-premium-gold/10 text-premium-gold border-premium-gold/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base font-display">{guest.name}</div>
                            <div className="text-zinc-500 text-xs font-mono">
                              {guest.email || 'No email registered'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        {isVip ? (
                          <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold border border-premium-gold/30 rounded-full text-xs font-bold uppercase tracking-wider">
                            {guest.category}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold uppercase border border-zinc-700 tracking-wider">
                            {guest.category}
                          </span>
                        )}
                      </td>

                      <td className="px-8 py-6 font-display font-medium text-white text-base">
                        {guest.table_number || 'Unassigned'}
                      </td>

                      <td className="px-8 py-6">
                        {guest.is_checked_in ? (
                          <span className="flex items-center gap-2 text-premium-success font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-premium-success shadow-[0_0_8px_#00E676]"></span>
                            Checked-in
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-zinc-400 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-8 py-6 font-mono text-zinc-400 text-xs">
                        {guest.qr_code_token}
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenQr(guest)}
                            className="p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-premium-gold hover:border-premium-gold/50 transition-colors scale-on-click"
                            title="View QR Entry Pass"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendEmail(guest)}
                            className="p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-premium-neon hover:border-premium-neon/50 transition-colors scale-on-click"
                            title="Email the QR pass"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* QR Code Pass Modal */}
        {selectedGuestQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-premium-charcoal border border-premium-borderDark rounded-[2.5rem] p-8 max-w-sm w-full relative shadow-2xl text-center">
              <button
                type="button"
                onClick={() => setSelectedGuestQr(null)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white scale-on-click"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 mx-auto bg-premium-gold/10 rounded-full flex items-center justify-center mb-4 shadow-gold border border-premium-gold/30">
                <QrCode className="w-8 h-8 text-premium-gold" />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">VIP Access Pass</p>
              <h3 className="text-2xl font-display font-medium text-white mb-1">{selectedGuestQr.name}</h3>
              <p className="text-zinc-400 text-sm mb-6">
                {selectedGuestQr.category} • Table {selectedGuestQr.table_number || 'N/A'}
              </p>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mb-4">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Attendee QR Code"
                    className="w-48 h-48 object-contain mx-auto"
                  />
                )}
              </div>

              <div className="font-mono text-xs text-zinc-400 mb-4 bg-premium-surfaceDark py-2.5 px-3 rounded-xl border border-premium-borderDark">
                {selectedGuestQr.qr_code_token}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSendEmail(selectedGuestQr)}
                  className="w-full py-4 rounded-xl font-bold text-sm bg-premium-gold hover:bg-premium-goldHover text-black transition-all shadow-gold scale-on-click flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Ticket by Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGuestQr(null)}
                  className="w-full bg-transparent border border-zinc-700 text-white py-3 rounded-xl font-bold scale-on-click text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Guest Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-premium-charcoal border border-premium-borderDark rounded-[2.5rem] p-8 max-w-md w-full relative shadow-2xl">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white scale-on-click"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-display font-medium text-white mb-2">Add Event Attendee</h3>
              <p className="text-zinc-400 text-sm mb-6">Create a verified guest pass token for gate entry</p>

              <form onSubmit={handleAddGuest} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Jessica Tan"
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-5 py-3.5 rounded-2xl text-sm focus:border-premium-gold outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. jessica@example.com"
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-5 py-3.5 rounded-2xl text-sm focus:border-premium-gold outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">Category</label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="VIP Delegate"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-5 py-3.5 rounded-2xl text-sm focus:border-premium-gold outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">Table Number</label>
                    <input
                      type="text"
                      value={newTable}
                      onChange={(e) => setNewTable(e.target.value)}
                      placeholder="Table 05"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-5 py-3.5 rounded-2xl text-sm focus:border-premium-gold outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 bg-transparent border border-zinc-700 text-white py-3.5 rounded-2xl font-bold scale-on-click text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-premium-gold hover:bg-premium-goldHover text-black py-3.5 rounded-2xl font-bold shadow-gold scale-on-click text-sm"
                  >
                    Generate Pass
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestListWrapper({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return <GuestListContent eventId={unwrappedParams.id} />;
}

export default function GuestListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading attendee roster...</div>}>
      <GuestListWrapper params={params} />
    </Suspense>
  );
}
