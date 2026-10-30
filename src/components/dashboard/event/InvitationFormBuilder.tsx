'use client';

import React, { useState } from 'react';
import {
  AlignLeft, CheckSquare, ChevronDown, Hash, Mail, Phone, Plus, Trash2,
  GripVertical, Check, QrCode, Calendar, MapPin, Clock, Users, ExternalLink,
  Copy, Eye, ToggleLeft, ToggleRight, Settings2, X, Share2, List, Smartphone,
  Link, Download, Shield,
} from 'lucide-react';

type QuestionType = 'text' | 'long_text' | 'yes_no' | 'multiple' | 'number' | 'email' | 'phone';

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  system?: boolean;
}

const TYPE_ICONS: Record<QuestionType, React.ComponentType<{ className?: string }>> = {
  text: AlignLeft, long_text: AlignLeft, yes_no: CheckSquare,
  multiple: ChevronDown, number: Hash, email: Mail, phone: Phone,
};

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short answer', long_text: 'Long text', yes_no: 'Yes / No',
  multiple: 'Multiple choice', number: 'Number', email: 'Email', phone: 'Phone',
};

const SUGGESTED_WEDDING: Question[] = [
  { id: 'sg-1', type: 'text', label: 'What is your full name?', required: true },
  { id: 'sg-2', type: 'yes_no', label: 'Will you be joining us?', required: true },
  { id: 'sg-3', type: 'number', label: 'How many will be attending, including you?', required: true },
  { id: 'sg-4', type: 'email', label: 'Your email address', required: false },
  { id: 'sg-5', type: 'phone', label: 'Your mobile number', required: false },
  { id: 'sg-6', type: 'multiple', label: 'Choose your main course', required: false, options: ['Beef Tenderloin', 'Sea Bass', 'Mushroom Risotto'] },
  { id: 'sg-7', type: 'long_text', label: 'Any allergies or dietary needs?', required: false },
  { id: 'sg-8', type: 'text', label: 'Names of your +1 or family members', required: false },
  { id: 'sg-9', type: 'multiple', label: 'Whose side are you on?', required: false, options: ["Bride's side", "Groom's side", 'Both'] },
  { id: 'sg-10', type: 'yes_no', label: 'Do you need a shuttle from the hotel?', required: false },
  { id: 'sg-11', type: 'text', label: 'A song that gets you dancing', required: false },
  { id: 'sg-12', type: 'long_text', label: 'A message for the couple', required: false },
];

const SUGGESTED_CORPORATE: Question[] = [
  { id: 'sg-1', type: 'text', label: 'Full name', required: true },
  { id: 'sg-2', type: 'text', label: 'Company / Organization', required: true },
  { id: 'sg-3', type: 'text', label: 'Designation / Job Title', required: true },
  { id: 'sg-4', type: 'email', label: 'Work email address', required: true },
  { id: 'sg-5', type: 'phone', label: 'Mobile number', required: false },
  { id: 'sg-6', type: 'multiple', label: 'Industry vertical', required: false, options: ['Fintech', 'SaaS / Cloud', 'E-commerce', 'Healthcare Tech', 'Other'] },
  { id: 'sg-7', type: 'number', label: 'How many delegates from your company?', required: false },
  { id: 'sg-8', type: 'multiple', label: 'Dietary preference', required: false, options: ['Halal', 'Vegetarian', 'Vegan', 'None'] },
  { id: 'sg-9', type: 'long_text', label: 'Topics you want to discuss', required: false },
];

interface InvitationFormBuilderProps {
  isWedding: boolean;
  eventName: string;
  primaryColor: string;
  slug: string;
}

