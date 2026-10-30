'use client';

import React, { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DoorPrizeScreen } from '@/components/events/DoorPrizeScreen';

function Wrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const search = useSearchParams();
  // Older /raffle?d= links keep working; new links use /doorprize/[drawId].
  return <DoorPrizeScreen slug={slug} initialId={search.get('d')} />;
}

export default function RaffleStagePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading stage…</div>}>
      <Wrapper params={params} />
    </Suspense>
  );
}
