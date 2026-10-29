import { Navbar } from '@/components/marketing/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { FeatureShowcase } from '@/components/marketing/FeatureShowcase';
import { InteractivePricingCalculator } from '@/components/marketing/InteractivePricingCalculator';
import { PartnerSection } from '@/components/marketing/PartnerSection';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'all41 | All-in-One Event Experience Platform',
  description:
    'Southeast Asia’s premier all-in-one event platform. Landing builder, digital RSVP, QR check-in, live photo wall, raffle draws, and interactive trivia.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col selection:bg-premium-gold selection:text-premium-black font-sans">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeatureShowcase />
        <InteractivePricingCalculator />
        <PartnerSection />
      </main>
      <Footer />
    </div>
  );
}
