'use client';

import React, { use, Suspense } from 'react';
import { InvitationFormPage } from '@/components/events/InvitationFormPage';

/** One of the event's other invitation forms (the first one is /events/<slug>/invitation). */
function FormWrapper({ params }: { params: Promise<{ slug: string; formId: string }> }) {
  const { slug, formId } = use(params);
  return <InvitationFormPage slug={slug} formId={decodeURIComponent(formId).toLowerCase()} />;
}

export default function InvitationFormRoute({ params }: { params: Promise<{ slug: string; formId: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}>
      <FormWrapper params={params} />
    </Suspense>
  );
}
