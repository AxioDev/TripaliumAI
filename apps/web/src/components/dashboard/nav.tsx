'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  User,
  FileText,
  Target,
  Briefcase,
  Settings,
  LogOut,
  LayoutDashboard,
  Activity,
  Key,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from '@/components/notifications';
import { useNotifications } from '@/contexts/notification-context';
import { useSubscription } from '@/contexts/subscription-context';

const navItems = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/profile', labelKey: 'profile', icon: User },
  { href: '/dashboard/cvs', labelKey: 'cvs', icon: FileText },
  { href: '/dashboard/campaigns', labelKey: 'campaigns', icon: Target },
  { href: '/dashboard/applications', labelKey: 'applications', icon: Briefcase },
  { href: '/dashboard/activity', labelKey: 'activity', icon: Activity },
  { href: '/dashboard/api-keys', labelKey: 'apiKeys', icon: Key },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings },
];

function NavLink({
  href,
  labelKey,
  icon: Icon,
  isActive,
  onClick,
  t,
  variant = 'dark',
}: {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: () => void;
  t: (key: string) => string;
  variant?: 'dark' | 'light';
}) {
  if (variant === 'dark') {
    return (
      <Link href={href} onClick={onClick}>
        <span
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all min-h-[44px]',
            isActive
              ? 'bg-sidebar-accent text-white shadow-sm shadow-sidebar-accent/30'
              : 'text-sidebar-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground-active'
          )}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {t(labelKey)}
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} onClick={onClick}>
      <span
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all min-h-[44px]',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {t(labelKey)}
      </span>
    </Link>
  );
}

function PlanBadge() {
  const { plan } = useSubscription();
  const planStyles = {
    FREE: 'bg-sidebar-muted text-sidebar-foreground',
    STARTER: 'bg-amber-500/20 text-amber-300',
    PRO: 'bg-purple-500/20 text-purple-300',
  };
  return (
    <div className={cn('mx-3 mb-2 rounded-lg px-3 py-2 text-center text-xs font-medium', planStyles[plan] || planStyles.FREE)}>
      {plan === 'FREE' ? 'Free Plan' : plan === 'STARTER' ? 'Starter Plan' : 'Pro Plan'}
    </div>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  // Remove locale prefix from pathname for comparison
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  return (
    <div className="hidden md:flex h-screen w-64 flex-col gradient-sidebar flex-shrink-0 sticky top-0">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {t('brand')}
        </Link>
        <NotificationBell
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClear={clearNotification}
        />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            labelKey={item.labelKey}
            icon={item.icon}
            isActive={pathnameWithoutLocale === item.href}
            t={t}
            variant="dark"
          />
        ))}
      </nav>
      <div className="border-t border-sidebar-border pt-2 pb-3">
        <PlanBadge />
        <div className="px-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 min-h-[44px] text-sidebar-foreground hover:text-white hover:bg-sidebar-muted"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-5 w-5" />
            {t('signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  // Remove locale prefix from pathname for comparison
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  return (
    <>
      <div className="flex md:hidden h-14 items-center justify-between border-b bg-background px-4 sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {t('brand')}
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClear={clearNotification}
          />
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setOpen(true)}
            aria-label={t('openMenu')}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-left flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              {t('brand')}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                labelKey={item.labelKey}
                icon={item.icon}
                isActive={pathnameWithoutLocale === item.href}
                onClick={() => setOpen(false)}
                t={t}
                variant="light"
              />
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 min-h-[44px]"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
            >
              <LogOut className="h-5 w-5" />
              {t('signOut')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
