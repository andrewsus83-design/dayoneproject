import type { Metadata } from 'next';
import { Navbar } from '@/components/marketing/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { Audiences } from '@/components/marketing/Audiences';
import { Journey } from '@/components/marketing/Journey';
import { DayOf } from '@/components/marketing/DayOf';
import { GuestApp } from '@/components/marketing/GuestApp';
import { Team } from '@/components/marketing/Team';
import { ClosingCta } from '@/components/marketing/ClosingCta';
import { Footer } from '@/components/marketing/Footer';

const TITLE = 'Day One Project | The all-in-one event app for EOs and WOs';
const DESCRIPTION =
  'Run the whole event from one app: event page and RSVP, email invitations, QR passes and an offline-ready register desk, live screens, trivia, door prizes, a photo wall, and a guest app with a Shot camera.';

export const metadata: Metadata = {
  metadataBase: new URL('https://app.dayoneproject.xyz'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Day One Project',
    images: [{ url: '/brand/dayone-logo.png', width: 760, height: 763, alt: 'Day One Project' }],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Audiences />
        <Journey />
        <DayOf />
        <GuestApp />
        <Team />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
