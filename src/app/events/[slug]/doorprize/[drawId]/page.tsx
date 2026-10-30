'use client';

import React, { use, Suspense } from 'react';
import { DoorPrizeScreen } from '@/components/events/DoorPrizeScreen';

function Wrapper({ params }: { params: Promise<{ slug: string; drawId: string }> }) {
  const { slug, drawId } = use(params);
  return <DoorPrizeScreen slug={slug} initialId={drawId} />;
}

export default function DoorPrizeItemPage({ params }: { params: Promise<{ slug: string; drawId: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading stage…</div>}>
      <Wrapper params={params} />
    </Suspense>
  );
}
