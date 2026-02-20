'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcherMinimal } from '@/components/ui/language-switcher';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sparkles,
  Clock,
  Copy,
  Ghost,
  Upload,
  Target,
  FileSearch,
  PenTool,
  Shield,
  Globe,
  Menu,
  Quote,
} from 'lucide-react';

export function LandingContent() {
  const t = useTranslations('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── 1. Navigation ── */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">{t('nav.brand')}</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSwitcherMinimal />
            <Link href="/pricing">
              <Button variant="ghost" size="sm">{t('nav.pricing')}</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">{t('nav.signIn')}</Button>
            </Link>
            <Link href="/signup">
              <Button variant="gradient" size="sm">{t('nav.getStarted')}</Button>
            </Link>
          </div>
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile nav sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-64">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {t('nav.brand')}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-2 mt-6">
            <LanguageSwitcherMinimal />
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">{t('nav.pricing')}</Button>
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">{t('nav.signIn')}</Button>
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="gradient" className="w-full">{t('nav.getStarted')}</Button>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* ── 2. Hero ── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-info/5 blur-3xl" />
          <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-warning/5 blur-3xl" />
        </div>

        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl gradient-text-brand">
            {t('hero.headline')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button variant="gradient" size="lg">{t('hero.ctaPrimary')}</Button>
            </Link>
            <Button variant="outline" size="lg" onClick={scrollToHowItWorks}>
              {t('hero.ctaSecondary')}
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{t('hero.trust')}</p>
        </div>
      </section>

      {/* ── 3. Problem Statement ── */}
      <section className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t('problem.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('problem.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 mb-4">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold">{t('problem.pain1.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('problem.pain1.description')}</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 mb-4">
                <Copy className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold">{t('problem.pain2.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('problem.pain2.description')}</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 mb-4">
                <Ghost className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-semibold">{t('problem.pain3.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('problem.pain3.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. How It Works ── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t('howItWorks.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('howItWorks.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="relative mt-16 grid gap-12 sm:grid-cols-3">
            <div className="absolute top-10 left-[16.67%] right-[16.67%] hidden h-0.5 bg-border sm:block" />

            <div className="relative text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 relative z-10">
                <Upload className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
                  1
                </span>
              </div>
              <h3 className="text-lg font-semibold">{t('howItWorks.step1.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('howItWorks.step1.description')}</p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 relative z-10">
                <Target className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
                  2
                </span>
              </div>
              <h3 className="text-lg font-semibold">{t('howItWorks.step2.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('howItWorks.step2.description')}</p>
            </div>

            <div className="relative text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 relative z-10">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">
                  3
                </span>
              </div>
              <h3 className="text-lg font-semibold">{t('howItWorks.step3.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('howItWorks.step3.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Features ── */}
      <section id="features" className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t('features.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('features.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <FileSearch className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t('features.matching.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('features.matching.description')}</p>
            </div>
            <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 mb-4">
                <PenTool className="h-5 w-5 text-info" />
              </div>
              <h3 className="font-semibold">{t('features.documents.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('features.documents.description')}</p>
            </div>
            <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 mb-4">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <h3 className="font-semibold">{t('features.control.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('features.control.description')}</p>
            </div>
            <div className="rounded-xl border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 mb-4">
                <Globe className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold">{t('features.sources.title')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('features.sources.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {t('testimonials.eyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('testimonials.title')}
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-6">
                <Quote className="h-6 w-6 text-primary/30 mb-3" />
                <p className="text-sm text-muted-foreground italic">
                  {t(`testimonials.quote${i}.text`)}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {t(`testimonials.quote${i}.initials`)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`testimonials.quote${i}.name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`testimonials.quote${i}.role`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Stats ── */}
      <section className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t('stats.title')}
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <p className="text-4xl font-bold gradient-text-brand">{t('stats.stat1.number')}</p>
              <p className="mt-2 font-semibold">{t('stats.stat1.label')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('stats.stat1.description')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold gradient-text-brand">{t('stats.stat2.number')}</p>
              <p className="mt-2 font-semibold">{t('stats.stat2.label')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('stats.stat2.description')}</p>
            </div>
            <div>
              <p className="text-4xl font-bold gradient-text-brand">{t('stats.stat3.number')}</p>
              <p className="mt-2 font-semibold">{t('stats.stat3.label')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('stats.stat3.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ── */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('faq.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {t('faq.subtitle')}
            </p>
          </div>
          <Accordion type="single" collapsible className="mt-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">
                  {t(`faq.q${i}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`faq.q${i}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 9. Final CTA ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl gradient-brand-vivid p-12 text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('finalCta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              {t('finalCta.description')}
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-foreground hover:bg-white/90 shadow-lg">
                  {t('finalCta.cta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Footer ── */}
      <footer className="border-t bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">{t('nav.brand')}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t('footer.tagline')}</p>
            </div>

            <div>
              <h4 className="font-semibold">{t('footer.product')}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <button
                    onClick={scrollToHowItWorks}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('footer.howItWorks')}
                  </button>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('footer.features')}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">{t('footer.legal')}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    {t('footer.terms')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
            {t('footer.copyright', { year: new Date().getFullYear().toString() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
