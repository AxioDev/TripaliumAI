import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { setRequestLocale } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { DashboardNav, MobileNav } from '@/components/dashboard/nav';

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav />
      <DashboardNav />
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
