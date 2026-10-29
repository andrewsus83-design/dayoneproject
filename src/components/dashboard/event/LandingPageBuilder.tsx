'use client';

import React, { useState } from 'react';
import {
  Type, Image, AlignLeft, MousePointer, BookOpen, LayoutGrid, Star,
  ChevronUp, ChevronDown, Eye, EyeOff, Plus, Trash2, GripVertical,
  Palette, Upload, Link2, Globe, Calendar, Clock, MapPin, Check,
} from 'lucide-react';

interface LPSection {
  id: string;
  type: 'cover' | 'title' | 'subtitle' | 'body' | 'button' | 'verse' | 'gallery' | 'highlights' | 'info';
  label: string;
  enabled: boolean;
  content?: string;
  sub?: string;
}

const DEFAULT_SECTIONS: LPSection[] = [
  { id: 's-cover', type: 'cover', label: 'Cover Photo / Hero', enabled: true },
  { id: 's-title', type: 'title', label: 'Event Title', enabled: true, content: 'TechUnite APAC Summit 2026' },
  { id: 's-sub', type: 'subtitle', label: 'Subtitle / Label', enabled: true, content: 'APAC Executive Summit', sub: 'Leading the Next Wave of Innovation' },
  { id: 's-info', type: 'info', label: 'Core Event Info', enabled: true },
  { id: 's-body', type: 'body', label: 'Body Text', enabled: true, content: "Join 500+ technology leaders, investors, and innovators at Asia's premier executive summit. Two days of keynotes, workshops, and high-value networking." },
  { id: 's-btn', type: 'button', label: 'CTA Button', enabled: true, content: 'Register Delegate Pass', sub: 'Seats are limited — secure yours today' },
  { id: 's-verse', type: 'verse', label: 'Notes / Verse / Quote', enabled: false, content: '"The best way to predict the future is to create it." — Peter Drucker' },
  { id: 's-gallery', type: 'gallery', label: 'Photo Gallery', enabled: false },
  { id: 's-highlights', type: 'highlights', label: 'Highlights / Features', enabled: true },
];

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cover: Image,
  title: Type,
  subtitle: AlignLeft,
  info: Calendar,
  body: AlignLeft,
  button: MousePointer,
  verse: BookOpen,
  gallery: LayoutGrid,
  highlights: Star,
};

function PhonePreview({ sections, primaryColor }: { sections: LPSection[]; primaryColor: string }) {
  const active = sections.filter((s) => s.enabled);
  return (
    <div
      className="w-[210px] flex-shrink-0 rounded-[2.5rem] border-[5px] border-zinc-800 bg-[#09090B] overflow-hidden shadow-2xl"
      style={{ height: '420px' }}
    >
      <div className="h-5 bg-zinc-900 flex items-center justify-center">
        <div className="w-16 h-1.5 rounded-full bg-zinc-700" />
      </div>
      <div className="overflow-y-auto" style={{ height: '395px' }}>
        {active.map((sec) => (
          <PreviewSection key={sec.id} section={sec} primaryColor={primaryColor} />
        ))}
      </div>
    </div>
  );
}

