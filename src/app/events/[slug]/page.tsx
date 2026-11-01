'use client';

import React, { use, Suspense, useMemo } from 'react';
import { landingFormButtons, useEventConfigBySlug } from '@/lib/eventStore';
import { resolveTheme } from '@/lib/eventTheme';
import { EventFonts } from '@/components/events/EventFonts';
import { LandingRenderer } from '@/components/events/landing/LandingRenderer';
import { CustomHtmlFrame } from '@/components/events/landing/CustomHtmlFrame';

function EventLandingContent({ slug }: { slug: string }) {
  const { hydrated, config, event } = useEventConfigBySlug(slug);
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);
  const forms = useMemo(() => landingFormButtons(config, slug), [config, slug]);

  if (!hydrated) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading event...</div>;
  }

  // An uploaded page replaces the sections.
  if (config.landing.mode === 'html' && config.landing.html) {
    return <CustomHtmlFrame title={config.info.name} src={`/events/${slug}/site?v=${encodeURIComponent(config.landing.htmlRev ?? '')}`} />;
  }

  return (
    <div className="min-h-screen" style={{ background: theme.bg }}>
      <EventFonts href={theme.fontsHref} />
      <LandingRenderer
        slug={slug}
        info={config.info}
        landing={config.landing}
        design={config.design}
        theme={theme}
        isWedding={event.event_type === 'wedding'}
        defaultCover={event.cover_image_url ?? ''}
        forms={forms}
      />
    </div>
  );
}

function EventLandingWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <EventLandingContent slug={slug} />;
}

export default function EventLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading event...</div>}>
      <EventLandingWrapper params={params} />
    </Suspense>
  );
}
