import { LiveEventSync } from '@/components/events/LiveEventSync';

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LiveEventSync slug={slug}>{children}</LiveEventSync>;
}
