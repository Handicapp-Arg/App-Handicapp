'use client';

import { Navbar } from '@/components/layout/navbar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { ProtectedRoute } from '@/lib/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen md:flex-row flex-col">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="mx-auto w-full max-w-5xl lg:max-w-7xl flex-1 px-4 lg:px-8 py-6 pb-24 md:pb-10">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
