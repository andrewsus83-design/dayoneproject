'use client';

import React, { useState } from 'react';
import {
  AlignLeft, CheckSquare, ChevronDown, Hash, Mail, Phone, Plus, Trash2,
  GripVertical, Check, QrCode, Calendar, MapPin, Clock, Users, ExternalLink,
  Copy, Eye, ToggleLeft, ToggleRight, Settings2, X,
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
  const [formTab, setFormTab] = useState<'cover' | 'questions' | 'closing' | 'settings'>('cover');
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
    { id: 'cover' as const, label: 'Cover' },
    { id: 'questions' as const, label: `Questions ${questions.length > 0 ? questions.length : '0'}` },
    { id: 'closing' as const, label: 'Closing' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Form builder */}
      <div className="xl:col-span-7 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl p-1.5 w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                formTab === t.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
              }`}
            >
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
                  { name: 'Golden Field', c1: '#C5A059', c2: '#09090B' },
                  { name: 'Sage Capsule', c1: '#10B981', c2: '#0A100D' },
                  { name: 'Mint Hero', c1: '#00F0FF', c2: '#09090B' },
                  { name: 'Neon Launch', c1: '#00F0FF', c2: '#FF3366' },
                  { name: 'Gala Gold', c1: '#C5A059', c2: '#BE123C' },
                  { name: 'Parol Party', c1: '#FF3366', c2: '#F59E0B' },
                  { name: 'Summit', c1: '#3B82F6', c2: '#8B5CF6' },
                ].map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-full border border-premium-borderDark text-[10px] font-bold text-zinc-300 hover:border-premium-gold/50 scale-on-click"
                  >
                    <span className="flex gap-0.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.c1 }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.c2 }} />
                    </span>
                    {th.name}
                  </button>
                ))}
              </div>
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
              className="w-full py-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-500 text-xs font-bold hover:border-premium-gold/50 flex items-center justify-center gap-2 scale-on-click"
            >
              <Plus className="w-4 h-4" />
              Add a question
            </button>

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
              {['Confirmed', 'Declined', 'Form closed'].map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${lbl === 'Confirmed' ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'}`}
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
                {[
                  { label: 'Show the ticket with QR code', sub: 'The QR is what you scan at the door.' },
                  { label: '"Add to calendar" button' },
                  { label: '"Directions" button' },
                  { label: 'Show your phone and email' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-xs text-white font-medium">{item.label}</div>
                      {item.sub && <div className="text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>}
                    </div>
                    <div className="w-10 h-6 rounded-full bg-premium-success flex items-center justify-end pr-0.5 cursor-pointer">
                      <div className="w-5 h-5 rounded-full bg-white" />
                    </div>
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
