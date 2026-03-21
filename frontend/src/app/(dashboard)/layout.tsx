'use client';

import { Navbar } from '@/components/layout/navbar';
import { ProtectedRoute } from '@/lib/protected-route';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
