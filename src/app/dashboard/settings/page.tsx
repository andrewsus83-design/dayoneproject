'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import {
  Settings,
  Mail,
  HardDrive,
  Globe,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  ExternalLink,
  Save,
  Check,
  Camera,
} from 'lucide-react';

export default function IntegrationsSettingsPage() {
  // WhatsApp Fonnte Settings State
  const [fonnteEnabled, setFonnteEnabled] = useState(false);
  const [fonnteToken, setFonnteToken] = useState('');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [acceptedRiskTerms, setAcceptedRiskTerms] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom Domain State
  const [customDomain, setCustomDomain] = useState('summit.techunite-apac.com');
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  const handleToggleFonnte = () => {
    if (!fonnteEnabled && !acceptedRiskTerms) {
      setIsRiskModalOpen(true);
    } else {
      setFonnteEnabled(!fonnteEnabled);
    }
  };

  const handleAcceptTerms = () => {
    setAcceptedRiskTerms(true);
    setFonnteEnabled(true);
    setIsRiskModalOpen(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col font-sans select-none">
      <Header
        title="Platform Integrations & Infrastructure"
        subtitle="Configure Cloudflare R2, Resend delivery, custom domains, WhatsApp BYON, and Xendit billing"
        actionText="Back to Operations"
        actionHref="/dashboard"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-5xl">
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-gold/40 text-premium-gold text-sm font-semibold flex items-center gap-3 shadow-gold">
            <CheckCircle2 className="w-5 h-5 text-premium-gold" />
            <span>Settings and integration tokens updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* 1. Email Service (Resend) */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 text-premium-gold flex items-center justify-center shadow-gold">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">Resend Email Gateway</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">High-deliverability dynamic QR passes & calendar invitations</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-premium-success/20 text-premium-success text-xs font-bold uppercase border border-premium-success/30">
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676]" />
                Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Sender Email Address</label>
                <input
                  type="text"
                  disabled
                  value="all41 <invitations@all41.app>"
                  className="w-full px-5 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-zinc-300"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Fair-Use Email Limit</label>
                <div className="px-5 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-300 flex items-center justify-between">
                  <span>Included in Flat Tier</span>
                  <strong className="text-premium-success font-display">Max 3 emails / guest</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cloudflare R2 Storage */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 text-premium-gold flex items-center justify-center shadow-gold">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">Cloudflare R2 Object Storage</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Direct S3-compatible presigned client upload for Photo Wall WebP images</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-premium-success/20 text-premium-success text-xs font-bold uppercase border border-premium-success/30">
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676]" />
                Active CDN
              </span>
            </div>

            <div className="text-xs text-zinc-400 bg-premium-surfaceDark p-5 rounded-2xl border border-premium-borderDark flex items-center justify-between">
              <span>Automatic Retention Policy:</span>
              <strong className="text-white font-mono">30 Days Post-Event Retention (Auto-Purged)</strong>
            </div>
          </div>

          {/* 3. Custom Domain & Subdomain */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-neon/15 text-premium-neon flex items-center justify-center glow-neon">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">Client Subdomains & Custom White Label</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">All events get free high-speed SSL subdomains: &lt;clientname&gt;.all41.app</p>
                </div>
              </div>
              <span className="text-xs text-premium-success font-bold uppercase bg-premium-success/20 px-3.5 py-1.5 rounded-full border border-premium-success/30">
                Subdomain Active
              </span>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 block">Default Event Subdomain</span>
                  <div className="text-sm font-mono font-bold text-premium-neon mt-1">
                    https://&lt;clientname&gt;.all41.app
                  </div>
                </div>
                <div className="text-xs text-zinc-400 max-w-sm font-light">
                  Automatically routed via Edge Proxy to guest portal, photo wall, buzzer, and stage displays.
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Optional Custom Domain (White Label CNAME)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="e.g. event.yourcompany.com"
                    className="flex-1 px-5 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-mono text-white focus:border-premium-gold outline-none"
                  />
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-2xl bg-premium-surfaceDark border border-zinc-700 hover:border-premium-gold text-xs font-bold text-white transition-colors scale-on-click"
                  >
                    Verify DNS
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2 font-mono">
                  Point a CNAME record from <code className="text-premium-neon">{customDomain}</code> to <code className="text-zinc-300">cname.all41.app</code>
                </p>
              </div>
            </div>
          </div>

          {/* 4. Photo Wall Captions & Media Upload Constraints */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 text-premium-gold flex items-center justify-center shadow-gold">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">Live Photo Wall & Guest Captions Policy</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Control guest captioning permissions and enforced media limits</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCaptionsEnabled(!captionsEnabled)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  captionsEnabled
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'
                }`}
              >
                {captionsEnabled ? 'Captions: ON (300 Chars)' : 'Captions: OFF (Media Only)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block mb-1">Image Compression</span>
                <strong className="text-white text-base font-display">Max 2MB (WebP)</strong>
                <p className="text-[11px] text-zinc-400 mt-1 font-light">Auto-converted via browser canvas pipeline</p>
              </div>

              <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block mb-1">Video Stream</span>
                <strong className="text-white text-base font-display">Max 20MB (720p HD)</strong>
                <p className="text-[11px] text-zinc-400 mt-1 font-light">Short video clips for stage wall broadcast</p>
              </div>

              <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block mb-1">Display Layout</span>
                <strong className="text-premium-gold text-base font-display">Pinterest Masonry</strong>
                <p className="text-[11px] text-zinc-400 mt-1 font-light">Staggered columns with reaction hearts</p>
              </div>
            </div>
          </div>

          {/* 5. WhatsApp Integration (Fonnte BYON) with Risk Disclosure Modal */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-neon/15 text-premium-neon flex items-center justify-center glow-neon">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">WhatsApp Integration (Fonnte BYON)</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Bring Your Own Number gateway with automated delivery pacing</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleFonnte}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                  fonnteEnabled
                    ? 'bg-premium-neon text-black shadow-neon'
                    : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'
                }`}
              >
                {fonnteEnabled ? 'Enabled' : 'Enable Fonnte'}
              </button>
            </div>

            {fonnteEnabled ? (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-2">Fonnte API Token</label>
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="Enter your Fonnte token..."
                    className="w-full px-5 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-mono text-white focus:border-premium-gold outline-none"
                  />
                </div>

                <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-gold/30 text-xs text-zinc-300 space-y-1">
                  <div className="font-bold text-premium-gold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>System Rate-Limiting Protection Active</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Messages are automatically spaced with jitter delays by our background worker queue to preserve number reputation in compliance with all41 Terms & Conditions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 font-light">
                Fonnte is currently disabled. By enabling it, you can connect your own phone number to dispatch WhatsApp passes.
              </div>
            )}
          </div>

          {/* 6. Payment Gateway (Xendit) */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 text-premium-gold flex items-center justify-center shadow-gold">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">Xendit Billing & Checkout</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Indonesian QRIS, Virtual Accounts (BCA, Mandiri, BRI, BNI), & Credit Cards</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-premium-gold/20 text-premium-gold text-xs font-bold uppercase border border-premium-gold/30">
                Sandbox Mode Active
              </span>
            </div>

            <div className="text-xs text-zinc-400 bg-premium-surfaceDark p-5 rounded-2xl border border-premium-borderDark flex items-center justify-between">
              <span>Merchant Environment:</span>
              <strong className="text-white font-mono">Deferred for Production Launch</strong>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm text-black bg-premium-gold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>

        {/* Fonnte Risk Disclosure Modal */}
        {isRiskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-premium-charcoal border border-premium-danger/30 rounded-[2.5rem] p-8 max-w-lg w-full relative shadow-danger space-y-6">
              <button
                type="button"
                onClick={() => setIsRiskModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white scale-on-click"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-premium-danger/20 text-premium-danger flex items-center justify-center border border-premium-danger/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-white">
                    WhatsApp BYON Risk Disclosure
                  </h3>
                  <p className="text-xs text-zinc-400">Important terms regarding third-party WhatsApp numbers</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed bg-premium-surfaceDark p-6 rounded-2xl border border-premium-borderDark font-light">
                <p>
                  <strong className="text-white font-bold">1. Dedicated Event Number:</strong> We strongly advise using a dedicated event phone number instead of your primary personal or core business number.
                </p>
                <p>
                  <strong className="text-white font-bold">2. System Rate Limiting & Pacing:</strong> To safeguard your number from automated WhatsApp anti-spam bans, all41 enforces background rate-limiting and sequential message delays automatically. You acknowledge that burst messages will be queued.
                </p>
                <p>
                  <strong className="text-white font-bold">3. Terms Acceptance:</strong> By proceeding, you accept full responsibility for the number provided and agree that all41 is not liable for carrier or platform number suspensions resulting from unsolicited recipient reporting.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-6 py-3.5 rounded-2xl bg-transparent border border-zinc-700 text-xs font-bold text-white scale-on-click"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAcceptTerms}
                  className="px-6 py-3.5 rounded-2xl font-bold text-xs text-black bg-premium-gold hover:bg-premium-goldHover shadow-gold scale-on-click"
                >
                  I Understand & Accept Terms
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
