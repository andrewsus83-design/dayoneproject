'use client';

import React, { use, Suspense } from 'react';
import { InvitationFormPage } from '@/components/events/InvitationFormPage';

function InvitationWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <InvitationFormPage slug={slug} formId="" />;
}

export default function InvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}>
      <InvitationWrapper params={params} />
    </Suspense>
  );
}
