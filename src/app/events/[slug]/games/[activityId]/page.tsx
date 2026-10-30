'use client';

import React, { use, Suspense } from 'react';
import { GamesScreen } from '@/components/events/GamesScreen';

function ActivityWrapper({ params }: { params: Promise<{ slug: string; activityId: string }> }) {
  const { slug, activityId } = use(params);
  return <GamesScreen slug={slug} initialId={activityId} />;
}

export default function ActivityPage({ params }: { params: Promise<{ slug: string; activityId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading activity…</div>}>
      <ActivityWrapper params={params} />
    </Suspense>
  );
}
