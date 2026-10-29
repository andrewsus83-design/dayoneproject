# CLAUDE.MD — ALL41.APP AI ENGINEERING CONSTITUTION

> **Master Reference:** For the complete 20-page architectural, product, pricing, database, and design blueprint, always reference [`ALL41_MASTER_BLUEPRINT.md`](./ALL41_MASTER_BLUEPRINT.md) in the root of this repository.

## 1. Project Identity & Commands
- **Project:** **all41.app** — Luxury All-in-One Event Experience Platform (Corporate Summits & Luxury Weddings).
- **Root Path:** `/Users/drew83/Projects/all41`
- **Dev Server:** `pnpm dev` (Runs Next.js 16.4.2 Turbopack on `http://localhost:3000`)
- **Typecheck (MANDATORY before finishing any task):** `pnpm tsc --noEmit`
- **Production Build Verification:** `pnpm build`
- **Next.js 16 Convention:**
  - Use `src/proxy.ts` (NOT `middleware.ts`) for multi-tenant `<slug>.all41.app` and BYOD custom domain routing.
  - In dynamic routes (`[id]`, `[slug]`), `params` is a `Promise<{ id: string }>`—unwrap it with `React.use(params)` inside a `<Suspense>` boundary.
  - For multi-tab dashboard views, maintain local React state (`activeTab`) alongside `router.push(?tab=...)` so tab switching is instantaneous (`0ms` lag).

## 2. Non-Negotiable Brand Design System Rules
NEVER use generic Tailwind blue/indigo/slate palettes (`bg-blue-600`, `bg-indigo-500`, `bg-slate-900`, `#0f1320`) or unapproved gold hexes (`#dfb76c`).
ALWAYS use the official `@theme` tokens defined in `src/app/globals.css`:
- **Backgrounds:**
  - `bg-premium-black` (`#09090B`) — Root canvas & table headers
  - `bg-premium-charcoal` (`#18181B`) — Primary bento cards, modals, sidebar cards
  - `bg-premium-surfaceDark` (`#121214`) — Form inputs, nested inner cards, secondary buttons
- **Borders:**
  - `border-premium-borderDark` (`#27272A`) — Default 1px structural borders
  - `border-premium-gold/50` — Active / highlighted card borders
- **Accents:**
  - `bg-premium-gold` / `text-premium-gold` (`#C5A059`) — Primary CTA buttons, active pills, VIP badges
  - `hover:bg-premium-goldHover` (`#B38E46`) — Gold button hover
  - `text-premium-neon` / `bg-premium-neon` (`#00F0FF`) — Subdomain links, game buzzers, camera triggers
  - `text-premium-danger` (`#FF3366`) — Risk disclosures, wedding heart accents, error states
  - `text-premium-success` (`#00E676`) — Gate Active pulse dots, Checked-in verified badges
- **Typography:**
  - Headings MUST use `font-display` (`Outfit`, tracking `-0.02em`).
  - Body copy uses `font-sans` (`Manrope`).
  - Technical tokens, QR codes, and subdomain URLs use `font-mono`.
- **Interactive Tactility & Utilities:**
  - Every button, clickable card, and tab pill MUST include `scale-on-click`.
  - Primary Gold CTA buttons use: `bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click`.
  - Digital QR passes use `.ticket-cutout`. Floating mobile nav bars use `.glass-panel`. QR scanners use `.animate-scan-line`.
- **Signature Brand Mark:**
  - Always use the circular gold `41` badge:
    ```tsx
    <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">41</div>
    ```
- **Card Radii:** Major containers use `rounded-[2rem]` or `rounded-[2.5rem]`. Inputs/buttons use `rounded-xl` or `rounded-2xl`.

## 3. Core Product & Business Logic Invariants
1. **Dual Theme Engine (`src/lib/theme/defaultThemes.ts`):**
   - Events are strictly partitioned into `corporate` (`CORPORATE_THEMES`, `corporate_keynote` schema with Keynote Speakers & Sponsors) and `wedding` (`WEDDING_THEMES`, `wedding_romance` schema with Love Story, Dress Code Swatches & Digital Angpao QRIS/Bank transfer).
2. **Typeform Creation -> 10-Menu Dashboard:**
   - `/dashboard/events/new` is a 6-step Typeform-style creation studio (`<60s` onboarding).
   - All modules are configured post-creation inside `/dashboard/events/[id]` across the **10 menus**: `Overview` (`Event Information`, `Landing Page Builder`, `Invitation Form Builder`), `Guests`, `Registrations`, `Broadcast`, `Games`, `Door Prize`, `Photos`, `Insights`, `LIVE` (active URL launchers opening in new tabs), and `Setting`.
3. **Check-in Gated Interactivity:**
   - Day-of modules (Photo Wall uploads, Live Trivia Blitz, 3D Door Prize Raffle) strictly require a valid guest `qr_code_token` with `is_checked_in === true`.
4. **Media Quotas & Pinterest Masonry Wall:**
   - Client-side WebP compression `<= 2MB` for images, `<= 20MB (720p)` for video, max `10 uploads/guest`, optional admin caption toggle (`<= 300 chars`), Pinterest multi-column masonry layout (`PinterestMasonryPhotoWall.tsx`), Download & Social Share buttons, and 30-day Cloudflare R2 retention.
5. **Ballroom Stage LED Lock (`StageLedEditor.tsx` & `/events/[slug]/stage`):**
   - Only the 7 official system modules (`welcome`, `photowall`, `quiz`, `raffle`, `rundown`, `menu`, `sponsors`) are permitted on the stage display.
6. **Invisible WhatsApp Rate Limiting & Email Builder:**
   - Resend powers the HTML Email Builder (`VIP Invitation`, `RSVP Pass`, `24h Reminder`, `Thank You`) with inline QR Pass PNGs and `.ics` calendar attachments.
   - Fonnte BYON requires mandatory Risk Disclosure consent. Anti-ban rate limiting (`5–15s` randomized pacing) is handled 100% automatically by the backend and disclosed in `/terms`—never expose rate-limit sliders to end users.
7. **Strict Priority Sequencing (Core Platform First — Pricing & Payments Last):**
   - Always prioritize and perfect the **Core Platform features** (`Luma/Typeform Event Builder`, `Landing Page Builder`, `Typeform RSVP Form`, `Email/WA Reminder Builder`, `Cryptographic QR Generator & Offline Gate Reader`, `Pinterest Photo Wall`, `7-Module Stage LED`, `Live Trivia Blitz`, and `3D Door Prize Raffles`).
   - **Pricing tiers, EO/WO partner commissions, and payment gateway integrations are strictly deferred to the final phase.**
