/**
 * Helper utilities for client subdomains: <clientname>.all41.app
 */

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'all41.app';

/**
 * Returns the official client subdomain string (e.g. "techunite.all41.app")
 */
export function getClientDomain(slug: string): string {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `${cleanSlug}.${ROOT_DOMAIN}`;
}

/**
 * Returns the full HTTPS URL for the client subdomain
 * e.g. getClientUrl('techunite', '/photowall') -> "https://techunite.all41.app/photowall"
 */
export function getClientUrl(slug: string, path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : (path ? `/${path}` : '');
  return `https://${getClientDomain(slug)}${cleanPath}`;
}

/**
 * Returns the local development subdomain URL for testing on Chrome/Safari/Firefox
 * e.g. "http://techunite.localhost:3000/photowall"
 */
export function getLocalDevClientUrl(slug: string, path: string = ''): string {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const cleanPath = path.startsWith('/') ? path : (path ? `/${path}` : '');
  return `http://${cleanSlug}.localhost:3000${cleanPath}`;
}

/**
 * Returns the appropriate client subdomain URL depending on environment
 * (uses localhost subdomain in development, all41.app in production)
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