function PreviewSection({ section, primaryColor }: { section: LPSection; primaryColor: string }) {
  switch (section.type) {
    case 'cover':
      return (
        <div
          className="w-full h-32 flex items-end p-3"
          style={{ background: `linear-gradient(180deg, ${primaryColor}44 0%, #09090B 100%)` }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: primaryColor, color: '#000' }}>41</div>
        </div>
      );
    case 'title':
      return (
        <div className="px-4 pt-3 pb-1">
          <div className="text-[13px] font-bold text-white leading-tight">{section.content}</div>
        </div>
      );
    case 'subtitle':
      return (
        <div className="px-4 pb-2">
          <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}>{section.content}</span>
          {section.sub && <div className="text-[8px] text-zinc-400 mt-0.5">{section.sub}</div>}
        </div>
      );
    case 'info':
      return (
        <div className="px-4 py-2 space-y-1">
          {[['📅', 'Nov 14–15, 2026'], ['🕒', '09:00 – 18:00'], ['📍', 'Marina Bay Sands, Singapore']].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-1.5 text-[7px] text-zinc-300">{icon} {text}</div>
          ))}
        </div>
      );
    case 'body':
      return (
        <div className="px-4 py-2">
          <div className="text-[7px] text-zinc-400 leading-relaxed">{section.content}</div>
        </div>
      );
    case 'button':
      return (
        <div className="px-4 py-3">
          <div className="text-center py-2 rounded-xl text-[8px] font-bold" style={{ backgroundColor: primaryColor, color: '#000' }}>{section.content}</div>
          {section.sub && <div className="text-center text-[6px] text-zinc-500 mt-1">{section.sub}</div>}
        </div>
      );
    case 'verse':
      return (
        <div className="mx-4 my-2 p-2 rounded-lg border-l-2 bg-white/5" style={{ borderColor: primaryColor }}>
          <div className="text-[7px] text-zinc-400 italic">{section.content}</div>
        </div>
      );
    case 'gallery':
      return (
        <div className="px-4 py-2">
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-md bg-zinc-800" />
            ))}
          </div>
        </div>
      );
    case 'highlights':
      return (
        <div className="px-4 py-2 space-y-1">
          {['500+ Delegates', 'Keynote Speakers', 'Exhibition Hall'].map((h) => (
            <div key={h} className="flex items-center gap-1.5 text-[7px] text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              {h}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function LandingPageBuilder({ isWedding, primaryColor }: { isWedding: boolean; primaryColor: string }) {
  const [sections, setSections] = useState<LPSection[]>(DEFAULT_SECTIONS);
  const [editingSec, setEditingSec] = useState<string | null>('s-title');
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => setSections((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSections((prev) => { const n = [...prev]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; });
  };
  const moveDown = (idx: number) => {
    setSections((prev) => { if (idx === prev.length - 1) return prev; const n = [...prev]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; });
  };
  const updateContent = (id: string, key: 'content' | 'sub', val: string) =>
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, [key]: val } : s));

  const editSec = sections.find((s) => s.id === editingSec);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Section list */}
      <div className="xl:col-span-5 space-y-4">
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-base">Page Sections</h3>
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold scale-on-click flex items-center gap-1.5 bg-premium-gold text-black shadow-gold"
            >
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save Changes'}
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((sec, idx) => {
              const Icon = SECTION_ICONS[sec.type] || AlignLeft;
              const isEditing = editingSec === sec.id;
              return (
                <div
                  key={sec.id}
                  className={`rounded-2xl border transition-all cursor-pointer ${
                    isEditing
                      ? 'border-premium-gold/50 bg-premium-gold/5'
                      : sec.enabled
                        ? 'border-premium-borderDark bg-premium-surfaceDark'
                        : 'border-premium-borderDark/40 bg-premium-surfaceDark/40 opacity-50'
                  }`}
                >
                  <div
                    className="p-3 flex items-center gap-3"
                    onClick={() => setEditingSec(isEditing ? null : sec.id)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 cursor-grab" />
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isEditing ? 'text-premium-gold' : 'text-zinc-500'}`} />
                    <span className={`flex-1 text-xs font-bold ${isEditing ? 'text-premium-gold' : 'text-white'}`}>{sec.label}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveUp(idx); }} className="p-1 hover:text-white text-zinc-600">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveDown(idx); }} className="p-1 hover:text-white text-zinc-600">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggle(sec.id); }} className={`p-1 ${sec.enabled ? 'text-premium-success' : 'text-zinc-600'}`}>
                        {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit panel */}
                  {isEditing && (
                    <div className="px-4 pb-4 space-y-3 border-t border-premium-borderDark/50 pt-3">
                      {sec.type === 'cover' && (
                        <div>
                          <label className="text-[10px] text-zinc-400 font-bold block mb-2">Hero Image</label>
                          <div className="h-20 rounded-xl border-2 border-dashed border-premium-borderDark bg-premium-black flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-premium-gold/50">
                            <Upload className="w-5 h-5 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500">Upload or paste URL</span>
                          </div>
                          <input
                            type="text"
                            placeholder="https://... or CDN URL"
                            className="mt-2 w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                          />
                        </div>
                      )}
                      {(sec.type === 'title' || sec.type === 'body' || sec.type === 'verse') && (
                        <div>
                          <label className="text-[10px] text-zinc-400 font-bold block mb-1">Text Content</label>
                          <textarea
                            value={sec.content || ''}
                            onChange={(e) => updateContent(sec.id, 'content', e.target.value)}
                            rows={sec.type === 'body' ? 4 : 2}
                            className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold resize-none"
                          />
                        </div>
                      )}
                      {sec.type === 'subtitle' && (
                        <>
                          <div>
                            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Badge / Label</label>
                            <input
                              value={sec.content || ''}
                              onChange={(e) => updateContent(sec.id, 'content', e.target.value)}
                              className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Subtitle Text</label>
                            <input
                              value={sec.sub || ''}
                              onChange={(e) => updateContent(sec.id, 'sub', e.target.value)}
                              className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                            />
                          </div>
                        </>
                      )}
                      {sec.type === 'button' && (
                        <>
                          <div>
                            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Button Label</label>
                            <input
                              value={sec.content || ''}
                              onChange={(e) => updateContent(sec.id, 'content', e.target.value)}
                              className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Note under button</label>
                            <input
                              value={sec.sub || ''}
                              onChange={(e) => updateContent(sec.id, 'sub', e.target.value)}
                              className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                            />
                          </div>
                        </>
                      )}
                      {sec.type === 'info' && (
                        <div className="space-y-2">
                          {['Date', 'Time', 'Venue', 'City / Address'].map((lbl) => (
                            <div key={lbl}>
                              <label className="text-[10px] text-zinc-400 font-bold block mb-1">{lbl}</label>
                              <input
                                placeholder={`Enter ${lbl.toLowerCase()}…`}
                                className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {sec.type === 'gallery' && (
                        <div>
                          <label className="text-[10px] text-zinc-400 font-bold block mb-2">Gallery Photos</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-premium-borderDark bg-premium-black flex items-center justify-center cursor-pointer hover:border-premium-gold/50">
                                <Plus className="w-4 h-4 text-zinc-600" />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Or link Google Drive</label>
                            <input
                              placeholder="https://drive.google.com/..."
                              className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-[11px] outline-none focus:border-premium-gold"
                            />
                          </div>
                        </div>
                      )}
                      {sec.type === 'highlights' && (
                        <div>
                          <label className="text-[10px] text-zinc-400 font-bold block mb-2">Feature Highlights</label>
                          <div className="space-y-2">
                            {(isWedding
                              ? ['Intimate Garden Ceremony', 'Sunset Reception', 'Live Band', 'Catered Banquet']
                              : ['500+ Delegates', 'Keynote Speakers', 'Networking Rails', 'AI Workshops']
                            ).map((h) => (
                              <div key={h} className="flex items-center gap-2 text-[11px] text-zinc-300 bg-premium-black border border-premium-borderDark rounded-xl px-3 py-2">
                                <Star className="w-3 h-3 text-premium-gold" />
                                {h}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-4 w-full py-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-500 text-xs font-bold hover:border-premium-gold/50 hover:text-zinc-300 flex items-center justify-center gap-2 scale-on-click"
          >
            <Plus className="w-4 h-4" />
            Add Custom Section
          </button>
        </div>

        {/* Theme / Color */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
          <h4 className="text-sm font-display font-bold text-white mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-premium-gold" />
            Theme & Colors
          </h4>
          <div className="flex gap-2 flex-wrap">
            {['#C5A059', '#00F0FF', '#F43F5E', '#10B981', '#3B82F6', '#8B5CF6'].map((c) => (
              <button
                key={c}
                type="button"
                className="w-8 h-8 rounded-full border-2 scale-on-click"
                style={{ backgroundColor: c, borderColor: c === primaryColor ? 'white' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        {/* Link */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
          <h4 className="text-sm font-display font-bold text-white mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-premium-neon" />
            Public URL
          </h4>
          <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-xl px-3 py-2">
            <Link2 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-mono text-premium-neon flex-1">all41.app/e/bea-migs</span>
            <button type="button" className="text-zinc-400 hover:text-white">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Phone preview */}
      <div className="xl:col-span-7 flex flex-col items-center gap-4 pt-2">
        <div className="flex items-center gap-3 self-start">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Preview</span>
          <span className="px-2 py-0.5 rounded-md bg-premium-success/15 text-premium-success font-mono text-[10px] border border-premium-success/30">Auto-sync</span>
        </div>
        <PhonePreview sections={sections} primaryColor={primaryColor} />
        <p className="text-[10px] text-zinc-600 text-center max-w-[210px]">Sections render live as you edit. Toggle visibility to show/hide.</p>
      </div>
    </div>
  );
}
