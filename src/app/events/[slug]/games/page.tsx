'use client';

import React, { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GamesScreen } from '@/components/events/GamesScreen';

function GamesWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const search = useSearchParams();
  // ?a= keeps older links working; new links use /games/[activityId].
  return <GamesScreen slug={slug} initialId={search.get('a')} />;
}

export default function InteractiveGamesPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading activity…</div>}>
      <GamesWrapper params={params} />
    </Suspense>
  );
}
