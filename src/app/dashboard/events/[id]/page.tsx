'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StageLedEditor } from '@/components/dashboard/StageLedEditor';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_GUESTS,
  MOCK_PHOTO_WALL_UPLOADS,
  MOCK_RAFFLES,
  DEFAULT_STAGE_CONFIG,
} from '@/lib/mockData';
import { Guest, PhotoWallUpload } from '@/lib/types';
import { formatDate, formatIDR } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Radio,
  Gamepad2,
  Gift,
  Camera,
  BarChart3,
  Play,
  Settings,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Sliders,
  Send,
  Plus,
  Trash2,
  Download,
  Share2,
  Lock,
  Mail,
  MessageSquare,
  Code2,
  Tv,
  QrCode,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Heart,
  Briefcase,
} from 'lucide-react';

interface EventHubProps {
  params: Promise<{ id: string }>;
}

function EventDashboardContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromQuery = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(tabFromQuery);
  const isJustCreated = searchParams.get('created') === 'true';
  const queryTitle = searchParams.get('title');

  // Keep activeTab in sync with query param changes
  React.useEffect(() => {
    const currentParam = searchParams.get('tab');
    if (currentParam && currentParam !== activeTab) {
      setActiveTab(currentParam);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/events/${eventId}?tab=${tabId}`, { scroll: false });
  };

  // Choose mock event or custom title
  const baseEvent = eventId === 'evt-aria-daniel-2026' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  const isWedding = baseEvent.event_type === 'wedding';
  const event = {
    ...baseEvent,
    name: queryTitle || baseEvent.name,
  };

  // State for sub-tabs inside Overview
  const [overviewSubTab, setOverviewSubTab] = useState<'info' | 'landing' | 'invitation'>('info');

  // Copied indicator
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);

  // Guests & Registrations state
  const [guestsList, setGuestsList] = useState<Guest[]>(MOCK_GUESTS);
  const [searchGuest, setSearchGuest] = useState('');
  const [registrations, setRegistrations] = useState([
    { id: 'reg-1', name: 'Alina Zhang', email: 'alina.zhang@sequoia.sg', phone: '+6591238841', status: 'pending', tickets: 1, submittedAt: '10 mins ago', answers: { company: 'Sequoia APAC', dietary: 'Vegetarian' } },
    { id: 'reg-2', name: 'Reza Pratama', email: 'reza@techinnovate.id', phone: '+62811987654', status: 'pending', tickets: 2, submittedAt: '25 mins ago', answers: { company: 'TechInnovate ID', dietary: 'Halal' } },
    { id: 'reg-3', name: 'Dr. Michael Chen', email: 'm.chen@nus.edu.sg', phone: '+6588219002', status: 'approved', tickets: 1, submittedAt: '1 hour ago', answers: { company: 'NUS FinTech Lab', dietary: 'None' } },
  ]);

  // Broadcast state
  const [broadcastChannel, setBroadcastChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [broadcastTemplate, setBroadcastTemplate] = useState<'invite' | 'confirm' | 'reminder' | 'thankyou'>('invite');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Photos & Moderation state
  const [photosList, setPhotosList] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const [captionsOn, setCaptionsOn] = useState(true);

  // Games Question Bank State
  const [quizQuestions, setQuizQuestions] = useState([
    { id: 'q-1', text: 'In what year was All41 founded?', options: ['2023', '2024', '2025', '2026'], answer: 1, points: 1000 },
    { id: 'q-2', text: 'Which regional payment rail powers our QR check-in tokenization?', options: ['QRIS Realtime', 'Swift GPI', 'FedNow', 'SEPA'], answer: 0, points: 1200 },
    { id: 'q-3', text: 'What is the maximum allowed WebP image size for stage photowall?', options: ['500KB', '2MB', '10MB', '50MB'], answer: 1, points: 1000 },
  ]);

  // Door Prize State
  const [raffleStyle, setRaffleStyle] = useState<'wheel' | 'slot' | 'claw'>('slot');
  const [prizeList, setPrizeList] = useState([
    { id: 'prz-1', name: 'Apple MacBook Pro 16" M4 Max', quantity: 1, sponsor: 'Fairmont / TechVenture' },
    { id: 'prz-2', name: 'iPhone 16 Pro Max 512GB (Titanium)', quantity: 2, sponsor: 'All41 Innovation' },
    { id: 'prz-3', name: 'Fairmont Presidential Suite Staycation', quantity: 3, sponsor: 'Fairmont Jakarta' },
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'live-link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmbed(id);
      setTimeout(() => setCopiedEmbed(null), 2000);
    }
  };

  const handleApproveRegistration = (regId: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'approved' } : r))
    );
  };

  const handleDeclineRegistration = (regId: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'rejected' } : r))
    );
  };

  const handleSendBroadcast = () => {
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col font-sans select-none bg-premium-black text-zinc-100 min-h-screen">
      {/* Top Header */}
      <Header
        title={event.name}
        subtitle={`${isWedding ? 'Luxury Wedding' : 'Corporate Summit'} • Live Subdomain: ${event.slug}.all41.app`}
        actionText="← All Workspace Events"
        actionHref="/dashboard"
      />

      <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Creation Success Banner */}
        {isJustCreated && (
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border-2 border-premium-gold shadow-gold flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-premium-gold/20 text-premium-gold flex items-center justify-center border border-premium-gold/40 shadow-gold flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white">Event Launched Successfully!</h3>
                <p className="text-xs text-zinc-300">
                  Welcome to your dedicated Event Command Suite. Access Overview, Guests, Broadcast, Games, Door Prize, and LIVE Launchers below.
                </p>
              </div>
            </div>
            <Link
              href={`/events/${event.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click whitespace-nowrap"
            >
              <span>Open Guest PWA</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* TOP TAB SWITCHER (The 10 User-Specified Menus) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-premium-borderDark/60 hide-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'guests', label: 'Guests', icon: Users },
            { id: 'registrations', label: 'Registrations', icon: ClipboardCheck, badge: '2 Pending' },
            { id: 'broadcast', label: 'Broadcast', icon: Radio },
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'doorprize', label: 'Door Prize', icon: Gift },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'insights', label: 'Insights', icon: BarChart3 },
            { id: 'live', label: 'LIVE', icon: Play, isLive: true },
            { id: 'setting', label: 'Setting', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all scale-on-click whitespace-nowrap ${
                  isActive
                    ? 'bg-premium-gold text-black shadow-gold font-display'
                    : 'bg-premium-surfaceDark/60 border border-premium-borderDark text-zinc-400 hover:text-white hover:bg-premium-charcoal'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : tab.isLive ? 'text-premium-neon' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
                {tab.isLive && (
                  <span className="w-2 h-2 rounded-full bg-premium-success animate-ping" />
                )}
                {tab.badge && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-premium-danger/20 text-premium-danger font-mono font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            MENU 1: OVERVIEW (Event Info, Landing Page Builder, Invitation Form Builder)
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Sub-Tabs Selector */}
            <div className="flex items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark w-max">
              <button
                type="button"
                onClick={() => setOverviewSubTab('info')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'info'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Event Information
              </button>
              <button
                type="button"
                onClick={() => setOverviewSubTab('landing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'landing'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Landing Page Builder
              </button>
              <button
                type="button"
                onClick={() => setOverviewSubTab('invitation')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'invitation'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Invitation Form Builder
              </button>
            </div>

            {/* Sub-tab 1: Event Information */}
            {overviewSubTab === 'info' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
                    <h3 className="text-xl font-display font-bold text-white">Event Parameters</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Event Name</label>
                        <input
                          type="text"
                          defaultValue={event.name}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Subdomain Slug</label>
                        <input
                          type="text"
                          defaultValue={event.slug}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-premium-neon p-3 rounded-xl font-mono outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Venue Location</label>
                        <input
                          type="text"
                          defaultValue={event.location_name || ''}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Target Capacity</label>
                        <input
                          type="text"
                          defaultValue={`${event.guest_limit} Pax`}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-zinc-400 font-bold block mb-1 text-xs">Description & Schedule Notes</label>
                      <textarea
                        defaultValue={event.description || ''}
                        rows={3}
                        className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => alert('Event information updated!')}
                        className="px-6 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                      >
                        Save Information
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                    <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">Public URL</span>
                    <div className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-between text-xs font-mono">
                      <span className="text-premium-neon truncate">{event.slug}.all41.app</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`https://${event.slug}.all41.app`, 'live-link')}
                        className="text-zinc-400 hover:text-white"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <Link
                      href={`/events/${event.slug}`}
                      target="_blank"
                      className="w-full py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white flex items-center justify-center gap-2 hover:border-premium-gold scale-on-click"
                    >
                      <span>Preview Live Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Landing Page Builder */}
            {overviewSubTab === 'landing' && (
              <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-xl">
                <div>
                  <h3 className="text-xl font-display font-bold text-white">Landing Page Visual Builder</h3>
                  <p className="text-xs text-zinc-400 mt-1">Configure layout blocks, hero banners, and attendee modules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3">
                    <span className="text-xs font-bold text-white block">Hero Cover Poster</span>
                    <div className="aspect-video rounded-xl overflow-hidden relative border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono text-premium-gold">
                        Active Banner
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      <div>
                        <span className="font-bold text-white block">Event Countdown Clock</span>
                        <span className="text-[10px] text-zinc-400">Show real-time countdown to start</span>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle-checkbox w-5 h-5 accent-premium-gold cursor-pointer" />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      <div>
                        <span className="font-bold text-white block">{isWedding ? 'Love Story Timeline' : 'Keynote Speakers Grid'}</span>
                        <span className="text-[10px] text-zinc-400">Display prominent highlight block</span>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle-checkbox w-5 h-5 accent-premium-gold cursor-pointer" />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      <div>
                        <span className="font-bold text-white block">{isWedding ? 'Digital Angpao Registry' : 'Tiered Sponsors Showcase'}</span>
                        <span className="text-[10px] text-zinc-400">Enable cashless blessings or sponsor logos</span>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle-checkbox w-5 h-5 accent-premium-gold cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 3: Invitation Form Builder */}
            {overviewSubTab === 'invitation' && (
              <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-xl">
                <div>
                  <h3 className="text-xl font-display font-bold text-white">RSVP Invitation Form Fields</h3>
                  <p className="text-xs text-zinc-400 mt-1">Select and customize questionnaire fields required from guests.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Full Attendee Name', required: true, fixed: true },
                    { label: 'WhatsApp Phone Number', required: true, fixed: true },
                    { label: 'Email Address (for QR Pass dispatch)', required: true, fixed: true },
                    { label: isWedding ? 'Dietary Flags (Halal, Vegetarian, Gluten-Free)' : 'Company / Organization Title', required: true, fixed: false },
                    { label: isWedding ? 'Plus-One Companion Details' : 'Designation / Job Role', required: false, fixed: false },
                    { label: 'Seating Table Preference / Notes', required: false, fixed: false },
                  ].map((field, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-premium-gold" />
                        <div>
                          <span className="font-bold text-white">{field.label}</span>
                          {field.required && <span className="ml-2 text-premium-danger font-mono text-[10px]">*Required</span>}
                        </div>
                      </div>
                      <span className="text-zinc-500 font-mono text-[11px]">{field.fixed ? 'System Mandatory' : 'Custom Field'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MENU 2: GUESTS (Roster, Seating Table, VIP Badges, CSV)
           ========================================================================= */}
        {activeTab === 'guests' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Guest Roster & Seating Table</h3>
                <p className="text-xs text-zinc-400">Total {guestsList.length} VIP delegates enrolled • Gate Check-in Active</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => alert('CSV Roster Exported!')}
                  className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold scale-on-click flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert('Add Guest dialog opened')}
                  className="px-5 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Attendee</span>
                </button>
              </div>
            </div>

            {/* Guests Table */}
            <div className="rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-premium-borderDark bg-premium-surfaceDark text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-6">Attendee</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Table / Seat</th>
                    <th className="p-4">QR Token</th>
                    <th className="p-4 pr-6 text-right">Gate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-premium-borderDark/60">
                  {guestsList.map((g) => (
                    <tr key={g.id} className="hover:bg-premium-surfaceDark/40 transition-colors">
                      <td className="p-4 pl-6 font-bold text-white">{g.name}</td>
                      <td className="p-4 text-zinc-400 font-mono text-[11px]">{g.phone || g.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-premium-gold/15 text-premium-gold border border-premium-gold/30 font-bold uppercase text-[10px]">
                          {g.category}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{g.table_number || 'General Seating'}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[10px]">{g.qr_code_token}</td>
                      <td className="p-4 pr-6 text-right">
                        {g.is_checked_in ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-premium-success/15 text-premium-success font-bold text-[10px] border border-premium-success/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Checked-in</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                            Awaiting
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 3: REGISTRATIONS (Public Inbound RSVP Queue & Approval)
           ========================================================================= */}
        {activeTab === 'registrations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Public RSVP Registrations</h3>
              <p className="text-xs text-zinc-400">Review inbound registrations, approve seats, and trigger automatic QR tickets.</p>
            </div>

            <div className="space-y-4">
              {registrations.map((reg) => (
                <div key={reg.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-display font-bold text-white">{reg.name}</h4>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        reg.status === 'approved'
                          ? 'bg-premium-success/15 text-premium-success border border-premium-success/30'
                          : reg.status === 'rejected'
                          ? 'bg-premium-danger/15 text-premium-danger border border-premium-danger/30'
                          : 'bg-premium-gold/15 text-premium-gold border border-premium-gold/30'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {reg.email} • {reg.phone} • Submitted {reg.submittedAt}
                    </div>
                    <div className="text-xs text-zinc-300 pt-1">
                      Organization: <strong>{reg.answers.company}</strong> • Dietary: <strong>{reg.answers.dietary}</strong>
                    </div>
                  </div>

                  {reg.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeclineRegistration(reg.id)}
                        className="px-4 py-2 rounded-xl bg-transparent border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold scale-on-click"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRegistration(reg.id)}
                        className="px-5 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold shadow-gold scale-on-click"
                      >
                        Approve & Issue Pass
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 4: BROADCAST (Email, WhatsApp Fonnte BYON, Embed Tools)
           ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
            {/* Left Column: Multi-Channel Dispatch */}
            <div className="lg:col-span-8 space-y-6">
              <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-xl">
                <div>
                  <h3 className="text-xl font-display font-bold text-white">Broadcast Campaign Dispatcher</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Automated messaging via WhatsApp (Fonnte BYON) & Email (Resend).</p>
                </div>

                {/* Channel Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBroadcastChannel('whatsapp')}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all scale-on-click ${
                      broadcastChannel === 'whatsapp'
                        ? 'border-premium-success bg-premium-surfaceDark shadow-[0_0_15px_rgba(0,230,118,0.2)]'
                        : 'border-premium-borderDark bg-premium-black/60'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-premium-success" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">WhatsApp (Fonnte BYON)</div>
                      <div className="text-[10px] text-zinc-400">Anti-ban safe queue pacing (5-15s)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastChannel('email')}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all scale-on-click ${
                      broadcastChannel === 'email'
                        ? 'border-premium-gold bg-premium-surfaceDark shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60'
                    }`}
                  >
                    <Mail className="w-5 h-5 text-premium-gold" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Email Blast (Resend)</div>
                      <div className="text-[10px] text-zinc-400">DKIM / SPF verified delivery</div>
                    </div>
                  </button>
                </div>

                {/* Template Triggers */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px] block">Trigger Template</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'invite', label: 'VIP Invitation' },
                      { id: 'confirm', label: 'RSVP Pass' },
                      { id: 'reminder', label: '24h Reminder' },
                      { id: 'thankyou', label: 'Thank You' },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setBroadcastTemplate(tpl.id as any)}
                        className={`p-3 rounded-xl border text-center font-bold transition-all ${
                          broadcastTemplate === tpl.id
                            ? 'border-premium-gold bg-premium-gold text-black shadow-gold'
                            : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-300'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Preview Box */}
                <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-zinc-300 leading-relaxed">
                  <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Message Template Preview:</div>
                  Halo <span className="text-premium-gold font-bold">&#123;&#123;name&#125;&#125;</span>, Anda diundang ke <strong>{event.name}</strong>.<br />
                  Jadwal: {formatDate(event.start_date)} di {event.location_name}.<br />
                  Buka Pass Digital QR Anda di: <span className="text-premium-neon">https://{event.slug}.all41.app</span>
                </div>

                {broadcastSuccess && (
                  <div className="p-3 rounded-xl bg-premium-success/20 border border-premium-success/40 text-premium-success text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Broadcast queued! Anti-ban safety pacing active (5-15s per contact).</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  className="w-full py-3.5 rounded-2xl bg-premium-gold text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast to {guestsList.length} Guests</span>
                </button>
              </div>
            </div>

            {/* Right Column: Embed Tools (Link, Button, Landing Page) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
                <div>
                  <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-premium-neon" />
                    <span>Embed Tools</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Embed registration widgets into client websites.</p>
                </div>

                {/* Button Embed */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 block">1. Button Widget Embed</span>
                  <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark font-mono text-[10px] text-zinc-400 break-all relative">
                    &lt;a href=&quot;https://{event.slug}.all41.app&quot; class=&quot;all41-rsvp-btn&quot;&gt;RSVP VIP Pass&lt;/a&gt;
                    <button
                      type="button"
                      onClick={() => handleCopy(`<a href="https://${event.slug}.all41.app" class="all41-rsvp-btn">RSVP VIP Pass</a>`, 'embed-btn')}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                    >
                      {copiedEmbed === 'embed-btn' ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Iframe Embed */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 block">2. Iframe Landing Embed</span>
                  <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark font-mono text-[10px] text-zinc-400 break-all relative">
                    &lt;iframe src=&quot;https://{event.slug}.all41.app&quot; width=&quot;100%&quot; height=&quot;800&quot; frameborder=&quot;0&quot;&gt;&lt;/iframe&gt;
                    <button
                      type="button"
                      onClick={() => handleCopy(`<iframe src="https://${event.slug}.all41.app" width="100%" height="800" frameborder="0"></iframe>`, 'embed-iframe')}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                    >
                      {copiedEmbed === 'embed-iframe' ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 5: GAMES (Setting Up Live Quiz Arena, Trivia, Buzzer)
           ========================================================================= */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Live Trivia Arena & Quiz Blitz</h3>
                <p className="text-xs text-zinc-400">Configure Kahoot-style synchronized 4-quadrant mobile buzzer questions.</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/events/${event.slug}/games`}
                  target="_blank"
                  className="px-5 py-2.5 rounded-xl bg-premium-neon text-black font-bold text-xs shadow-neon scale-on-click flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Arena Game</span>
                </Link>
              </div>
            </div>

            {/* Questions Bank */}
            <div className="space-y-4">
              {quizQuestions.map((q, idx) => (
                <div key={q.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-premium-neon">Round {idx + 1} • {q.points} Pts</span>
                    <span className="text-[10px] font-mono uppercase text-zinc-500">15s Timer</span>
                  </div>

                  <h4 className="text-base font-display font-bold text-white">{q.text}</h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border font-bold flex items-center justify-between ${
                          oIdx === q.answer
                            ? 'border-premium-success bg-premium-success/15 text-premium-success'
                            : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {oIdx === q.answer && <Check className="w-3.5 h-3.5 text-premium-success" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 6: DOOR PRIZE (Raffle 3D Machine, Prize Pool, Audited Ledger)
           ========================================================================= */}
        {activeTab === 'doorprize' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">3D Door Prize & Raffle Machine</h3>
                <p className="text-xs text-zinc-400">Manage prize tiers, 3D visualizer modes, and audited blockchain winner ledger.</p>
              </div>

              <Link
                href={`/events/${event.slug}/raffle`}
                target="_blank"
                className="px-5 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Launch 3D Raffle Stage</span>
              </Link>
            </div>

            {/* Visualizer Style Switcher */}
            <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">3D Stage Draw Animation</span>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'slot', label: '🎰 Slot Machine 777' },
                  { id: 'wheel', label: '🎡 Spinning Wheel' },
                  { id: 'claw', label: '🕹️ Arcade Claw Machine' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRaffleStyle(s.id as any)}
                    className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all scale-on-click ${
                      raffleStyle === s.id
                        ? 'border-premium-gold bg-premium-surfaceDark text-premium-gold shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60 text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prize Catalog */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block px-1">Grand Prize Catalog</span>
              {prizeList.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex items-center justify-between text-xs shadow-md">
                  <div>
                    <h4 className="font-bold text-white text-sm">{p.name}</h4>
                    <span className="text-zinc-400 text-[11px]">Sponsored by: {p.sponsor}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-premium-gold/15 text-premium-gold font-bold font-mono">
                    {p.quantity} Units
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 7: PHOTOS (Wall Photos/Videos, Moderation, Captions Toggle)
           ========================================================================= */}
        {activeTab === 'photos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Photo & Video Moderation Wall</h3>
                <p className="text-xs text-zinc-400">Total {photosList.length} media uploads • Captions policy & high-res downloads</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Captions Toggle as requested */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-xs">
                  <span className="text-zinc-400">Captions Mode:</span>
                  <button
                    type="button"
                    onClick={() => setCaptionsOn(!captionsOn)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      captionsOn ? 'bg-premium-gold text-black shadow-gold' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {captionsOn ? 'ON (≤300c)' : 'OFF'}
                  </button>
                </div>

                <Link
                  href={`/events/${event.slug}/photowall/live`}
                  target="_blank"
                  className="px-5 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                >
                  Live Stage Wall
                </Link>
              </div>
            </div>

            {/* Pinterest Masonry Component */}
            <PinterestMasonryPhotoWall
              photos={photosList}
              showCaptions={captionsOn}
              canLike={true}
            />
          </div>
        )}

        {/* =========================================================================
            MENU 8: INSIGHTS (Analytics, Velocity, Turnout)
           ========================================================================= */}
        {activeTab === 'insights' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Event Intelligence & Real-time Insights</h3>
              <p className="text-xs text-zinc-400">Audited telemetry on check-in velocity, crowd engagement, and photo wall activity.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Check-in Turnout</span>
                <div className="text-3xl font-display font-bold text-premium-success">64.3%</div>
                <div className="text-[11px] text-zinc-500">418 of 650 attendees admitted</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Scanner Velocity</span>
                <div className="text-3xl font-display font-bold text-premium-neon">0.6s</div>
                <div className="text-[11px] text-zinc-500">Average QR gate scan admission</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Photo Wall Uploads</span>
                <div className="text-3xl font-display font-bold text-premium-gold">238 Media</div>
                <div className="text-[11px] text-zinc-500">92% WebP, 8% HD 720p Video</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Game Participation</span>
                <div className="text-3xl font-display font-bold text-white">88.4%</div>
                <div className="text-[11px] text-zinc-500">Active live mobile buzzers</div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 9: LIVE (Launchers for All Active Event URLs - Open New Tab)
           ========================================================================= */}
        {activeTab === 'live' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-premium-success/15 text-premium-success border border-premium-success/30 text-xs font-bold font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-premium-success animate-ping" />
                <span>All Operational Rails Active</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">LIVE Launchers Command Board</h3>
              <p className="text-xs text-zinc-400">Click any launcher to immediately open the live screen or interface in a new window/tab.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Guest Portal Mobile PWA',
                  url: `/events/${event.slug}`,
                  desc: 'Mobile-optimized attendee portal (Rundown, Table Pass, Photo Wall, Digital Angpao/Speakers).',
                  badge: 'PWA Web App',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Ballroom Stage LED Screen (7 Modules)',
                  url: `/events/${event.slug}/stage`,
                  desc: 'Fullscreen stage display with Welcome, Rundown, Photo Wall, Quiz, and Sponsor rotations.',
                  badge: 'Big Screen LED',
                  color: 'text-premium-gold',
                },
                {
                  title: 'Live Photo Wall Stage',
                  url: `/events/${event.slug}/photowall/live`,
                  desc: 'Live animated Pinterest-style wall showcasing guest uploads and video clips.',
                  badge: 'LED Photowall',
                  color: 'text-premium-gold',
                },
                {
                  title: '3D Door Prize Raffle Machine',
                  url: `/events/${event.slug}/raffle`,
                  desc: 'Interactive 3D slot machine, spinning wheel, and arcade claw raffle draw.',
                  badge: 'Raffle Stage',
                  color: 'text-premium-gold',
                },
                {
                  title: 'Arena Trivia Game Stage',
                  url: `/events/${event.slug}/games`,
                  desc: 'Synchronized Kahoot-style quiz question arena with real-time leaderboard podium.',
                  badge: 'Game Arena',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Gate Camera QR Scanner Desk',
                  url: `/dashboard/events/${eventId}/checkin`,
                  desc: 'High-speed attendee QR ticket scanner with 4 gold corner brackets and laser beam.',
                  badge: 'Gate Operations',
                  color: 'text-premium-success',
                },
                {
                  title: 'Live Operator Control Desk',
                  url: `/dashboard/events/${eventId}/operator`,
                  desc: 'Centralized crew cockpit for stage control, photo moderation, and trivia master.',
                  badge: 'Crew Cockpit',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Registration Desk PWA',
                  url: `/events/${event.slug}/register`,
                  desc: 'Tablet kiosk for walk-in guest registration and RSVP approval queue with instant QR pass issuance.',
                  badge: 'Register Desk',
                  color: 'text-premium-gold',
                },
              ].map((launcher, idx) => (
                <div
                  key={idx}
                  onClick={() => window.open(launcher.url, '_blank')}
                  className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark hover:border-premium-gold transition-all flex flex-col justify-between shadow-xl group cursor-pointer scale-on-click"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${launcher.color}`}>
                        {launcher.badge}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
                    </div>
                    <h4 className="text-xl font-display font-bold text-white group-hover:text-premium-gold transition-colors flex items-center justify-between">
                      <span>{launcher.title}</span>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-premium-gold transition-colors" />
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {launcher.desc}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-premium-borderDark/60 mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
                      {launcher.url}
                    </span>
                    <a
                      href={launcher.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click transition-all"
                    >
                      <span>Open New Window</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 10: SETTING (Domain BYOD, Email Resend, WhatsApp Fonnte, Terms, Privacy)
           ========================================================================= */}
        {activeTab === 'setting' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Event Integrations & Policies</h3>
              <p className="text-xs text-zinc-400">Custom domain BYOD, WhatsApp Fonnte gateway, Resend email, and legal disclosures.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Domain BYOD */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-neon font-bold">1. Subdomain & Custom Domain BYOD</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Subdomain Rail</label>
                    <input
                      type="text"
                      defaultValue={`${event.slug}.all41.app`}
                      disabled
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-premium-neon p-3 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Bring Your Own Domain (BYOD)</label>
                    <input
                      type="text"
                      defaultValue={event.custom_domain || 'wedding.ariadaniel.com'}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Fonnte */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-success font-bold">2. WhatsApp (Fonnte BYON)</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Fonnte API Token</label>
                    <input
                      type="password"
                      defaultValue="fonnte_sec_live_99214488a01b"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[11px] text-zinc-400">
                    Pacing Safety: <strong className="text-premium-success">5 - 15 Seconds delay per contact (Anti-Ban)</strong>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">3. Terms & Conditions</span>
                <textarea
                  defaultValue="Attendee agrees to single-use QR admission token. Photo and video uploads are licensed for ballroom stage display."
                  rows={3}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                />
              </div>

              {/* Privacy Policy */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">4. Privacy Policy</span>
                <textarea
                  defaultValue="Data collected is solely utilized for attendee verification, ticket pass dispatch, and table seating coordination."
                  rows={3}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function EventDashboardPage({ params }: EventHubProps) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading Event Suite...</div>}>
      <EventDashboardContent eventId={unwrappedParams.id} />
    </Suspense>
  );
}