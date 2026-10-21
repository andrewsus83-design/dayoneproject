-- ==============================================================================
-- all41.app - Master Database Schema (Supabase PostgreSQL)
-- Multi-tenant architecture for Events, Guest Lists, Interactive Games,
-- Photo Wall, Raffle Draws, and Referral Cashback Ledger.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (EO / WO / Companies / Personal Accounts)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL, -- references auth.users(id)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- 3. Events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- subdomain: <slug>.all41.app
    custom_domain TEXT UNIQUE, -- e.g. event.clientbrand.com (via White Label add-on)
    event_type TEXT NOT NULL DEFAULT 'corporate' CHECK (event_type IN ('corporate', 'wedding', 'conference', 'concert', 'other')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location_name TEXT,
    location_address TEXT,
    location_maps_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    
    -- Pricing Tier & Limits
    package_tier TEXT NOT NULL DEFAULT 'free' CHECK (package_tier IN ('free', 'starter', 'plus', 'pro', 'business', 'scale', 'enterprise')),
    guest_limit INT NOT NULL DEFAULT 5, -- 5 (free), 50, 300, 600, 1500, 2500
    extra_guests_purchased INT NOT NULL DEFAULT 0, -- multiples of 10
    is_white_label BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Design & Visual Theme Configuration
    theme_config JSONB NOT NULL DEFAULT '{
        "preset": "neon_dark_gold",
        "primaryColor": "#00f0ff",
        "secondaryColor": "#dfb76c",
        "accentColor": "#ff007f",
        "backgroundColor": "#0b0d13",
        "textColor": "#f8fafc",
        "fontFamily": "Inter",
        "bannerUrl": null,
        "logoUrl": null
    }'::jsonb,
    
    -- Settings (landing page blocks, schedule, RSVP options, Fonnte & Xendit configs)
    settings JSONB NOT NULL DEFAULT '{
        "enablePhotoWall": true,
        "enableRaffle": true,
        "enableGames": true,
        "enableRsvp": true,
        "requireCheckInForPhotoWall": true,
        "requireCheckInForGames": true,
        "requireCheckInForRaffle": true,
        "maxPhotosPerGuest": 10,
        "maxEmailsPerGuest": 3
    }'::jsonb,
    
    referral_code_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Guests (Single Source of Truth for Attendance, In-Event Access, & Quotas)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    category TEXT DEFAULT 'Regular', -- VIP, Family, Team, Partner, etc.
    table_number TEXT,
    plus_one_count INT DEFAULT 0,
    
    -- RSVP Status
    rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
    rsvp_notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Attendance / QR Check-in
    qr_code_token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    is_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID, -- staff member who scanned
    
    -- Fair-use tracking
    photos_uploaded_count INT NOT NULL DEFAULT 0 CHECK (photos_uploaded_count <= 10),
    emails_sent_count INT NOT NULL DEFAULT 0 CHECK (emails_sent_count <= 3),
    whatsapp_sent_count INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Photo Wall Uploads (Stored on Cloudflare R2 with 30-day lifecycle)
CREATE TABLE IF NOT EXISTS public.photo_wall_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- R2 WebP public URL
    thumbnail_url TEXT,
    filter_used TEXT,
    frame_used TEXT,
    caption TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE, -- moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Door Prize / Raffle Draws
CREATE TABLE IF NOT EXISTS public.raffle_draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    prize_name TEXT NOT NULL,
    prize_tier INT DEFAULT 1,
    style TEXT NOT NULL DEFAULT 'wheel' CHECK (style IN ('wheel', 'claw', 'slot', 'gacha', 'scratch', 'lotto')),
    winner_guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    drawn_at TIMESTAMPTZ DEFAULT NOW(),
    audit_notes TEXT
);

-- 7. Interactive Games (Live Quiz, Scavenger Hunt, Couple Trivia, Bingo)
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL CHECK (game_type IN ('live_quiz', 'scavenger_hunt', 'trivia', 'bingo')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- questions, options, point rules
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (session_id, guest_id)
);

-- 8. Email Templates & Send Logs (Resend Integration)
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL CHECK (template_type IN ('invitation', 'reminder', 'thank_you', 'custom')),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    resend_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Referral Partners & Cashback Ledger
CREATE TABLE IF NOT EXISTS public.referral_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'BALIWO2026'
    agency_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_holder TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    guest_count INT NOT NULL,
    package_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    extra_guest_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cashback_percentage NUMERIC(5, 2) NOT NULL, -- 10, 12, 15, or 18%
    cashback_amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'approved', 'paid')),
    calculated_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payout_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (partner_id, event_id)
);

-- Indexes for lightning fast lookups & real-time subscriptions
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_custom_domain ON public.events(custom_domain);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_qr_token ON public.guests(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_photo_wall_event_id ON public.photo_wall_uploads(event_id);
CREATE INDEX IF NOT EXISTS idx_raffle_event_id ON public.raffle_draws(event_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_event_id ON public.game_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_partner_id ON public.referral_ledger(partner_id);

-- Enable Supabase Realtime publication on interactive tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_wall_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_draws;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;