export function InvitationFormBuilder({ isWedding, eventName, primaryColor, slug }: InvitationFormBuilderProps) {
  const [formTab, setFormTab] = useState<'cover' | 'questions' | 'closing' | 'share' | 'responses' | 'pwa' | 'settings'>('cover');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [acceptingResponses, setAcceptingResponses] = useState(true);
  const [replyBy, setReplyBy] = useState('');
  const [guestLimit, setGuestLimit] = useState('');
  const [maxPerReply, setMaxPerReply] = useState('6');
  const [askReview, setAskReview] = useState(true);
  const [sendLabel, setSendLabel] = useState(isWedding ? 'Send RSVP' : 'Register Now');
  const [formName, setFormName] = useState(isWedding ? `RSVP · ${eventName}` : `Register · ${eventName}`);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewName] = useState('Rafael Cruz');

  // Cover tab: selected color theme
  const [selectedTheme, setSelectedTheme] = useState('Golden Field');

  // Closing tab: active closing view state
  const [closingView, setClosingView] = useState<'Confirmed' | 'Declined' | 'Form closed'>('Confirmed');

  // Closing tab: toggle states for "What guests can do"
  const [guestToggles, setGuestToggles] = useState({
    ticket: true,
    calendar: true,
    directions: true,
    contact: false,
  });

  // Add-question picker state
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<QuestionType>('text');

  const addCustomQuestion = () => {
    if (!newLabel.trim()) return;
    setQuestions((prev) => [...prev, {
      id: `q-${Date.now()}`,
      type: newType,
      label: newLabel.trim(),
      required: false,
      options: newType === 'multiple' ? ['Option 1', 'Option 2'] : undefined,
    }]);
    setNewLabel('');
    setNewType('text');
    setShowAddQuestion(false);
  };

  const suggested = isWedding ? SUGGESTED_WEDDING : SUGGESTED_CORPORATE;
  const addSuggested = (q: Question) => {
    if (questions.find((e) => e.id === q.id)) return;
    setQuestions((prev) => [...prev, { ...q, id: `q-${Date.now()}` }]);
  };
  const addEssentials = () => {
    const essentials = suggested.slice(0, 5);
    setQuestions((prev) => {
      const ids = new Set(prev.map((q) => q.label));
      return [...prev, ...essentials.filter((q) => !ids.has(q.label)).map((q) => ({ ...q, id: `q-${Date.now()}-${q.id}` }))];
    });
  };
  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id));
  const toggleRequired = (id: string) => setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, required: !q.required } : q));

  const TABS = [
    { id: 'cover' as const, label: 'Cover', icon: Eye },
    { id: 'questions' as const, label: `Questions (${questions.length})`, icon: List },
    { id: 'closing' as const, label: 'Closing', icon: QrCode },
    { id: 'share' as const, label: 'Share', icon: Share2 },
    { id: 'responses' as const, label: 'Responses', icon: CheckSquare },
    { id: 'pwa' as const, label: 'PWA', icon: Smartphone },
    { id: 'settings' as const, label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Form builder */}
      <div className="xl:col-span-7 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${
                formTab === t.id
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* COVER TAB */}
        {formTab === 'cover' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <h3 className="font-display font-bold text-white text-base">Cover Page</h3>

            {/* Theme picker */}
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Color Theme</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Golden Field', c1: '#C5A059', c2: '#09090B', c3: '#F5F0E8' },
                  { name: 'Sage Garden', c1: '#10B981', c2: '#0A100D', c3: '#D1FAE5' },
                  { name: 'Mint Hero', c1: '#00F0FF', c2: '#09090B', c3: '#0E7490' },
                  { name: 'Neon Launch', c1: '#00F0FF', c2: '#09090B', c3: '#FF3366' },
                  { name: 'Gala Gold', c1: '#C5A059', c2: '#0F0A00', c3: '#BE123C' },
                  { name: 'Parol Party', c1: '#FF3366', c2: '#1A0A00', c3: '#F59E0B' },
                  { name: 'Summit', c1: '#3B82F6', c2: '#0A0A1A', c3: '#8B5CF6' },
                  { name: 'Bali Blush', c1: '#F9A8D4', c2: '#1A0010', c3: '#FB923C' },
                ].map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    onClick={() => setSelectedTheme(th.name)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border text-[10px] font-bold scale-on-click transition-all ${
                      selectedTheme === th.name
                        ? 'border-premium-gold text-white bg-premium-gold/10'
                        : 'border-premium-borderDark text-zinc-300 hover:border-premium-gold/50'
                    }`}
                  >
                    <span className="flex gap-0.5 items-center">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: th.c1 }} />
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: th.c2 }} />
                      <span className="w-2.5 h-2.5 rounded-full opacity-70" style={{ backgroundColor: th.c3 }} title="Accent (optional)" />
                    </span>
                    {th.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">3 swatches: primary · background · accent (optional)</p>
            </div>

            {/* Event details section */}
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Event Details</label>
              <div className="space-y-3">
                {[
                  { label: 'Event name', val: eventName },
                  { label: 'Subtitle', val: isWedding ? 'are getting married' : 'Executive Summit' },
                  { label: 'Venue', val: isWedding ? 'Casa Verde Gardens' : 'Marina Bay Sands' },
                  { label: 'City', val: isWedding ? 'Tagaytay' : 'Singapore' },
                ].map((f) => (
                  <div key={f.label} className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-xs text-zinc-400">{f.label}</label>
                    <input
                      defaultValue={f.val}
                      className="col-span-2 bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs text-zinc-400">Date</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <input type="date" className="bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
                    <input type="time" className="bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Cover content */}
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Cover Content</label>
              <div className="space-y-3">
                {[
                  { label: 'Small heading above title', val: "You're invited" },
                  { label: 'Message', val: 'We would love to celebrate with you. Please let us know if you can make it. It takes about a minute.' },
                  { label: 'Start button', val: isWedding ? 'RSVP now' : 'Register Now' },
                  { label: 'Small note under button', val: 'Takes about 1 minute' },
                ].map((f, i) => (
                  <div key={f.label} className="grid grid-cols-3 gap-3 items-start">
                    <label className="text-xs text-zinc-400 pt-2">{f.label}</label>
                    {i === 1 ? (
                      <textarea
                        defaultValue={f.val}
                        rows={3}
                        className="col-span-2 bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                      />
                    ) : (
                      <input
                        defaultValue={f.val}
                        className="col-span-2 bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cover photo */}
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Cover Photo</label>
              <div className="h-28 rounded-2xl border-2 border-dashed border-premium-borderDark bg-premium-surfaceDark flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-premium-gold/50">
                <Plus className="w-6 h-6 text-zinc-600" />
                <span className="text-[10px] text-zinc-500">Upload photo • From template</span>
              </div>
            </div>
          </div>
        )}

        {/* QUESTIONS TAB */}
        {formTab === 'questions' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-base">Questions</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Guests answer one at a time. Build it like a form: add your own, or tap a suggestion.</p>
              </div>
            </div>

            {/* Question list */}
            {questions.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-premium-borderDark flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-premium-surfaceDark flex items-center justify-center">
                  <AlignLeft className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">No questions yet</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Start with the essentials, or add your own below.</div>
                </div>
                <button
                  type="button"
                  onClick={addEssentials}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 text-white text-xs font-bold hover:bg-zinc-700 scale-on-click flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add the essentials (name, attending, guests)
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const Icon = TYPE_ICONS[q.type];
                  return (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center gap-3">
                      <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 cursor-grab" />
                      <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{q.label}</div>
                        <div className="text-[10px] text-zinc-500">{TYPE_LABELS[q.type]}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRequired(q.id)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${q.required ? 'border-premium-danger/40 text-premium-danger bg-premium-danger/10' : 'border-zinc-700 text-zinc-500'}`}
                      >
                        {q.required ? 'Required' : 'Optional'}
                      </button>
                      <button type="button" onClick={() => removeQuestion(q.id)} className="text-zinc-600 hover:text-premium-danger">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddQuestion((v) => !v)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-500 text-xs font-bold hover:border-premium-gold/50 flex items-center justify-center gap-2 scale-on-click"
            >
              <Plus className="w-4 h-4" />
              Add a question
            </button>

            {showAddQuestion && (
              <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-gold/30 space-y-3">
                <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">New question</div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold scale-on-click ${
                          newType === t
                            ? 'bg-premium-gold text-black border-premium-gold'
                            : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/40'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
                <input
                  autoFocus
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomQuestion(); if (e.key === 'Escape') setShowAddQuestion(false); }}
                  placeholder="Question label…"
                  className="w-full bg-premium-charcoal border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addCustomQuestion}
                    disabled={!newLabel.trim()}
                    className="flex-1 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold disabled:opacity-40 scale-on-click hover:bg-premium-goldHover"
                  >
                    Add question
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold scale-on-click"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Suggested questions */}
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-3">
                {isWedding ? 'Suggested for your wedding' : 'Suggested for your event'}
              </div>

              <div className="space-y-4">
                {isWedding && (
                  <>
                    <div>
                      <div className="text-[10px] text-zinc-600 font-bold mb-2">Essentials</div>
                      <div className="space-y-1.5">
                        {suggested.slice(0, 5).map((q) => {
                          const Icon = TYPE_ICONS[q.type];
                          const added = questions.some((eq) => eq.label === q.label);
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => addSuggested(q)}
                              disabled={added}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-medium transition-all ${
                                added
                                  ? 'border-premium-success/30 text-premium-success bg-premium-success/10 cursor-default'
                                  : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/50 hover:text-white scale-on-click'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {q.label}
                              <span className="ml-auto font-bold">{added ? <Check className="w-3.5 h-3.5" /> : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 font-bold mb-2">Often useful</div>
                      <div className="space-y-1.5">
                        {suggested.slice(5).map((q) => {
                          const Icon = TYPE_ICONS[q.type];
                          const added = questions.some((eq) => eq.label === q.label);
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => addSuggested(q)}
                              disabled={added}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-medium transition-all ${
                                added
                                  ? 'border-premium-success/30 text-premium-success bg-premium-success/10 cursor-default'
                                  : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/50 hover:text-white scale-on-click'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {q.label}
                              <span className="ml-auto font-bold">{added ? <Check className="w-3.5 h-3.5" /> : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                {!isWedding && (
                  <div className="space-y-1.5">
                    {suggested.map((q) => {
                      const Icon = TYPE_ICONS[q.type];
                      const added = questions.some((eq) => eq.label === q.label);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => addSuggested(q)}
                          disabled={added}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-medium transition-all ${
                            added
                              ? 'border-premium-success/30 text-premium-success bg-premium-success/10 cursor-default'
                              : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/50 hover:text-white scale-on-click'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          {q.label}
                          <span className="ml-auto font-bold">{added ? <Check className="w-3.5 h-3.5" /> : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLOSING TAB */}
        {formTab === 'closing' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base">Closing Page</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">What guests see after they send the form.</p>
            </div>

            <div className="flex gap-2">
              {(['Confirmed', 'Declined', 'Form closed'] as const).map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setClosingView(lbl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border scale-on-click ${closingView === lbl ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {[
                { label: 'Heading', val: 'See you there, {name}!' },
                { label: 'Message', val: 'Your seat is saved for {party}. Please show this QR code at the entrance.' },
                { label: 'Small print under the QR code', val: 'Save this ticket or take a screenshot. We will scan it at the door.' },
              ].map((f, i) => (
                <div key={f.label}>
                  <label className="text-xs text-zinc-400 font-bold block mb-1.5">{f.label}</label>
                  {i === 1 || i === 2 ? (
                    <textarea
                      defaultValue={f.val}
                      rows={3}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                    />
                  ) : (
                    <input
                      defaultValue={f.val}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Insert variable</label>
                <div className="flex flex-wrap gap-1.5">
                  {['{name}', '{fullname}', '{party}', '{guests}', '{event}', '{date}', '{time}', '{venue}', '{code}'].map((v) => (
                    <button key={v} type="button" className="px-2 py-1 rounded-lg bg-premium-surfaceDark border border-premium-borderDark text-[10px] font-mono text-premium-neon hover:border-premium-neon/50 scale-on-click">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2">What guests can do</div>
                {([
                  { key: 'ticket' as const, label: 'Show the ticket with QR code', sub: 'The QR is what you scan at the door.' },
                  { key: 'calendar' as const, label: '"Add to calendar" button' },
                  { key: 'directions' as const, label: '"Directions" button' },
                  { key: 'contact' as const, label: 'Show your phone and email' },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs text-white font-medium">{item.label}</div>
                      {'sub' in item && <div className="text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuestToggles((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center scale-on-click ${guestToggles[item.key] ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1.5">Extra button label</label>
                  <input placeholder="View our registry" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1.5">Extra button link</label>
                  <input placeholder="https://" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SHARE TAB */}
        {formTab === 'share' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Share2 className="w-4 h-4 text-premium-gold" /> Share Your Form
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Distribute the RSVP link to guests via WhatsApp, email, or QR code.</p>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Public RSVP Link</label>
              <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
                <Link className="w-4 h-4 text-premium-neon shrink-0" />
                <span className="flex-1 font-mono text-xs text-premium-neon truncate">https://{slug}.all41.app/register</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://${slug}.all41.app/register`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-premium-gold text-black font-bold text-[10px] scale-on-click"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* QR code */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center shrink-0 p-2">
                <div className="w-full h-full bg-[repeating-linear-gradient(0deg,#000_0px,#000_4px,transparent_4px,transparent_8px),repeating-linear-gradient(90deg,#000_0px,#000_4px,transparent_4px,transparent_8px)] opacity-20 rounded" />
                <div className="absolute w-20 h-20 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-black" />
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="text-sm font-bold text-white">QR Code</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Print or display on invitation cards. Guests scan to open the RSVP form.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-4 py-2 rounded-xl bg-premium-gold text-black font-bold text-xs scale-on-click flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download PNG
                  </button>
                  <button type="button" className="px-4 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-xs scale-on-click">
                    Download SVG
                  </button>
                </div>
              </div>
            </div>

            {/* Share channels */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Share via</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'WhatsApp', color: 'bg-green-600 hover:bg-green-700' },
                  { label: 'Email', color: 'bg-blue-600 hover:bg-blue-700' },
                  { label: 'Telegram', color: 'bg-sky-500 hover:bg-sky-600' },
                ].map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className={`py-2.5 rounded-xl text-white font-bold text-xs scale-on-click transition-colors ${c.color}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESPONSES TAB */}
        {formTab === 'responses' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-premium-gold" /> Responses
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">View and export all submitted RSVP responses.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3.5 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-xs scale-on-click flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total RSVPs', value: '127', color: 'text-white' },
                { label: 'Attending', value: '118', color: 'text-premium-success' },
                { label: 'Declined', value: '9', color: 'text-premium-danger' },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sample response list */}
            <div className="rounded-2xl overflow-hidden border border-premium-borderDark">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-premium-surfaceDark text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <th className="p-3 pl-4">Name</th>
                    <th className="p-3">Attending</th>
                    <th className="p-3">Guests</th>
                    <th className="p-3 pr-4">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-premium-borderDark/60">
                  {[
                    { name: 'Sarah Kim', att: true, guests: 2, date: 'Oct 28' },
                    { name: 'Marco Reyes', att: true, guests: 1, date: 'Oct 27' },
                    { name: 'Lena Hoffman', att: false, guests: 0, date: 'Oct 26' },
                    { name: 'James Tan', att: true, guests: 4, date: 'Oct 25' },
                  ].map((r) => (
                    <tr key={r.name} className="hover:bg-premium-surfaceDark/40 transition-colors">
                      <td className="p-3 pl-4 font-bold text-white">{r.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.att ? 'bg-premium-success/15 text-premium-success border border-premium-success/30' : 'bg-premium-danger/15 text-premium-danger border border-premium-danger/30'}`}>
                          {r.att ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">{r.guests}</td>
                      <td className="p-3 pr-4 text-zinc-500 font-mono">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono text-center">Showing 4 of 127 responses</p>
          </div>
        )}

        {/* PWA TAB */}
        {formTab === 'pwa' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-premium-gold" /> PWA Admin Register
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Install the admin PWA on your device. Registration scanning requires OTP login sent to your registered admin email.
              </p>
            </div>

            {/* OTP Login notice */}
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-start gap-3">
              <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300">
                <span className="font-bold">Secure OTP Login — </span>
                To activate scan mode, the admin must authenticate via a one-time password sent to their registered email address in the backend. No password is stored on device.
              </div>
            </div>

            {/* Install card */}
            <div className="p-6 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center space-y-4">
              <div className="w-16 h-16 bg-premium-gold rounded-2xl flex items-center justify-center mx-auto shadow-gold">
                <span className="text-premium-black font-display font-bold text-2xl">41</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">all41 Admin Scanner</div>
                <div className="text-xs text-zinc-400 mt-0.5">Check-in, register guests, and scan QR passes</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://${slug}.all41.app/admin`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 rounded-xl bg-premium-black border border-premium-borderDark text-xs font-bold text-white flex flex-col items-center gap-1 scale-on-click hover:border-premium-gold/50"
                >
                  <Smartphone className="w-5 h-5 text-premium-gold" />
                  <span>Open Admin PWA</span>
                </a>
                <button
                  type="button"
                  className="py-3 rounded-xl bg-premium-gold text-black text-xs font-bold flex flex-col items-center gap-1 scale-on-click shadow-gold"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://${slug}.all41.app/admin`);
                  }}
                >
                  <Link className="w-5 h-5" />
                  <span>Copy Admin URL</span>
                </button>
              </div>
            </div>

            {/* Admin setup steps */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Setup Steps</p>
              {[
                'Open the Admin PWA link on your phone',
                'Enter your admin email (registered in backend)',
                'Receive and enter the OTP code',
                'Tap "Activate Scanner" to start scanning guest QR codes',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-zinc-300">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-premium-gold text-black font-bold text-[10px] flex items-center justify-center">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {formTab === 'settings' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base">Settings</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Rules for the form.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-bold block mb-1.5">Form name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Only you see this. It appears in the form list.</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-white">Accepting responses</div>
                  <div className="text-[10px] text-zinc-500">Turn off to show the closed page.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAcceptingResponses(!acceptingResponses)}
                  className={`w-12 h-6 rounded-full transition-colors ${acceptingResponses ? 'bg-premium-success' : 'bg-zinc-700'} flex items-center ${acceptingResponses ? 'justify-end pr-0.5' : 'pl-0.5'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-white" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1.5">Reply by (optional)</label>
                  <input
                    type="date"
                    value={replyBy}
                    onChange={(e) => setReplyBy(e.target.value)}
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Closes the form after this day.</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1.5">Guest limit (optional)</label>
                  <input
                    type="number"
                    value={guestLimit}
                    onChange={(e) => setGuestLimit(e.target.value)}
                    placeholder="200"
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Closes when total party size is reached.</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-bold block mb-1.5">Most guests per reply</label>
                <input
                  type="number"
                  value={maxPerReply}
                  onChange={(e) => setMaxPerReply(e.target.value)}
                  className="w-32 bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Caps the "number of guests" question.</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-white">Ask guests to review before sending</div>
                  <div className="text-[10px] text-zinc-500">One last screen that lists their answers.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAskReview(!askReview)}
                  className={`w-12 h-6 rounded-full transition-colors ${askReview ? 'bg-premium-success' : 'bg-zinc-700'} flex items-center ${askReview ? 'justify-end pr-0.5' : 'pl-0.5'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-white" />
                </button>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-bold block mb-1.5">Send button says</label>
                <input
                  value={sendLabel}
                  onChange={(e) => setSendLabel(e.target.value)}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Phone preview */}
      <div className="xl:col-span-5 flex flex-col items-center gap-4 pt-2 sticky top-24 self-start">
        <div className="flex items-center gap-3 self-start">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Preview</span>
        </div>

        {/* Phone mockup */}
        <div className="w-[220px] rounded-[2.5rem] border-[5px] border-zinc-800 bg-[#09090B] overflow-hidden shadow-2xl" style={{ height: '440px' }}>
          <div className="h-5 bg-zinc-900 flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-zinc-700" />
          </div>
          {formTab === 'closing' ? (
            /* QR ticket preview */
            <div className="overflow-y-auto" style={{ height: '415px' }}>
              <div className="text-[9px] font-bold px-4 pt-3 pb-1" style={{ color: primaryColor }}>{eventName}</div>
              <div className="px-4 pb-3 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <Check className="w-4 h-4 text-black" />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold text-white">See you there, {previewName}!</div>
                  <div className="text-[8px] text-zinc-400 mt-1">Your seat is saved for 2 guests. Please show this QR code at the entrance.</div>
                </div>
                {/* ticket */}
                <div className="w-full rounded-xl overflow-hidden border border-zinc-700">
                  <div className="px-3 py-2" style={{ backgroundColor: primaryColor }}>
                    <div className="text-[8px] font-bold text-black uppercase tracking-wider">You&apos;re invited</div>
                    <div className="text-[10px] font-bold text-black">{eventName}</div>
                    <div className="text-[8px] text-black/70">{isWedding ? 'are getting married' : 'Executive Summit'}</div>
                  </div>
                  <div className="bg-zinc-900 p-3 grid grid-cols-2 gap-2 text-[8px]">
                    <div><div className="text-zinc-500 uppercase font-bold mb-0.5">Guest</div><div className="text-white">{previewName}</div></div>
                    <div><div className="text-zinc-500 uppercase font-bold mb-0.5">Party</div><div className="text-white">2</div></div>
                    <div><div className="text-zinc-500 uppercase font-bold mb-0.5">Date</div><div className="text-white">{isWedding ? 'Feb 20, 2027' : 'Nov 14, 2026'}</div></div>
                    <div><div className="text-zinc-500 uppercase font-bold mb-0.5">Time</div><div className="text-white">{isWedding ? '3:00 PM' : '09:00 AM'}</div></div>
                    <div className="col-span-2"><div className="text-zinc-500 uppercase font-bold mb-0.5">Venue</div><div className="text-white">{isWedding ? 'Casa Verde Gardens' : 'Marina Bay Sands'}</div></div>
                  </div>
                  <div className="border-t border-dashed border-zinc-700 bg-zinc-900 p-3 flex flex-col items-center gap-1.5">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                      <QrCode className="w-14 h-14 text-black" />
                    </div>
                    <div className="text-[8px] font-mono text-zinc-300">BEA-7K2P</div>
                    <div className="text-[7px] text-zinc-500 text-center">Save this ticket or take a screenshot. We will scan it at the door.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cover / RSVPify preview */
            <div className="overflow-y-auto" style={{ height: '415px' }}>
              <div className="h-28 flex items-end p-3 bg-cover bg-center" style={{ background: `linear-gradient(180deg, ${primaryColor}55 0%, #09090B 100%)` }}>
                <div className="text-[8px] uppercase font-bold tracking-wider" style={{ color: primaryColor }}>
                  {isWedding ? "You're Invited" : "Register Now"}
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <div className="text-[16px] font-bold text-white leading-tight">{eventName}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{isWedding ? 'are getting married' : 'APAC Executive Summit'}</div>
                </div>
                {[
                  { icon: '📅', text: isWedding ? 'Saturday, February 20, 2027' : 'Nov 14–15, 2026' },
                  { icon: '🕒', text: isWedding ? '3:00 PM' : '09:00 AM – 6:00 PM' },
                  { icon: '📍', text: isWedding ? 'Casa Verde Gardens, Tagaytay' : 'Marina Bay Sands, SG' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-[9px] text-zinc-300 font-medium">
                    <span>{item.icon}</span>{item.text}
                  </div>
                ))}
                <div className="text-[9px] text-zinc-400 leading-relaxed mt-1">
                  {isWedding
                    ? 'We would love to celebrate with you. Please let us know if you can make it.'
                    : 'Join 500+ technology leaders. Two days of keynotes, workshops and high-value networking.'}
                </div>
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl text-[10px] font-bold"
                  style={{ backgroundColor: primaryColor, color: '#000' }}
                >
                  {isWedding ? 'RSVP now →' : 'Register Now →'}
                </button>
                <div className="text-center text-[8px] text-zinc-500">Takes about 1 minute</div>
              </div>
            </div>
          )}
        </div>

        {/* Share link */}
        <div className="w-full max-w-[260px] p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
          <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Share form link</div>
          <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-xl px-3 py-2">
            <span className="text-[10px] font-mono text-premium-neon flex-1 truncate">all41.app/rsvp/{slug}</span>
            <button
              type="button"
              onClick={() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
              className="text-zinc-400 hover:text-white"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <a href="#" className="text-[10px] text-premium-neon flex items-center gap-1 hover:underline" onClick={(e) => e.preventDefault()}>
            <ExternalLink className="w-3 h-3" /> Open live form
          </a>
        </div>
      </div>
    </div>
  );
}
