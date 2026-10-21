import { PackageTier } from './types';

export interface PricingPlan {
  tier: PackageTier;
  name: string;
  badge?: string;
  basePrice: number; // in IDR
  maxGuests: number;
  extraGuestPricePerUnit: number; // in IDR per guest (billed in multiples of 10)
  canAddExtraGuests: boolean;
  features: string[];
  popular?: boolean;
  whatsappFonntePrice: number;
  whatsappOfficialPrice: number;
}

export const PRICING_PLANS: Record<PackageTier, PricingPlan> = {
  free: {
    tier: 'free',
    name: 'Free Trial',
    badge: '1 active event',
    basePrice: 0,
    maxGuests: 5,
    extraGuestPricePerUnit: 0,
    canAddExtraGuests: false,
    features: [
      'Up to 5 guests',
      'All 8 interactive event modules',
      'QR Check-in scanner',
      'Landing page & RSVP invitation',
      'Door prize & live Photo Wall',
      'Max 1 active event at a time',
    ],
    whatsappFonntePrice: 0,
    whatsappOfficialPrice: 0,
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    badge: 'Small Celebrations',
    basePrice: 150000,
    maxGuests: 50,
    extraGuestPricePerUnit: 3000,
    canAddExtraGuests: true,
    features: [
      'Up to 50 guests included',
      'Extra guests: Rp 30,000 / 10 guests',
      'Live Photo Wall (WebP max 10/guest)',
      'Raffle & Door Prize wheel',
      'Interactive games & trivia',
      'Resend email invitations included (3x/guest)',
      'Subdomain access (<slug>.all41.app)',
    ],
    whatsappFonntePrice: 50000,
    whatsappOfficialPrice: 100000,
  },
  plus: {
    tier: 'plus',
    name: 'Plus',
    badge: 'Intimate Weddings',
    basePrice: 750000,
    maxGuests: 300,
    extraGuestPricePerUnit: 2500,
    canAddExtraGuests: true,
    popular: true,
    features: [
      'Up to 300 guests included',
      'Extra guests: Rp 25,000 / 10 guests',
      'All 8 event modules unlocked',
      'Multiple check-in stations',
      'High-resolution live Photo Wall',
      'Kahoot-style interactive quiz',
      'Export guest attendance CSV',
      'Custom branding colors',
    ],
    whatsappFonntePrice: 250000,
    whatsappOfficialPrice: 300000,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    badge: 'Grand Weddings & Galas',
    basePrice: 1350000,
    maxGuests: 600,
    extraGuestPricePerUnit: 2250,
    canAddExtraGuests: true,
    features: [
      'Up to 600 guests included',
      'Extra guests: Rp 22,500 / 10 guests',
      'Priority live realtime photo sync',
      'Custom raffle themes & slot machines',
      'Unlimited check-in crew operators',
      'Email RSVP tracking & automated reminders',
      'VIP table assignment management',
    ],
    whatsappFonntePrice: 400000,
    whatsappOfficialPrice: 600000,
  },
  business: {
    tier: 'business',
    name: 'Business',
    badge: 'Corporate Summits',
    basePrice: 3000000,
    maxGuests: 1500,
    extraGuestPricePerUnit: 2000,
    canAddExtraGuests: true,
    features: [
      'Up to 1,500 guests included',
      'Extra guests: Rp 20,000 / 10 guests',
      'Corporate badge & QR pass integration',
      'Enterprise speed SLA',
      'Scavenger hunt & team games',
      'Detailed audit logs & attendance export',
      'Dedicated support channel',
    ],
    whatsappFonntePrice: 800000,
    whatsappOfficialPrice: 1500000,
  },
  scale: {
    tier: 'scale',
    name: 'Scale',
    badge: 'Mega Expos & Festivals',
    basePrice: 4500000,
    maxGuests: 2500,
    extraGuestPricePerUnit: 0,
    canAddExtraGuests: false, // strictly capped at 2500
    features: [
      'Up to 2,500 guests maximum',
      'Massive throughput realtime infrastructure',
      'Full white-label options ready',
      'All interactive games & raffles',
      'Cloudflare R2 high-concurrency photo CDN',
      'VIP expedited check-in queues',
      'Dedicated technical standby',
    ],
    whatsappFonntePrice: 1200000,
    whatsappOfficialPrice: 2500000,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    badge: 'Custom Mega Events',
    basePrice: 0, // Contact Us
    maxGuests: 999999,
    extraGuestPricePerUnit: 0,
    canAddExtraGuests: true,
    features: [
      '2,500+ guests with custom SLA',
      'Custom on-premise or dedicated cloud',
      'Custom game logic & brand integrations',
      'Onsite technical crew assistance',
      'Custom security audits & NDA',
    ],
    whatsappFonntePrice: 0,
    whatsappOfficialPrice: 0,
  },
};

