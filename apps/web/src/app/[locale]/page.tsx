import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { FileText, Target, Briefcase, Sparkles } from 'lucide-react';

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
    <div className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-info/5 blur-3xl" />
      </div>

      <div className="max-w-2xl text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl gradient-text-brand">
          {t('title')}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {t('subtitle')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/login">
            <Button variant="gradient" size="lg">{t('getStarted')}</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              {t('signIn')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-3 max-w-4xl">
        <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold">{t('features.upload.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.upload.description')}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-muted mb-4">
            <Target className="h-5 w-5 text-info" />
          </div>
          <h3 className="font-semibold">{t('features.criteria.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.criteria.description')}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-muted mb-4">
            <Briefcase className="h-5 w-5 text-success" />
          </div>
          <h3 className="font-semibold">{t('features.applications.title')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('features.applications.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
