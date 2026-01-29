import { setRequestLocale } from 'next-intl/server';
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            TripaliumAI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:underline">
              {locale === 'fr' ? 'Connexion' : 'Sign in'}
            </Link>
            <Link href="/signup" className="hover:underline">
              {locale === 'fr' ? "S'inscrire" : 'Sign up'}
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/privacy" className="hover:underline">
              {locale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
            </Link>
            <Link href="/terms" className="hover:underline">
              {locale === 'fr' ? "Conditions d'utilisation" : 'Terms of Service'}
            </Link>
          </div>
          <p className="text-center mt-4">
            &copy; {new Date().getFullYear()} TripaliumAI.{' '}
            {locale === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
