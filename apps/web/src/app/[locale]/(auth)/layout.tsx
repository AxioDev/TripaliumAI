import { setRequestLocale } from 'next-intl/server';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-screen">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-info/5 blur-3xl" />
      </div>
      {children}
    </div>
  );
}
