import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in | dayoneproject.xyz',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
