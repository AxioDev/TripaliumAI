'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Target, Eye, Sparkles } from 'lucide-react';

const WELCOME_DISMISSED_KEY = 'tripalium_welcome_dismissed';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('welcome');

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setOpen(false);
  };

  const steps = [
    { icon: FileText, title: t('steps.upload.title'), description: t('steps.upload.description') },
    { icon: Target, title: t('steps.campaign.title'), description: t('steps.campaign.description') },
    { icon: Eye, title: t('steps.review.title'), description: t('steps.review.description') },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleDismiss} variant="gradient" className="w-full">
          {t('cta')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