export const ADDONS = {
  whiteLabel: {
    name: 'White Label / Custom Domain',
    description: 'Remove all41 branding, use your own domain or branded subdomain',
    price: 250000,
  },
};

/**
 * Calculates cashback percentage for registered EO/WO based on total guest count
 * Note: Minimum 100 guests to qualify
 */
export function getReferralCashbackRate(totalGuests: number): number {
  if (totalGuests >= 2000) return 0.18; // 18%
  if (totalGuests >= 1000) return 0.15; // 15%
  if (totalGuests >= 500) return 0.12;  // 12%
  if (totalGuests >= 100) return 0.10;  // 10%
  return 0; // Under 100 guests = 0%
}

export interface QuoteCalculationOptions {
  tier: PackageTier;
  extraGuests: number; // Must be in multiples of 10
  includeWhiteLabel?: boolean;
  whatsappProvider?: 'none' | 'fonnte' | 'official';
}

export interface QuoteBreakdown {
  tier: PackageTier;
  basePrice: number;
  extraGuestsCount: number;
  extraGuestsCost: number;
  whiteLabelCost: number;
  whatsappCost: number;
  subtotalPackageAndGuests: number; // base + extra guests (cashback base)
  totalCost: number;
  cashbackRate: number;
  estimatedCashback: number;
  totalGuestsCapacity: number;
  error?: string;
}

export function calculateEventQuote(options: QuoteCalculationOptions): QuoteBreakdown {
  const plan = PRICING_PLANS[options.tier];
  let extraGuests = Math.max(0, options.extraGuests || 0);

  // Validate multiples of 10
  if (extraGuests % 10 !== 0) {
    extraGuests = Math.ceil(extraGuests / 10) * 10;
  }

  // Free and Scale cannot purchase extra guests
  if (!plan.canAddExtraGuests) {
    extraGuests = 0;
  }

  const basePrice = plan.basePrice;
  const extraGuestsCost = extraGuests * plan.extraGuestPricePerUnit;
  const whiteLabelCost = options.includeWhiteLabel ? ADDONS.whiteLabel.price : 0;

  let whatsappCost = 0;
  if (options.whatsappProvider === 'fonnte') {
    whatsappCost = plan.whatsappFonntePrice;
  } else if (options.whatsappProvider === 'official') {
    whatsappCost = plan.whatsappOfficialPrice;
  }

  const subtotalPackageAndGuests = basePrice + extraGuestsCost;
  const totalCost = subtotalPackageAndGuests + whiteLabelCost + whatsappCost;
  const totalGuestsCapacity = plan.maxGuests + extraGuests;

  const cashbackRate = getReferralCashbackRate(totalGuestsCapacity);
  // Cashback is calculated on package amount + extra guests (excludes add-ons)
  const estimatedCashback = Math.round(subtotalPackageAndGuests * cashbackRate);

  return {
    tier: options.tier,
    basePrice,
    extraGuestsCount: extraGuests,
    extraGuestsCost,
    whiteLabelCost,
    whatsappCost,
    subtotalPackageAndGuests,
    totalCost,
    cashbackRate,
    estimatedCashback,
    totalGuestsCapacity,
  };
}
