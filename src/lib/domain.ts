/**
 * Event links live on the app host as paths: app.dayoneproject.xyz/events/<slug>
 * (subdomains of dayoneproject.xyz belong to the Day One Project RSVP sites).
 */

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dayoneproject.xyz';
export const APP_HOST = `app.${ROOT_DOMAIN}`;

function clean(slug: string) {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function cleanPath(path: string) {
  return path.startsWith('/') ? path : (path ? `/${path}` : '');
}

/**
 * Returns the event's public address without protocol (e.g. "app.dayoneproject.xyz/events/techunite")
 */
export function getClientDomain(slug: string): string {
  return `${APP_HOST}/events/${clean(slug)}`;
}

/**
 * Returns the full HTTPS URL for an event page
 * e.g. getClientUrl('techunite', '/photowall') -> "https://app.dayoneproject.xyz/events/techunite/photowall"
 */
export function getClientUrl(slug: string, path: string = ''): string {
  return `https://${getClientDomain(slug)}${cleanPath(path)}`;
}

/**
 * Returns the local development URL for an event page
 * e.g. "http://localhost:3000/events/techunite/photowall"
 */
export function getLocalDevClientUrl(slug: string, path: string = ''): string {
  return `http://localhost:3000/events/${clean(slug)}${cleanPath(path)}`;
}

/**
 * Returns the event URL for the current environment (localhost in development, app.dayoneproject.xyz in production)
 */
export function getEffectiveClientUrl(slug: string, path: string = ''): string {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
    if (isLocalhost) {
      return getLocalDevClientUrl(slug, path);
    }
  }
  return getClientUrl(slug, path);
}
