import { Suspense } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Platform Superadmin | all41',
  description: 'Manage platform revenue, approve referral cashback payouts, and audit message queues',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#07080f] text-[#f8fafc]">
      <Suspense fallback={<aside className="w-64 bg-[#090b12] border-r border-[#241a38] hidden md:block" />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
