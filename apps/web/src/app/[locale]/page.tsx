import { setRequestLocale } from 'next-intl/server';
import { LandingContent } from './landing-content';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingContent />;
}
