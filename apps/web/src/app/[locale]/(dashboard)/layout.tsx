import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { setRequestLocale } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { DashboardNav, MobileNav } from '@/components/dashboard/nav';
import { RealtimeProvider } from '@/components/dashboard/realtime-provider';
import { SubscriptionProvider } from '@/contexts/subscription-context';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <RealtimeProvider>
      <SubscriptionProvider>
        <div className="flex h-screen flex-col md:flex-row">
          <MobileNav />
          <DashboardNav />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/30">{children}</main>
        </div>
      </SubscriptionProvider>
    </RealtimeProvider>
  );
}
