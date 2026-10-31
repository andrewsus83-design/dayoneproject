import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** The venue line and Maps link for an event. An address pasted as a Maps link opens Maps instead of showing as text. */
export function venueDisplay(info: { venue: string; address: string; city?: string; mapsUrl: string }): { text: string; mapsUrl: string } {
  const address = info.address.trim();
  const isLink = /^https?:\/\//i.test(address);
  const text = [info.venue, isLink ? '' : address, info.city].filter(Boolean).join(', ');
  const query = [info.venue, isLink ? '' : address, info.city].filter(Boolean).join(' ');
  const mapsUrl = info.mapsUrl || (isLink ? address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  return { text, mapsUrl };
}
