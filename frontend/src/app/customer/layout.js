'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HelpWidget from '@/components/HelpWidget';
import api from '@/lib/api';

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
  const [overdueAlert, setOverdueAlert] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'customer')) {
      router.replace(user ? '/admin/dashboard' : '/login');
    }
  }, [user, loading, router]);

  // Check for overdue/due-soon bills on every page load
  useEffect(() => {
    if (!loading && user && user.role === 'customer') {
      api.getDashboardStats().then(data => {
        if (data.overdueAlert) {
          setOverdueAlert(data.overdueAlert);
          setShowAlert(true);
        }
      }).catch(() => {});
    }
  }, [loading, user, pathname]);

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

      {/* Overdue / Due-Soon Payment Alert Popup */}
      {showAlert && overdueAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl animate-fadeIn mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${overdueAlert.type === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <svg className={`w-5 h-5 ${overdueAlert.type === 'overdue' ? 'text-red-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${overdueAlert.type === 'overdue' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {overdueAlert.type === 'overdue' ? 'Payment Overdue' : 'Payment Due Soon'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {overdueAlert.type === 'overdue'
                    ? overdueAlert.graceDatePassed
                      ? `You have ${overdueAlert.count} overdue invoice${overdueAlert.count > 1 ? 's' : ''} with an outstanding amount of ₹${overdueAlert.totalDue.toLocaleString()}. The grace period has expired and your services are at risk of being suspended. Please make the payment immediately to avoid any service disruption.`
                      : `You have ${overdueAlert.count} overdue invoice${overdueAlert.count > 1 ? 's' : ''} with an outstanding amount of ₹${overdueAlert.totalDue.toLocaleString()}. You are currently in the grace period. Please complete your payment before the grace period ends to avoid service suspension.`
                    : `You have ${overdueAlert.count} invoice${overdueAlert.count > 1 ? 's' : ''} due soon with a total of ₹${overdueAlert.totalDue.toLocaleString()}. Please ensure timely payment to avoid any service interruption.`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAlert(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Dismiss
              </button>
              <button onClick={() => { setShowAlert(false); router.push('/customer/invoices'); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${overdueAlert.type === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
