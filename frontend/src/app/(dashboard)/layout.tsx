'use client';

import { Navbar } from '@/components/layout/navbar';
import { Topbar } from '@/components/layout/topbar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { ProtectedRoute } from '@/lib/protected-route';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { ShortcutsCheatsheet } from '@/components/ui/shortcuts-cheatsheet';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <OnboardingWizard />
      <ShortcutsCheatsheet />
      <div className="flex min-h-screen md:flex-row flex-col" style={{ backgroundColor: 'var(--surface-page)' }}>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <Topbar />
          <main className="mx-auto w-full max-w-5xl lg:max-w-7xl flex-1 px-4 lg:px-8 py-6 pb-24 md:pb-10">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
