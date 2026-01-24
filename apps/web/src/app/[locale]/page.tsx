import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingContent />;
}

function LandingContent() {
  const t = useTranslations('landing');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {t('subtitle')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/login">
            <Button size="lg">{t('getStarted')}</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              {t('signIn')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3 max-w-4xl">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">{t('features.upload.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.upload.description')}
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">{t('features.criteria.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.criteria.description')}
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">{t('features.applications.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.applications.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
