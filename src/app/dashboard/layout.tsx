import { Suspense } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const metadata = {
  title: 'Dashboard | all41',
  description: 'Manage events, attendees, photo walls, and raffle draws',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0b0d13] text-[#f8fafc]">
      <Suspense fallback={<aside className="w-64 bg-[#0d101a] border-r border-[#1e263d] hidden md:block" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
