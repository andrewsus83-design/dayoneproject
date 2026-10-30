'use client';

import React, { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DoorPrizeScreen } from '@/components/events/DoorPrizeScreen';

function Wrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const search = useSearchParams();
  return <DoorPrizeScreen slug={slug} initialId={search.get('d')} />;
}

export default function DoorPrizePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading stage…</div>}>
      <Wrapper params={params} />
    </Suspense>
  );
}
