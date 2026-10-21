'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { MOCK_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  QrCode,
  Mail,
  CheckCircle2,
  Clock,
  X,
  Send,
  Download,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';

function GuestListContent({ eventId }: { eventId: string }) {
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');
  const [selectedGuestQr, setSelectedGuestQr] = useState<Guest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailSentAlert, setEmailSentAlert] = useState<string | null>(null);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('VIP Delegate');
  const [newTable, setNewTable] = useState('Table 05');

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
    setEmailSentAlert(`Invitation email successfully dispatched via Resend to ${guest.email || guest.name}!`);
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
      qr_code_token: `QR-ALL41-${newName.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      is_checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      photos_uploaded_count: 0,
      emails_sent_count: 0,
      whatsapp_sent_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setGuests([newGuest, ...guests]);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setIsAddModalOpen(false);
  };

  const checkedInCount = guests.filter((g) => g.is_checked_in).length;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={`${MOCK_EVENT.name} • Attendees`}
        subtitle="Manage guest roster, issue dynamic QR passes, and trigger Resend email invites"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Email Dispatched Alert */}
        {emailSentAlert && (
          <div className="p-4 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{emailSentAlert}</span>
            </div>
            <button onClick={() => setEmailSentAlert(null)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>Guest Roster & Passports</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#182033] border border-[#263554] text-gray-300 font-mono">
                  {guests.length} Registered
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Gate Check-in: <strong className="text-[#00ff88]">{checkedInCount}</strong> / {guests.length} checked-in ({((checkedInCount / guests.length) * 100).toFixed(0)}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/events/${eventId}/checkin`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#172138] border border-[#27385c] text-xs font-semibold text-[#00f0ff] hover:bg-[#202c48] transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch Gate Scanner</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] text-[#0b0d13] text-xs font-bold hover:brightness-110 transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Guest</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121624] p-3 rounded-2xl border border-[#1e263d]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#1b2338] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({guests.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('checked_in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'checked_in'
                  ? 'bg-[#00ff88]/20 text-[#00ff88]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Checked-in ({checkedInCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pending ({guests.length - checkedInCount})
            </button>
          </div>
        </div>

        {/* Guest Table */}
        <div className="rounded-2xl bg-[#121624] border border-[#1e263d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0e121e] border-b border-[#1e263d] text-gray-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Attendee Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Table #</th>
                  <th className="px-5 py-3.5">Gate Status</th>
                  <th className="px-5 py-3.5">Pass Token</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182035]">
                {filtered.map((guest) => (
                  <tr key={guest.id} className="hover:bg-[#151a2c] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{guest.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {guest.email || 'No email'} • {guest.phone || 'No phone'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-[#182035] border border-[#253250] text-[#00f0ff] font-medium text-[11px]">
                        {guest.category}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-white">
                      {guest.table_number || 'Unassigned'}
                    </td>

                    <td className="px-5 py-4">
                      {guest.is_checked_in ? (
                        <div className="flex items-center gap-1.5 text-[#00ff88]">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <div className="font-semibold">Checked In</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {guest.checked_in_at ? formatDateTime(guest.checked_in_at) : 'Active'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>Awaiting Gate</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono text-gray-400 text-[11px]">
                      {guest.qr_code_token}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenQr(guest)}
                          className="p-1.5 rounded-lg bg-[#192237] border border-[#27375a] text-gray-300 hover:text-[#00f0ff] hover:border-[#00f0ff]/50 transition-colors"
                          title="View QR Entry Pass"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendEmail(guest)}
                          className="p-1.5 rounded-lg bg-[#192237] border border-[#27375a] text-gray-300 hover:text-[#dfb76c] hover:border-[#dfb76c]/50 transition-colors"
                          title="Send Resend Email Ticket"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* QR Code Pass Modal */}
        {selectedGuestQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121624] border border-[#27375a] rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center">
              <button
                type="button"
                onClick={() => setSelectedGuestQr(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-xs font-mono uppercase text-[#dfb76c] tracking-wider mb-1">
                Official Event Passport
              </div>
              <h3 className="text-xl font-black text-white">{selectedGuestQr.name}</h3>
              <p className="text-xs text-gray-400 mb-6">
                {selectedGuestQr.category} • Table {selectedGuestQr.table_number || 'N/A'}
              </p>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mb-4">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Attendee QR Code"
                    className="w-52 h-52 object-contain mx-auto"
                  />
                )}
              </div>

              <div className="font-mono text-xs text-gray-400 mb-6 bg-[#0c0e17] py-2 px-3 rounded-lg border border-[#1b2234]">
                {selectedGuestQr.qr_code_token}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSendEmail(selectedGuestQr)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Ticket by Email</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Guest Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121624] border border-[#27375a] rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-white mb-1">Add Event Attendee</h3>
              <p className="text-xs text-gray-400 mb-6">Create a verified guest pass token for gate entry</p>

              <form onSubmit={handleAddGuest} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Jessica Tan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. jessica@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Category</label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="VIP Delegate"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Table Number</label>
                    <input
                      type="text"
                      value={newTable}
                      onChange={(e) => setNewTable(e.target.value)}
                      placeholder="Table 05"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#182035] text-xs font-semibold text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110"
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
