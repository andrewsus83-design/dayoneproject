import { redirect } from 'next/navigation';

/** The old registration page. Guests register on the invitation form, which issues their QR pass on the server. */
export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/events/${slug}/invitation`);
}
