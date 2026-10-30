import type { Metadata } from 'next';
import { LiveEventSync } from '@/components/events/LiveEventSync';

/** Guests who add an event to their home screen get that event's guest app (see /api/manifest/<slug>). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    manifest: `/api/manifest/${slug}`,
    appleWebApp: { capable: true, title: 'Day One', statusBarStyle: 'black-translucent' },
  };
}

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LiveEventSync slug={slug}>{children}</LiveEventSync>;
}
