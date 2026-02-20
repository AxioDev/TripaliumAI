import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('publicNav');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            TripaliumAI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:underline">
              {t('signIn')}
            </Link>
            <Link href="/signup" className="hover:underline">
              {t('signUp')}
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/privacy" className="hover:underline">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="hover:underline">
              {t('terms')}
            </Link>
          </div>
          <p className="text-center mt-4">
            &copy; {new Date().getFullYear()} TripaliumAI.{' '}
            {t('allRights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
