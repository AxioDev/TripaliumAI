'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
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
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth.login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.invalidCredentials'),
          variant: 'destructive',
        });
      } else {
        router.push('/dashboard');
      }
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" variant="gradient" className="w-full" disabled={isLoading}>
              {isLoading ? t('submitting') : t('submit')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t('noAccount')}{' '}
              <Link href="/signup" className="text-primary hover:underline">
                {t('signUp')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
