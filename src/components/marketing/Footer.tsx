'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#1a2133] bg-[#08090e] py-16 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[2px]">
                <div className="w-full h-full bg-[#0b0d13] rounded-[6px] flex items-center justify-center font-black text-sm text-white">
                  <span className="text-[#00f0ff]">4</span>
                  <span className="text-[#dfb76c]">1</span>
                </div>
              </div>
              <span className="text-lg font-extrabold text-white">
                all<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f]">41</span>.app
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              The premier all-in-one event experience platform in Southeast Asia. Engineered for corporate summits, galas, and luxury weddings.
            </p>
            <div className="text-xs text-gray-500 font-mono">
              Inquiries: <a href="mailto:info@all41.app" className="text-gray-300 hover:text-[#00f0ff]">info@all41.app</a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200 mb-4 font-mono">
              Event Modules
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Landing Page Builder</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Digital RSVP & Invitations</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">QR Gate Scanner</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Live WebP Photo Wall</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Door Prize & Raffle Machine</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Interactive Kahoot Trivia</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200 mb-4 font-mono">
              Platform & Pricing
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#pricing" className="hover:text-white transition-colors">Starter (≤50 pax)</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Plus (≤300 pax)</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pro (≤600 pax)</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Business & Scale</a></li>
              <li><a href="#partners" className="hover:text-[#ff007f] transition-colors">EO/WO Cashback (Up to 18%)</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">White Label Add-on</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-200 mb-4 font-mono">
              Legal & Disclosures
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><span className="text-gray-500">WhatsApp BYON Fair-Use Policy</span></li>
              <li><span className="text-gray-500">Cloudflare 30-day Retention</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#161a29] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>
            &copy; 2026 all41.app. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
              Cloudflare CDN & Supabase Global Edge
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
