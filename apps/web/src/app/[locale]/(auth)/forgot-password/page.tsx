'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, MailCheck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('auth.forgotPassword');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Always show success regardless of response to prevent email enumeration
      setIsSubmitted(true);
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.generic'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-muted">
                <MailCheck className="h-4 w-4 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t('successTitle')}</CardTitle>
            <CardDescription>
              {t('successDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                {t('backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
              {isLoading ? t('submitting') : t('submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/login" className="text-primary hover:underline">
                {t('backToLogin')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
