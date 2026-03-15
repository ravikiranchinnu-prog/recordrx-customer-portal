'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HelpWidget from '@/components/HelpWidget';

const pageTitles = {
  '/customer/dashboard': 'Dashboard',
  '/customer/invoices': 'My Invoices & Payments',
  '/customer/tickets': 'My Tickets',
  '/customer/settings': 'Settings',
};

export default function CustomerLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'customer')) {
      router.replace(user ? '/admin/dashboard' : '/login');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'customer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <div className="min-h-screen">
      <Sidebar variant="customer" />
      <main className="main-content min-h-screen overflow-y-auto">
        <Header title={title} />
        <div className="p-4">
          {children}
        </div>
      </main>
      <HelpWidget />
    </div>
  );
}
