'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const HERO_BG =
  'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793299266486_f11f928f_1793299266529_107e55ae.png';

const GOLD    = '#C5A059';
const CITRINE = '#FFD700';
const SILVER  = '#C8C8D0';
const FUCHSIA = '#CC0066';
const COBALT  = '#0099DD';

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = 'PV26-';
  for (let i = 0; i < 8; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

type FormStep = 1 | 2 | 3;

export default function POPVERSERegisterPage() {
  const [step, setStep] = useState<FormStep>(1);
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    employeeId: '',
    plusOne: false,
    plusOneName: '',
    dietary: '',
    accessibility: '',
    tablePreference: '',
  });

  useEffect(() => { setToken(generateToken()); }, []);

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };

  const DEPARTMENTS = [
    'Technology', 'Sales', 'Marketing', 'Finance', 'HR', 'Legal',
    'Operations', 'Customer Experience', 'Product', 'Executive',
  ];

  const DIETARY = ['No restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Gluten-free', 'Other'];

  // ── Confirmation screen ──
  if (submitted) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
          .pv { font-family: 'Montserrat', sans-serif; }
          .pv-iri {
            background: linear-gradient(135deg, #FFD700 0%, #FF8C00 10%, #CC0066 22%,
              #7B1D5A 34%, #1B3FA0 46%, #0099DD 58%, #00A36C 70%, #CC88FF 82%, #FFD700 94%);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: pv-iri 9s ease infinite;
          }
          @keyframes pv-iri {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .ticket-shine {
            background: linear-gradient(135deg, rgba(197,160,89,0.06) 0%, transparent 50%, rgba(197,160,89,0.04) 100%);
          }
        `}</style>
        <div className="pv" style={{ minHeight: '100vh', background: '#0A0608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
          {/* BG */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <img src={HERO_BG} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #0A0608 0%, rgba(10,6,8,0.65) 50%, #0A0608 100%)' }} />
          </div>

          {/* Ticket card */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', width: '100%' }}>
            {/* Checkmark */}
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #C5A059, #E8C470)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 0 40px rgba(197,160,89,0.5)' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18L15 25L28 11" stroke="#0A0608" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', letterSpacing: '0.28em', color: GOLD, marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
              Attendance Confirmed
            </p>
            <h1 style={{ textAlign: 'center', fontSize: 'clamp(42px, 9vw, 72px)', fontWeight: 900, marginBottom: '8px', lineHeight: 0.95, letterSpacing: '-0.03em' }}>
              <span className="pv-iri">P★PVERSE</span>
            </h1>
            <p style={{ textAlign: 'center', fontSize: '12px', letterSpacing: '0.22em', color: SILVER, marginBottom: '36px', textTransform: 'uppercase' }}>
              Different Tunes. One Beat.
            </p>

            {/* Digital Pass card */}
            <div className="ticket-shine" style={{
              background: 'rgba(8,4,6,0.92)',
              border: `1.5px solid ${GOLD}80`,
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: `0 0 60px rgba(197,160,89,0.15), 0 20px 60px rgba(0,0,0,0.5)`,
            }}>
              {/* Gold header stripe */}
              <div style={{ height: '6px', background: `linear-gradient(to right, #CC0066, #FF8C00, #FFD700, #00A36C, #0099DD, #CC88FF)` }} />

              <div style={{ padding: '28px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: '4px', textTransform: 'uppercase' }}>GUEST</p>
                    <p style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>{form.firstName} {form.lastName}</p>
                    {form.plusOne && <p style={{ fontSize: '12px', color: COBALT, marginTop: '2px' }}>+ {form.plusOneName || '1 Guest'}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: '4px', textTransform: 'uppercase' }}>DEPT</p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>{form.department}</p>
                  </div>
                </div>

                {/* Dashed divider */}
                <div style={{ borderTop: '1.5px dashed rgba(197,160,89,0.25)', margin: '0 -32px 20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-14px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#0A0608', border: '1px solid rgba(197,160,89,0.2)' }} />
                  <div style={{ position: 'absolute', right: '-14px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#0A0608', border: '1px solid rgba(197,160,89,0.2)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'DATE', value: 'Nov 13, 2026' },
                    { label: 'VENUE', value: 'Space@OneAyala' },
                    { label: 'DOORS', value: '6:00 PM' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginBottom: '3px', textTransform: 'uppercase' }}>{label}</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* QR placeholder */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', width: '120px' }}>
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div key={i} style={{ aspectRatio: '1', borderRadius: '2px', background: Math.random() > 0.5 ? '#0A0608' : 'white' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0A0608', fontWeight: 700, letterSpacing: '0.1em' }}>{token}</p>
                </div>

                <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '16px', lineHeight: '1.7' }}>
                  Present this pass at the entrance on the day of the event.<br />
                  A copy will be sent to <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{form.email}</strong>
                </p>
              </div>

              {/* Prismatic bottom bar */}
              <div style={{ height: '4px', background: 'linear-gradient(to right, #CC88FF, #1B3FA0, #00A36C, #FFD700, #CC0066, #7B1D5A)' }} />
            </div>

            <div style={{ marginTop: '28px', textAlign: 'center' }}>
              <Link href="/events/popverse" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', textDecoration: 'none', letterSpacing: '0.06em' }}>
                ← Back to POPVERSE
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Form screen ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        .pv { font-family: 'Montserrat', sans-serif; }
        .pv-iri {
          background: linear-gradient(135deg, #FFD700 0%, #FF8C00 10%, #CC0066 22%,
            #7B1D5A 34%, #1B3FA0 46%, #0099DD 58%, #00A36C 70%, #CC88FF 82%, #FFD700 94%);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pv-iri 9s ease infinite;
        }
        @keyframes pv-iri {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pv-input {
          width: 100%;
          background: rgba(8, 4, 6, 0.85);
          border: 1px solid rgba(197, 160, 89, 0.22);
          border-radius: 10px;
          padding: 13px 16px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          color: white;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        .pv-input:focus { border-color: rgba(197, 160, 89, 0.7); }
        .pv-input::placeholder { color: rgba(255, 255, 255, 0.28); }
        .pv-input option { background: #18181B; }
        .pv-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 8px;
        }
        .pv-btn-gold {
          width: 100%;
          padding: 16px 24px;
          border-radius: 50px;
          border: none;
          background: linear-gradient(135deg, #C5A059, #E8C470, #B89048);
          color: #0A0608;
          font-family: 'Montserrat', sans-serif;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 0 30px rgba(197,160,89,0.3);
        }
        .pv-btn-gold:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 50px rgba(197,160,89,0.55);
        }
        .pv-btn-gold:disabled { opacity: 0.55; cursor: not-allowed; }
        .pv-step { display: flex; align-items: center; gap: 8px; }
        .pv-step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 900;
          flex-shrink: 0;
        }
        .pv-checkbox {
          width: 20px; height: 20px;
          border-radius: 6px;
          border: 1.5px solid rgba(197,160,89,0.4);
          background: rgba(8,4,6,0.85);
          cursor: pointer;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
      `}</style>

      <div className="pv" style={{ minHeight: '100vh', background: '#0A0608', color: 'white', position: 'relative', overflow: 'hidden' }}>
        {/* BG dim */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={HERO_BG} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,8,0.72)' }} />
        </div>

        {/* CSS stained-glass side panels */}
        {[
          { side: 'left', colors: ['#7B1D5A','#CC0066','#FF8C00','#0099DD','#1B3FA0','#00A36C','#39FF14','#CC88FF','#FFD700','#CC0066'] },
          { side: 'right', colors: ['#1B3FA0','#CC88FF','#39FF14','#FF8C00','#7B1D5A','#CC0066','#FFD700','#0099DD','#00A36C','#CC88FF'] },
        ].map(({ side, colors }) => (
          <div key={side} style={{
            position: 'absolute',
            [side]: 0, top: 0, bottom: 0,
            width: 'clamp(32px, 6vw, 80px)',
            background: `repeating-linear-gradient(to bottom, ${colors.map((c,i) => `${c} ${(i*10).toFixed(0)}%, ${c} ${((i+1)*10).toFixed(0)}%`).join(', ')})`,
            opacity: 0.45,
            maskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.8), transparent)`,
            WebkitMaskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, rgba(0,0,0,0.8), transparent)`,
            zIndex: 1,
          }} />
        ))}

        {/* Main content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px', margin: '0 auto', padding: '60px 24px 80px' }}>

          {/* Back + logo row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
            <Link href="/events/popverse" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', letterSpacing: '0.06em' }}>
              ← POPVERSE
            </Link>
            <div style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              <span className="pv-iri">P★PVERSE</span>
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.28em', color: GOLD, fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
              Confirm Attendance
            </p>
            <h1 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '10px' }}>
              November 13, 2026
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              SPACE at One Ayala · Makati CBD · Doors open 6:00 PM
            </p>
          </div>

          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
            {([1, 2, 3] as FormStep[]).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div style={{ flex: 1, height: '1px', background: step > s - 1 ? `linear-gradient(to right, ${GOLD}80, ${GOLD}40)` : 'rgba(255,255,255,0.1)' }} />
                )}
                <div className="pv-step-dot" style={{
                  background: step === s ? GOLD : step > s ? 'rgba(197,160,89,0.3)' : 'rgba(255,255,255,0.06)',
                  color: step === s ? '#0A0608' : step > s ? GOLD : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${step >= s ? `${GOLD}80` : 'rgba(255,255,255,0.1)'}`,
                }}>
                  {step > s ? '✓' : s}
                </div>
              </React.Fragment>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px', letterSpacing: '0.06em' }}>
            Step {step} of 3 — {['Your Details', 'Plus-One & Preferences', 'Review & Confirm'][step - 1]}
          </p>

          {/* Form card */}
          <div style={{ background: 'rgba(8,4,6,0.88)', border: `1px solid rgba(197,160,89,0.18)`, borderRadius: '20px', padding: '32px', backdropFilter: 'blur(20px)', marginBottom: '24px' }}>

            {/* STEP 1 */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="pv-label">First Name *</label>
                    <input className="pv-input" placeholder="Juan" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                  </div>
                  <div>
                    <label className="pv-label">Last Name *</label>
                    <input className="pv-input" placeholder="dela Cruz" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="pv-label">Work Email *</label>
                  <input className="pv-input" type="email" placeholder="juan@converge.com.ph" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="pv-label">Department *</label>
                  <select className="pv-input" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Select your department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pv-label">Employee ID (optional)</label>
                  <input className="pv-input" placeholder="e.g. CVG-12345" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Plus-one toggle */}
                <div>
                  <label className="pv-label">Are you bringing a guest?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[false, true].map(val => (
                      <button
                        key={String(val)}
                        onClick={() => set('plusOne', val)}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${form.plusOne === val ? `${FUCHSIA}80` : 'rgba(197,160,89,0.2)'}`,
                          background: form.plusOne === val ? `rgba(204,0,102,0.12)` : 'rgba(8,4,6,0.6)',
                          color: form.plusOne === val ? FUCHSIA : 'rgba(255,255,255,0.6)',
                          fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                        }}
                      >
                        {val ? 'Yes, +1 Guest' : 'Just me'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.plusOne && (
                  <div>
                    <label className="pv-label">Guest's Full Name *</label>
                    <input className="pv-input" placeholder="Guest name" value={form.plusOneName} onChange={e => set('plusOneName', e.target.value)} />
                  </div>
                )}

                <div>
                  <label className="pv-label">Dietary Preference</label>
                  <select className="pv-input" value={form.dietary} onChange={e => set('dietary', e.target.value)}>
                    <option value="">Select preference</option>
                    {DIETARY.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="pv-label">Accessibility / Special Needs</label>
                  <input className="pv-input" placeholder="e.g. wheelchair access, hearing loop" value={form.accessibility} onChange={e => set('accessibility', e.target.value)} />
                </div>

                <div>
                  <label className="pv-label">Table Preference (optional)</label>
                  <input className="pv-input" placeholder="e.g. with Marketing team" value={form.tablePreference} onChange={e => set('tablePreference', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3 — Review */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>Please confirm your details:</p>

                {[
                  { label: 'Name', value: `${form.firstName} ${form.lastName}` },
                  { label: 'Email', value: form.email },
                  { label: 'Department', value: form.department },
                  { label: 'Guest', value: form.plusOne ? `+1 (${form.plusOneName || 'TBD'})` : 'None' },
                  { label: 'Dietary', value: form.dietary || 'No restrictions' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(197,160,89,0.08)' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{value}</span>
                  </div>
                ))}

                <div style={{ marginTop: '8px', background: 'rgba(197,160,89,0.06)', border: '1px solid rgba(197,160,89,0.18)', borderRadius: '10px', padding: '14px 16px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                    By confirming, you agree to attend POPVERSE Year-End Party 2026 on November 13 at SPACE at One Ayala. Your digital pass will be sent to your registered email.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(s => (s - 1) as FormStep)}
                style={{ padding: '16px 28px', borderRadius: '50px', border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'white', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            <button
              className="pv-btn-gold"
              style={{ flex: 1 }}
              disabled={
                submitting ||
                (step === 1 && (!form.firstName || !form.lastName || !form.email || !form.department)) ||
                (step === 2 && form.plusOne && !form.plusOneName)
              }
              onClick={() => {
                if (step < 3) setStep(s => (s + 1) as FormStep);
                else handleSubmit();
              }}
            >
              {submitting
                ? 'Confirming...'
                : step < 3
                  ? `Continue →`
                  : '✦ Confirm My Attendance'}
            </button>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '28px', lineHeight: 1.8 }}>
            Deadline: <strong style={{ color: `${CITRINE}80` }}>October 9, 2026</strong><br />
            For inquiries, contact your HR Business Partner.
          </p>
        </div>
      </div>
    </>
  );
}
