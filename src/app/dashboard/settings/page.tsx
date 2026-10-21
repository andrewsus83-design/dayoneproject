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
    <div className="flex-1 flex flex-col">
      <Header
        title="Platform Integrations & Infrastructure"
        subtitle="Configure Cloudflare R2, Resend delivery, custom domains, WhatsApp BYON, and Xendit billing"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-5xl">
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings and integration tokens updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Email Service (Resend) */}
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Resend Email Gateway</h3>
                  <p className="text-xs text-gray-400">High-deliverability dynamic QR passes & calendar invitations</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-xs font-semibold border border-[#00ff88]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Sender Email Address</label>
                <input
                  type="text"
                  disabled
                  value="all41 <invitations@all41.app>"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0b0e17] border border-[#1e263d] text-xs font-mono text-gray-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Fair-Use Email Limit</label>
                <div className="px-3.5 py-2 rounded-xl bg-[#0b0e17] border border-[#1e263d] text-xs text-gray-300 flex items-center justify-between">
                  <span>Included in Flat Tier</span>
                  <strong className="text-[#00ff88]">Max 3 emails / guest</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cloudflare R2 Storage */}
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#dfb76c]/10 text-[#dfb76c]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cloudflare R2 Object Storage</h3>
                  <p className="text-xs text-gray-400">Direct S3-compatible presigned client upload for Photo Wall WebP images</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-xs font-semibold border border-[#00ff88]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                Active CDN
              </span>
            </div>

            <div className="text-xs text-gray-400 bg-[#0b0e17] p-3.5 rounded-xl border border-[#1b2234] flex items-center justify-between">
              <span>Automatic Retention Policy:</span>
              <strong className="text-white">30 Days Post-Event Retention (Auto-Purged)</strong>
            </div>
          </div>

          {/* 3. Custom Domain & Subdomain */}
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Custom Domain & White Label</h3>
                  <p className="text-xs text-gray-400">Bring your own domain or use dedicated branded subdomains</p>
                </div>
              </div>
              <span className="text-xs text-[#dfb76c] font-semibold">White Label Add-on Ready</span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Your Custom Domain (CNAME Pointer)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="e.g. event.yourcompany.com"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0e17] border border-[#1e263d] text-xs font-mono text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-[#192237] border border-[#27375a] text-xs font-semibold text-white hover:bg-[#202c48]"
                  >
                    Verify DNS
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Point a CNAME record from <code className="text-[#00f0ff]">{customDomain}</code> to <code className="text-gray-300">cname.all41.app</code>
                </p>
              </div>
            </div>
          </div>

          {/* 4. WhatsApp Integration (Fonnte BYON) with Risk Disclosure Modal */}
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#ff007f]/10 text-[#ff007f]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">WhatsApp Integration (Fonnte BYON)</h3>
                  <p className="text-xs text-gray-400">Bring Your Own Number gateway with automated delivery pacing</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleFonnte}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fonnteEnabled
                    ? 'bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88]'
                    : 'bg-[#182035] border border-[#26324e] text-gray-400 hover:text-white'
                }`}
              >
                {fonnteEnabled ? 'Enabled' : 'Enable Fonnte'}
              </button>
            </div>

            {fonnteEnabled ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">Fonnte API Token</label>
                  <input
                    type="password"
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="Enter your Fonnte token..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0b0e17] border border-[#1e263d] text-xs font-mono text-white focus:outline-none focus:border-[#ff007f]"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#181422] border border-[#3b2342] text-xs text-gray-300 space-y-1">
                  <div className="font-semibold text-[#ff007f] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>System Rate-Limiting Protection Active</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Messages are automatically spaced with jitter delays by our background worker queue to preserve number reputation in compliance with all41 Terms & Conditions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Fonnte is currently disabled. By enabling it, you can connect your own phone number to dispatch WhatsApp passes.
              </div>
            )}
          </div>

          {/* 5. Payment Gateway (Xendit) */}
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#9d00ff]/10 text-[#9d00ff]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Xendit Billing & Checkout</h3>
                  <p className="text-xs text-gray-400">Indonesian QRIS, Virtual Accounts (BCA, Mandiri, BRI, BNI), & Credit Cards</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold border border-amber-400/30">
                Sandbox Mode Active
              </span>
            </div>

            <div className="text-xs text-gray-400 bg-[#0b0e17] p-3.5 rounded-xl border border-[#1b2234] flex items-center justify-between">
              <span>Merchant Environment:</span>
              <strong className="text-white">Deferred for Production Launch</strong>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all shadow-md active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>

        {/* Fonnte Risk Disclosure Modal */}
        {isRiskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121624] border border-[#3b2342] rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl space-y-5">
              <button
                type="button"
                onClick={() => setIsRiskModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#ff007f]/20 text-[#ff007f]">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    WhatsApp BYON Risk Disclosure
                  </h3>
                  <p className="text-xs text-gray-400">Important terms regarding third-party WhatsApp numbers</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-300 leading-relaxed bg-[#0c0e17] p-4 rounded-2xl border border-[#1e263d]">
                <p>
                  <strong>1. Dedicated Event Number:</strong> We strongly advise using a dedicated event phone number instead of your primary personal or core business number.
                </p>
                <p>
                  <strong>2. System Rate Limiting & Pacing:</strong> To safeguard your number from automated WhatsApp anti-spam bans, all41 enforces background rate-limiting and sequential message delays automatically. You acknowledge that burst messages will be queued.
                </p>
                <p>
                  <strong>3. Terms Acceptance:</strong> By proceeding, you accept full responsibility for the number provided and agree that all41 is not liable for carrier or platform number suspensions resulting from unsolicited recipient reporting.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#182035] text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAcceptTerms}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#ff007f] to-[#dfb76c] hover:brightness-110 shadow-md"
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
