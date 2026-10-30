'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const HERO_BG =
  'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793299266486_f11f928f_1793299266529_107e55ae.png';

// Friday Nov 13 2026 at 6pm Manila time (UTC+8)
const EVENT_DATE = new Date('2026-11-13T18:00:00+08:00').getTime();

const COLORS = {
  deepPlum:     '#7B1D5A',
  tangerine:    '#FF8C00',
  fuchsia:      '#CC0066',
  cobalt:       '#0099DD',
  sapphire:     '#1B3FA0',
  emerald:      '#00A36C',
  lime:         '#39FF14',
  lavender:     '#CC88FF',
  champagne:    '#F7D5AA',
  silver:       '#C8C8D0',
  citrine:      '#FFD700',
  gold:         '#C5A059',
};

// Stained-glass color strips (match slide)
const SG_LEFT  = [COLORS.deepPlum, COLORS.fuchsia, COLORS.tangerine, COLORS.cobalt, COLORS.sapphire, COLORS.emerald, COLORS.lime, COLORS.lavender, COLORS.citrine, COLORS.fuchsia];
const SG_RIGHT = [COLORS.sapphire, COLORS.lavender, COLORS.lime, COLORS.tangerine, COLORS.deepPlum, COLORS.fuchsia, COLORS.citrine, COLORS.cobalt, COLORS.emerald, COLORS.lavender];

function stainedGlassBg(colors: string[]) {
  const pct = 100 / colors.length;
  const stops = colors.map((c, i) =>
    `${c} ${(i * pct).toFixed(1)}%, ${c} ${((i + 1) * pct).toFixed(1)}%`
  );
  return `repeating-linear-gradient(to bottom, ${stops.join(', ')})`;
}

