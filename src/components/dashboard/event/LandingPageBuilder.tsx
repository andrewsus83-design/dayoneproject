'use client';
import { useState, useRef } from 'react';
import React from 'react';
import {
  Image, Type, AlignLeft, Info, MousePointerClick, BookOpen, Grid3X3,
  Sparkles, Upload, Plus, Trash2, GripVertical, Eye, EyeOff, Check,
  Link, Star, Quote, Play, X as XIcon, Smartphone,
} from 'lucide-react';

type LandingSubTab = 'hero' | 'gallery' | 'testimony' | 'info' | 'title' | 'subtitle' | 'notes';

interface Props {
  isWedding: boolean;
  primaryColor: string;
}

function SubNav({ active, onChange }: { active: LandingSubTab; onChange: (t: LandingSubTab) => void }) {
  const tabs: { id: LandingSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hero', label: 'Hero Image', icon: Image },
    { id: 'gallery', label: 'Photo Gallery', icon: Grid3X3 },
    { id: 'testimony', label: 'Testimony', icon: Quote },
    { id: 'info', label: 'Core Information', icon: Info },
    { id: 'title', label: 'Title', icon: Type },
    { id: 'subtitle', label: 'Subtitle / Label', icon: AlignLeft },
    { id: 'notes', label: 'Notes', icon: BookOpen },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all whitespace-nowrap ${
            active === t.id
              ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40'
              : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
          }`}
        >
          <t.icon className="w-3.5 h-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Shared phone preview ─────────────────────────────── */
function PhonePreview({
  title, subtitle, info, ctaLabel, heroUrl, galleryOn, testimoniesOn, notes,
}: {
  title: string; subtitle: string; info: string; ctaLabel: string;
  heroUrl: string; galleryOn: boolean; testimoniesOn: boolean; notes: string;
}) {
  return (
    <div className="shrink-0 w-[210px] h-[420px] rounded-[2.5rem] bg-[#09090B] border-4 border-zinc-700 overflow-hidden shadow-2xl relative flex flex-col">
      <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-center z-10">
        <div className="w-20 h-4 rounded-b-xl bg-zinc-800" />
      </div>
      <div className="flex-1 overflow-y-auto pt-5 scrollbar-none">
        {heroUrl ? (
          <div className="relative h-28 bg-zinc-800">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#09090B]" />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-b from-zinc-800 to-[#09090B] flex items-center justify-center">
            <Image className="w-8 h-8 text-zinc-600" />
          </div>
        )}
        <div className="px-4 pt-2 space-y-1.5 pb-4">
          <div className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">{subtitle || 'Subtitle label'}</div>
          <div className="text-sm font-display font-bold text-white leading-tight">{title || 'Event Title'}</div>
          <div className="text-[9px] text-zinc-400">{info || 'Date · Venue · Location'}</div>
          {notes && <div className="text-[8px] italic text-zinc-500 border-l border-zinc-700 pl-2">{notes}</div>}
          {galleryOn && (
            <div className="grid grid-cols-3 gap-0.5 mt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-zinc-800 rounded" />
              ))}
            </div>
          )}
          {testimoniesOn && (
            <div className="bg-zinc-800/80 rounded-xl px-3 py-2 mt-1">
              <div className="text-[8px] italic text-zinc-300">&ldquo;Absolutely outstanding event!&rdquo;</div>
              <div className="text-[7px] text-zinc-500 mt-0.5">— Sarah K.</div>
            </div>
          )}
          <button type="button" className="w-full py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[9px] mt-2 scale-on-click">
            {ctaLabel || 'Register Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Testimony card ─────────────────────────────────────── */
interface Testimony { id: string; name: string; role: string; text: string; rating: number; }

/* ── Main component ──────────────────────────────────────── */
export function LandingPageBuilder({ isWedding, primaryColor }: Props) {
  const [subTab, setSubTab] = useState<LandingSubTab>('hero');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Hero
  const [heroUrl, setHeroUrl] = useState('');
  const [heroOverlay, setHeroOverlay] = useState(true);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Gallery
  const [galleryOn, setGalleryOn] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; url: string; caption: string }[]>([]);

  // Testimony
  const [testimoniesOn, setTestimoniesOn] = useState(false);
  const [testimonies, setTestimonies] = useState<Testimony[]>([
    { id: 't1', name: 'Sarah Kim', role: isWedding ? 'Bridesmaid' : 'CEO, TechCorp', text: 'Absolutely outstanding — every detail was perfect.', rating: 5 },
  ]);
  const [newTestimony, setNewTestimony] = useState({ name: '', role: '', text: '', rating: 5 });

  // Info
  const [eventDate, setEventDate] = useState('2026-11-29');
  const [eventTime, setEventTime] = useState('16:00');
  const [venue, setVenue] = useState(isWedding ? 'Grand Ballroom, Hotel Mulia' : 'Marina Bay Sands Convention Centre');
  const [city, setCity] = useState(isWedding ? 'Jakarta, Indonesia' : 'Singapore');
  const [capacity, setCapacity] = useState(isWedding ? '200 Guests' : '500 Delegates');
  const [dressCode, setDressCode] = useState(isWedding ? 'Formal — White & Gold' : 'Business Attire');

  // Title
  const [title, setTitle] = useState(isWedding ? 'The Wedding of Andreas & Clara' : 'TechUnite APAC Summit 2026');
  const [ctaLabel, setCtaLabel] = useState(isWedding ? 'RSVP Now' : 'Register Delegate Pass');
  const [ctaSub, setCtaSub] = useState(isWedding ? 'Limited seats — reserve yours today' : 'Seats are limited — secure yours today');

  // Subtitle
  const [subtitle, setSubtitle] = useState(isWedding ? 'A Celebration of Love' : 'APAC Executive Summit');
  const [badge, setBadge] = useState(isWedding ? 'Intimate Garden Ceremony' : 'Invitation Only');

  // Notes
  const [notesOn, setNotesOn] = useState(false);
  const [notesText, setNotesText] = useState(
    isWedding
      ? '"And now these three remain: faith, hope and love. But the greatest of these is love." — 1 Corinthians 13:13'
      : '"The best way to predict the future is to create it." — Peter Drucker'
  );

  const infoString = `${new Date(eventDate + 'T' + eventTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${eventTime} · ${venue}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
      {/* Left: editor */}
      <div className="space-y-5 min-w-0">
        <SubNav active={subTab} onChange={setSubTab} />

        {/* ── Hero Image ── */}
        {subTab === 'hero' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Hero / Cover Image</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Full-bleed banner shown at the top of the landing page.</p>
              </div>
            </div>

            {heroUrl ? (
              <div className="relative rounded-2xl overflow-hidden h-48">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${heroUrl})` }}
                />
                {heroOverlay && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/70" />}
                <button
                  type="button"
                  onClick={() => setHeroUrl('')}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-premium-danger/80"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="h-48 rounded-2xl bg-premium-surfaceDark border-2 border-dashed border-premium-borderDark flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-premium-gold/50 transition-colors"
                onClick={() => heroInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-premium-gold" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white">Upload Hero Image</div>
                  <div className="text-xs text-zinc-400 mt-0.5">JPG, PNG, WebP — max 4MB · Recommended 1920×1080</div>
                </div>
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setHeroUrl(URL.createObjectURL(f));
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300">Dark gradient overlay</span>
              <button
                type="button"
                onClick={() => setHeroOverlay(!heroOverlay)}
                className={`px-3 py-1.5 rounded-xl font-bold scale-on-click ${heroOverlay ? 'bg-premium-gold text-black' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {heroOverlay ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* OpenArt generate option */}
            <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-premium-gold" />
                  AI-generated hero image
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Generate a cinematic banner with OpenArt nano-banana-2</div>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                onClick={() => alert('OpenArt image generation would launch here')}
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {/* ── Photo Gallery ── */}
        {subTab === 'gallery' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Photo Gallery Section</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Pinterest-style masonry grid shown on the landing page.</p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOn(!galleryOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs scale-on-click ${galleryOn ? 'bg-premium-gold text-black shadow-gold' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {galleryOn ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {galleryOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {!galleryOn && (
              <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-dashed border-premium-borderDark text-center text-xs text-zinc-500">
                Toggle ON to show a photo gallery on your landing page.
              </div>
            )}

            {galleryOn && (
              <>
                {galleryPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryPhotos.map((p) => (
                      <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 group">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${p.url})` }} />
                        <button
                          type="button"
                          onClick={() => setGalleryPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-premium-borderDark bg-premium-surfaceDark flex items-center justify-center cursor-pointer hover:border-premium-gold/50 transition-colors">
                      <Plus className="w-5 h-5 text-zinc-500" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setGalleryPhotos((prev) => [
                            ...prev,
                            ...files.map((f) => ({ id: Date.now() + f.name, url: URL.createObjectURL(f), caption: '' })),
                          ]);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="h-32 rounded-2xl border-2 border-dashed border-premium-borderDark bg-premium-surfaceDark flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-premium-gold/50 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-500" />
                    <span className="text-xs text-zinc-400">Upload photos (multi-select)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setGalleryPhotos(files.map((f) => ({ id: Date.now() + f.name, url: URL.createObjectURL(f), caption: '' })));
                      }}
                    />
                  </label>
                )}
                <div className="text-[10px] text-zinc-500 font-mono">
                  {galleryPhotos.length} photo{galleryPhotos.length !== 1 ? 's' : ''} uploaded · Max 20 · WebP recommended
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Testimony ── */}
        {subTab === 'testimony' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Testimonies / Quotes</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Social proof cards shown before the CTA button.</p>
              </div>
              <button
                type="button"
                onClick={() => setTestimoniesOn(!testimoniesOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs scale-on-click ${testimoniesOn ? 'bg-premium-gold text-black shadow-gold' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {testimoniesOn ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {testimoniesOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {!testimoniesOn && (
              <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-dashed border-premium-borderDark text-center text-xs text-zinc-500">
                Toggle ON to show testimonies on your landing page.
              </div>
            )}

            {testimoniesOn && (
              <>
                <div className="space-y-3">
                  {testimonies.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-premium-gold text-premium-gold" />
                          ))}
                        </div>
                        <p className="text-xs italic text-zinc-300">&ldquo;{t.text}&rdquo;</p>
                        <p className="text-[10px] text-zinc-500 mt-1 font-bold">{t.name} · {t.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTestimonies((prev) => prev.filter((x) => x.id !== t.id))}
                        className="shrink-0 text-zinc-600 hover:text-premium-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add testimony form */}
                <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark/60 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Add Testimony</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={newTestimony.name}
                      onChange={(e) => setNewTestimony((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Name"
                      className="px-3 py-2 rounded-xl bg-premium-black border border-premium-borderDark text-xs text-white placeholder-zinc-600 outline-none focus:border-premium-gold/60"
                    />
                    <input
                      value={newTestimony.role}
                      onChange={(e) => setNewTestimony((p) => ({ ...p, role: e.target.value }))}
                      placeholder={isWedding ? 'Relation' : 'Role / Company'}
                      className="px-3 py-2 rounded-xl bg-premium-black border border-premium-borderDark text-xs text-white placeholder-zinc-600 outline-none focus:border-premium-gold/60"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newTestimony.text}
                    onChange={(e) => setNewTestimony((p) => ({ ...p, text: e.target.value }))}
                    placeholder="Their testimonial..."
                    className="w-full px-3 py-2 rounded-xl bg-premium-black border border-premium-borderDark text-xs text-white placeholder-zinc-600 outline-none focus:border-premium-gold/60 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => setNewTestimony((p) => ({ ...p, rating: s }))}>
                          <Star className={`w-4 h-4 ${s <= newTestimony.rating ? 'fill-premium-gold text-premium-gold' : 'text-zinc-700'}`} />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTestimony.name || !newTestimony.text) return;
                        setTestimonies((prev) => [...prev, { id: Date.now().toString(), ...newTestimony }]);
                        setNewTestimony({ name: '', role: '', text: '', rating: 5 });
                      }}
                      className="px-4 py-1.5 rounded-xl bg-premium-gold text-black font-bold text-xs scale-on-click"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Core Information ── */}
        {subTab === 'info' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="font-display font-bold text-white">Core Event Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Event Date', value: eventDate, type: 'date', set: setEventDate },
                { label: 'Event Time', value: eventTime, type: 'time', set: setEventTime },
              ].map(({ label, value, type, set }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60"
                  />
                </div>
              ))}
              {[
                { label: 'Venue / Hall', value: venue, set: setVenue },
                { label: 'City / Country', value: city, set: setCity },
                { label: 'Capacity', value: capacity, set: setCapacity },
                { label: isWedding ? 'Dress Code' : 'Attire', value: dressCode, set: setDressCode },
              ].map(({ label, value, set }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</label>
                  <input
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[10px] font-mono text-zinc-400">
              Preview: {infoString}
            </div>
          </div>
        )}

        {/* ── Title ── */}
        {subTab === 'title' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="font-display font-bold text-white">Event Title & CTA Button</h4>
            {[
              { label: 'Main Title', value: title, set: setTitle, hint: 'Shown as H1 on landing page' },
              { label: 'CTA Button Label', value: ctaLabel, set: setCtaLabel, hint: 'Primary call-to-action text' },
              { label: 'CTA Sub-label', value: ctaSub, set: setCtaSub, hint: 'Small text beneath the button' },
            ].map(({ label, value, set, hint }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white outline-none focus:border-premium-gold/60"
                />
                <p className="text-[10px] text-zinc-600">{hint}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Subtitle / Label ── */}
        {subTab === 'subtitle' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="font-display font-bold text-white">Subtitle & Label Badge</h4>
            {[
              { label: 'Subtitle / Tagline', value: subtitle, set: setSubtitle, hint: 'Appears above the main title' },
              { label: 'Label Badge', value: badge, set: setBadge, hint: 'Small pill badge e.g. "Invitation Only"' },
            ].map(({ label, value, set, hint }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white outline-none focus:border-premium-gold/60"
                />
                <p className="text-[10px] text-zinc-600">{hint}</p>
              </div>
            ))}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <div className="px-3 py-1 rounded-full bg-premium-gold/15 text-premium-gold border border-premium-gold/30 text-[10px] font-bold font-mono">
                {badge}
              </div>
              <div className="text-sm font-display font-bold text-zinc-400">{subtitle}</div>
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {subTab === 'notes' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Notes / Verse / Quote</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Optional inspirational text displayed below core info.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotesOn(!notesOn)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs scale-on-click ${notesOn ? 'bg-premium-gold text-black shadow-gold' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {notesOn ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {notesOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {!notesOn && (
              <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-dashed border-premium-borderDark text-center text-xs text-zinc-500">
                Toggle ON to show a verse, quote, or note on your landing page.
              </div>
            )}

            {notesOn && (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white italic outline-none focus:border-premium-gold/60 resize-none"
                />
                <div className="p-4 rounded-2xl bg-premium-surfaceDark border-l-2 border-premium-gold text-xs italic text-zinc-300">
                  {notesText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save row */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 text-sm font-bold scale-on-click hover:border-zinc-600 lg:hidden"
          >
            <Smartphone className="w-4 h-4" />
            Preview
          </button>
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-sm shadow-gold scale-on-click ml-auto"
            onClick={() => alert('Landing page saved!')}
          >
            Save Landing Page
          </button>
        </div>
      </div>

      {/* Right: phone preview — desktop only */}
      <div className="hidden lg:flex flex-col items-center gap-3 pt-[3.5rem]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Live Preview</span>
        <PhonePreview
          title={title}
          subtitle={subtitle}
          info={infoString}
          ctaLabel={ctaLabel}
          heroUrl={heroUrl}
          galleryOn={galleryOn}
          testimoniesOn={testimoniesOn}
          notes={notesOn ? notesText : ''}
        />
      </div>

      {/* Mobile preview modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 lg:hidden" onClick={() => setShowPreviewModal(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-10 right-0 p-2 text-zinc-400 hover:text-white scale-on-click"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <span className="block text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Live Preview</span>
            <PhonePreview
              title={title}
              subtitle={subtitle}
              info={infoString}
              ctaLabel={ctaLabel}
              heroUrl={heroUrl}
              galleryOn={galleryOn}
              testimoniesOn={testimoniesOn}
              notes={notesOn ? notesText : ''}
            />
          </div>
        </div>
      )}
    </div>
  );
}
