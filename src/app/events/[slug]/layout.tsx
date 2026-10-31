import type { Metadata, Viewport } from 'next';
import { LiveEventSync } from '@/components/events/LiveEventSync';

/** Guests who add an event to their home screen get that event's guest app (see /api/manifest/<slug>). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    manifest: `/api/manifest/${slug}`,
    appleWebApp: { capable: true, title: 'Day One', statusBarStyle: 'black-translucent' },
  };
}

/** Guest pages fit the phone and do not pinch-zoom, like an installed app (globals.css also stops sideways drag). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090B',
};

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LiveEventSync slug={slug}>{children}</LiveEventSync>;
}
