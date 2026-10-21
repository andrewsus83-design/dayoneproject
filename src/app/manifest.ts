import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'all41 | Event Experience Platform',
    short_name: 'all41',
    description: 'All-in-one digital invitations, QR check-in, live photo wall, and door prize raffles',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0d13',
    theme_color: '#0b0d13',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
