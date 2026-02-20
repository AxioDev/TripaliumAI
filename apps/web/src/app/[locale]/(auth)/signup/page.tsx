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
import { Sparkles, Check, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PRIVACY_POLICY_VERSION = '1.0';

function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('auth.signup.passwordRequirements');
  const checks = [
    { met: password.length >= 8, label: t('minLength') },
    { met: /[a-z]/.test(password), label: t('lowercase') },
    { met: /[A-Z]/.test(password), label: t('uppercase') },
    { met: /[0-9]/.test(password), label: t('number') },
  ];

  if (!password) return null;

  return (
    <div className="space-y-1">
      {checks.map((check, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {check.met ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <X className="h-3 w-3 text-muted-foreground" />
          )}
          <span className={check.met ? 'text-green-600' : 'text-muted-foreground'}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; consent?: string }>({});
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth.signup');
  const tValidation = useTranslations('common.validation');

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    if (field === 'email') {
      if (!value) {
        newErrors.email = tValidation('required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors.email = tValidation('invalidEmail');
      } else {
        delete newErrors.email;
      }
    }
    if (field === 'password') {
      if (!value) {
        newErrors.password = tValidation('required');
      } else if (value.length < 8) {
        newErrors.password = tValidation('passwordMinLength');
      } else {
        delete newErrors.password;
      }
    }
    if (field === 'confirmPassword') {
      if (value && value !== password) {
        newErrors.confirmPassword = tValidation('passwordsNoMatch');
      } else {
        delete newErrors.confirmPassword;
      }
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentGiven) {
      setErrors(prev => ({ ...prev, consent: t('toast.error.consentRequired') }));
      return;
    }

    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: tValidation('passwordsNoMatch') }));
      return;
    }

    if (password.length < 8) {
      setErrors(prev => ({ ...prev, password: tValidation('passwordMinLength') }));
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
                onBlur={() => validateField('email', email)}
                className={errors.email ? 'border-destructive' : ''}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validateField('password', password)}
                className={errors.password ? 'border-destructive' : ''}
                required
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
              <PasswordRequirements password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => validateField('confirmPassword', confirmPassword)}
                className={errors.confirmPassword ? 'border-destructive' : ''}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => {
                    setConsentGiven(checked === true);
                    if (checked) setErrors(prev => { const { consent, ...rest } = prev; return rest; });
                  }}
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
              {errors.consent && (
                <p className="text-xs text-destructive ml-6">{errors.consent}</p>
              )}
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
