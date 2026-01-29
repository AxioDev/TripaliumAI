'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PRIVACY_POLICY_VERSION = '1.0';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth.signup');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.consentRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.passwordsNoMatch'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          consentGiven,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t('toast.error.generic'));
      }

      toast({
        title: t('toast.success.title'),
        description: t('toast.success.description'),
      });

      router.push('/login');
    } catch (error) {
      toast({
        title: t('toast.error.title'),
        description: error instanceof Error ? error.message : t('toast.error.generic'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="consent"
                  className="text-sm font-normal leading-snug text-muted-foreground cursor-pointer"
                >
                  {t('consent.text')}{' '}
                  <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                    {t('consent.privacyPolicy')}
                  </Link>{' '}
                  {t('consent.and')}{' '}
                  <Link href="/terms" className="text-primary hover:underline" target="_blank">
                    {t('consent.termsOfService')}
                  </Link>
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" variant="gradient" className="w-full" disabled={isLoading || !consentGiven}>
              {isLoading ? t('submitting') : t('submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('hasAccount')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