function Countdown({ d, h, m, s }: { d: number; h: number; m: number; s: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
      {[{ v: d, l: 'DAYS' }, { v: h, l: 'HRS' }, { v: m, l: 'MIN' }, { v: s, l: 'SEC' }].map(({ v, l }, i) => (
        <React.Fragment key={l}>
          {i > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '22px', fontSize: '24px', fontWeight: 900, color: COLORS.gold, opacity: 0.7 }}>:</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.72)',
              border: `1px solid ${COLORS.gold}80`,
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              width: '72px', height: '72px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 900, color: COLORS.citrine,
              fontFamily: "'Montserrat', sans-serif",
              boxShadow: `0 0 20px ${COLORS.gold}30`,
            }}>
              {String(v).padStart(2, '0')}
            </div>
            <span style={{ fontSize: '9px', letterSpacing: '0.18em', color: COLORS.silver, fontWeight: 700 }}>{l}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function POPVERSELandingPage() {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = EVENT_DATE - Date.now();
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0, s: 0 }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');

        .pv { font-family: 'Montserrat', sans-serif; }

        /* Animated iridescent text — matching the slide's holographic fill */
        .pv-iri {
          background: linear-gradient(135deg,
            #FFD700 0%, #FF8C00 10%, #CC0066 22%,
            #7B1D5A 34%, #1B3FA0 46%, #0099DD 58%,
            #00A36C 70%, #CC88FF 82%, #FFD700 94%, #FF8C00 100%
          );
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pv-iri 9s ease infinite;
        }
        @keyframes pv-iri {
          0%   { background-position: 0%   50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0%   50%; }
        }

        /* Cards */
        .pv-card {
          background: rgba(8, 4, 6, 0.82);
          border: 1px solid rgba(197, 160, 89, 0.22);
          backdrop-filter: blur(18px);
          border-radius: 16px;
        }

        /* Gold pill label (matches slide style) */
        .pv-label {
          display: inline-block;
          background: rgba(8, 4, 6, 0.95);
          border: 1.5px solid #C5A059;
          border-radius: 7px;
          padding: 7px 18px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: white;
          margin-bottom: 20px;
          font-family: 'Montserrat', sans-serif;
        }

        /* Primary CTA */
        .pv-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 17px 44px;
          border-radius: 50px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          border: none;
        }
        .pv-btn-gold {
          background: linear-gradient(135deg, #C5A059, #E8C470, #B89048);
          color: #0A0608;
          box-shadow: 0 0 30px rgba(197,160,89,0.35), 0 4px 16px rgba(0,0,0,0.4);
        }
        .pv-btn-gold:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 60px rgba(197,160,89,0.65), 0 8px 28px rgba(0,0,0,0.4);
        }
        .pv-btn-ghost {
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.28);
          color: white;
        }
        .pv-btn-ghost:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.48);
        }

        /* Divider diamond */
        .pv-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 auto;
          max-width: 300px;
        }
        .pv-divider::before, .pv-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(197,160,89,0.45), transparent);
        }

        /* Prism bullet */
        .pv-diamond {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          transform: rotate(45deg);
          flex-shrink: 0;
          margin-top: 5px;
        }

        /* Section label */
        .pv-section-label {
          font-size: 11px;
          letter-spacing: 0.32em;
          color: #C5A059;
          font-weight: 700;
          margin-bottom: 14px;
          text-transform: uppercase;
          font-family: 'Montserrat', sans-serif;
        }

        .pv-section-h2 {
          font-size: clamp(28px, 5.5vw, 52px);
          font-weight: 900;
          margin-bottom: 48px;
          line-height: 1.1;
          font-family: 'Montserrat', sans-serif;
        }
      `}</style>

      <div className="pv" style={{ minHeight: '100vh', background: '#0A0608', color: 'white', overflowX: 'hidden' }}>

        {/* ═══════════════════════════════════════
            HERO — cathedral backdrop + iridescent title
        ═══════════════════════════════════════ */}
        <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

          {/* Cathedral background image */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={HERO_BG} alt="POPVERSE 2026" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
            {/* Dark gradient overlay — heavier at edges, lighter in center so bg shows */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,8,0.55) 0%, rgba(10,6,8,0.1) 25%, rgba(10,6,8,0.35) 65%, rgba(10,6,8,1) 100%)' }} />
          </div>

          {/* CSS stained-glass side panels — faithful to the slide */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 'clamp(56px, 9vw, 120px)',
            background: stainedGlassBg(SG_LEFT),
            opacity: 0.5,
            zIndex: 1,
            maskImage: 'linear-gradient(to right, rgba(0,0,0,0.85), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.85), transparent)',
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: 'clamp(56px, 9vw, 120px)',
            background: stainedGlassBg(SG_RIGHT),
            opacity: 0.5,
            zIndex: 1,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,0.85), transparent)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.85), transparent)',
          }} />

          {/* Hero Content */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '80px 32px', maxWidth: '900px', width: '100%' }}>

            {/* CONVERGE brand mark */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.55)',
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.05em' }}>C</span>
              </div>
              <span style={{ fontSize: '10px', letterSpacing: '0.28em', color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase' }}>
                CONVERGE
              </span>
            </div>

            {/* Year-End Party label */}
            <p style={{ fontSize: '12px', letterSpacing: '0.32em', color: COLORS.silver, fontWeight: 600, marginBottom: '20px', textTransform: 'uppercase' }}>
              Year-End Party 2026
            </p>

            {/* Diamond divider */}
            <div className="pv-divider" style={{ marginBottom: '22px' }}>
              <span style={{ color: COLORS.gold, fontSize: '10px' }}>✦</span>
            </div>

            {/* ★ POPVERSE main title — iridescent holographic, matching the slide */}
            <h1 style={{
              fontSize: 'clamp(76px, 16vw, 160px)',
              fontWeight: 900, lineHeight: 0.92,
              marginBottom: '28px',
              letterSpacing: '-0.03em',
              textShadow: '0 0 80px rgba(0,0,0,0.6)',
            }}>
              <span className="pv-iri">P</span>
              {/* Star replacing the O */}
              <span style={{ color: COLORS.citrine, textShadow: `0 0 50px ${COLORS.citrine}CC, 0 0 100px ${COLORS.citrine}66` }}>★</span>
              <span className="pv-iri">PVERSE</span>
            </h1>

            {/* Tagline — exactly as in the slide */}
            <p style={{ fontSize: 'clamp(13px, 2.8vw, 21px)', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.9)', fontWeight: 400, marginBottom: '36px', textTransform: 'uppercase' }}>
              DIFFERENT TUNES.{' '}
              <strong style={{ fontWeight: 900, color: COLORS.citrine }}>ONE BEAT.</strong>
            </p>

            {/* Date + Venue pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '44px' }}>
              {[
                '📅 NOVEMBER 13, 2026 · FRIDAY',
                '📍 SPACE AT ONE AYALA · MAKATI CBD',
              ].map((text, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.68)',
                  border: `1px solid ${COLORS.gold}70`,
                  borderRadius: '50px',
                  padding: '10px 22px',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
                  color: COLORS.champagne,
                  backdropFilter: 'blur(12px)',
                }}>
                  {text}
                </div>
              ))}
            </div>

            {/* Countdown timer */}
            <div style={{ marginBottom: '48px' }}>
              <Countdown {...timeLeft} />
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
              <Link href="/events/popverse/register" className="pv-btn pv-btn-gold">
                ✦ Confirm Attendance
              </Link>
              <a href="#about" className="pv-btn pv-btn-ghost">
                Learn More ↓
              </a>
            </div>

            {/* RSVP deadline reminder */}
            <p style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.05em' }}>
              Confirm by{' '}
              <strong style={{ color: `${COLORS.citrine}AA` }}>October 9, 2026</strong>
            </p>
          </div>

          {/* Bottom fade into page */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '160px', background: 'linear-gradient(to bottom, transparent, #0A0608)', zIndex: 2 }} />
        </section>

        {/* ═══════════════════════════════════════
            OUR WHY — brand story + 3 key messages
        ═══════════════════════════════════════ */}
        <section id="about" style={{ padding: '100px 24px', maxWidth: '960px', margin: '0 auto' }}>

          <p className="pv-section-label">Our Why</p>
          <h2 className="pv-section-h2">
            The Story Behind{' '}
            <span className="pv-iri">POPVERSE</span>
          </h2>

          {/* Brand story card */}
          <div className="pv-card" style={{ padding: '36px 40px', marginBottom: '40px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.88', color: 'rgba(255,255,255,0.82)', textAlign: 'justify' }}>
              Converge has continuously evolved — expanding its reach, innovating its technology, and transforming how people stay connected. Much like a multi-verse, <em>we are</em> made up of different dimensions, operate across diverse communities, and implore the wealth of technologies. Converge acts as the central axis connecting all these distinct "realities" into one powerful network. <strong>"POPVERSE"</strong> honors this <em>journey of growth, acknowledging that while the company has changed over time, its core mission to connect people remains constant.</em>
            </p>
          </div>

          {/* Key brand messages */}
          <span className="pv-label">Key Brand Message</span>

          <div className="pv-card" style={{ padding: '36px 40px' }}>
            {[
              {
                title:    'Vibrancy & Energy',
                subtitle: 'The "Pop"',
                body:     'By grounding the year-end event in the vibrant world of pop culture, the theme creates an inclusive space for employees to showcase talent, express individuality, and bring maximum energy to celebrate the year\'s milestones.',
                color:    COLORS.fuchsia,
              },
              {
                title:    'Evolution & Connection',
                subtitle: 'The "Verse"',
                body:     'Honors Converge\'s continuous transformation over the years. Like a multi-verse of distinct realities, Converge links different departments, regions, and lives into one seamless network.',
                color:    COLORS.cobalt,
              },
              {
                title:    'Unity in Diversity',
                subtitle: '"Different Tune, One Beat"',
                body:     'Acknowledges that while each department operates with its own unique skill set and rhythm ("different tune"), the entire company moves in sync toward shared organizational goals ("one beat").',
                color:    COLORS.lime,
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: '20px', alignItems: 'flex-start',
                  marginBottom: i < 2 ? '28px' : 0,
                  paddingBottom: i < 2 ? '28px' : 0,
                  borderBottom: i < 2 ? '1px solid rgba(197,160,89,0.1)' : 'none',
                }}
              >
                <div className="pv-diamond" style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }} />
                <div>
                  <p style={{ fontWeight: 900, color: 'white', marginBottom: '2px', fontSize: '15px', fontFamily: 'Montserrat, sans-serif' }}>
                    {item.title}
                  </p>
                  <p style={{ color: item.color, fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                    {item.subtitle}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.63)', fontSize: '14px', lineHeight: '1.72' }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            EVENT DETAILS — venue, date, guests
        ═══════════════════════════════════════ */}
        <section style={{ padding: '0 24px 100px', maxWidth: '960px', margin: '0 auto' }}>

          <p className="pv-section-label">Event Details</p>
          <h2 className="pv-section-h2">Everything You Need to Know</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

            {/* Venue */}
            <div className="pv-card" style={{ padding: '32px' }}>
              <span className="pv-label">The Venue</span>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.82', marginBottom: '18px' }}>
                Located on the <strong>5th floor of the One Ayala complex</strong> at the corner of Ayala Avenue and EDSA — SPACE at One Ayala is a premier 2,700 sqm event hub right at the heart of Makati CBD.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.75', marginBottom: '24px' }}>
                Surrounded by hotels, retail, and transport hubs — ideal for both local and international guests. Capacity: up to 1,600 guests.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: '🚗', text: '25-min drive from Reliance, mall parking available' },
                  { icon: '🚇', text: '24/7 public transport · Direct MRT terminal access' },
                ].map(({ icon, text }, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: COLORS.fuchsia, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                      {icon}
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.62)' }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Date + Guests stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Time & Date */}
              <div className="pv-card" style={{ padding: '28px 32px' }}>
                <span className="pv-label">Time & Date</span>
                <p style={{ fontSize: '22px', fontWeight: 900, color: COLORS.citrine, marginBottom: '10px', lineHeight: 1.2, fontFamily: 'Montserrat, sans-serif' }}>
                  Friday, November 13, 2026
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.58)', lineHeight: '1.72' }}>
                  Friday late afternoon — ensuring daily operations and business activities are not disrupted.
                </p>
              </div>

              {/* Guests */}
              <div className="pv-card" style={{ padding: '28px 32px' }}>
                <span className="pv-label">The Guests</span>
                <p style={{ fontSize: '26px', fontWeight: 900, color: 'white', marginBottom: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                  1,550 Participants
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Manila Audience — By Invitation Only
                </p>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { count: '1,509', label: 'Converge', color: COLORS.fuchsia },
                    { count: '41',    label: 'Metroworks', color: COLORS.cobalt },
                  ].map(({ count, label, color }) => (
                    <div key={label} style={{
                      flex: 1,
                      background: `${color}1A`,
                      border: `1px solid ${color}44`,
                      borderRadius: '10px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: '22px', fontWeight: 900, color, fontFamily: 'Montserrat, sans-serif' }}>{count}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.52)', letterSpacing: '0.05em' }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(197,160,89,0.2)', paddingTop: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                    Confirm attendance by:
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: 900, color: COLORS.citrine, fontFamily: 'Montserrat, sans-serif' }}>
                    October 9, 2026
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            RSVP CTA — prism ray decoration
        ═══════════════════════════════════════ */}
        <section style={{ position: 'relative', padding: '100px 24px', textAlign: 'center', overflow: 'hidden' }}>

          {/* Prism ray background decoration */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '700px' }}>
              {[COLORS.fuchsia, COLORS.tangerine, COLORS.cobalt, COLORS.lime, COLORS.lavender, COLORS.citrine, COLORS.deepPlum, COLORS.emerald].map((c, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: '2px', height: '350px',
                  background: `linear-gradient(to top, ${c}, transparent)`,
                  opacity: 0.1,
                  transform: `rotate(${i * 45}deg) translateX(-50%)`,
                  transformOrigin: 'bottom',
                }} />
              ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(123,29,90,0.18) 0%, rgba(27,63,160,0.1) 45%, transparent 70%)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="pv-section-label">Join the Celebration</p>
            <h2 className="pv-section-h2">
              Ready to be part of{' '}
              <span className="pv-iri">POPVERSE</span>?
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.52)', marginBottom: '48px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.72' }}>
              Confirm your attendance and join 1,550 colleagues for Converge's biggest year-end celebration.
            </p>
            <Link href="/events/popverse/register" className="pv-btn pv-btn-gold">
              ✦ Confirm My Attendance
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════ */}
        <footer style={{ borderTop: '1px solid rgba(197,160,89,0.12)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(36px, 7vw, 60px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            <span className="pv-iri">POPVERSE</span>
          </p>
          <p style={{ fontSize: '11px', letterSpacing: '0.22em', color: COLORS.silver, marginBottom: '28px', textTransform: 'uppercase' }}>
            Different Tunes. One Beat.
          </p>
          <div style={{ width: '40px', height: '1px', background: `${COLORS.gold}40`, margin: '0 auto 20px' }} />
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>
            © 2026 Converge ICT Solutions Inc. · SPACE at One Ayala, Makati CBD
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)', marginTop: '6px' }}>
            Powered by <span style={{ color: `${COLORS.gold}80` }}>all41.app</span>
          </p>
        </footer>
      </div>
    </>
  );
}
