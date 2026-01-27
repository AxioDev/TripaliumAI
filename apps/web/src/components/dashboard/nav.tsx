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
} from 'lucide-react';
import { useState } from 'react';
import { NotificationBell } from '@/components/notifications';
import { useNotifications } from '@/contexts/notification-context';

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
}: {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: () => void;
  t: (key: string) => string;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <span
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
        {t(labelKey)}
      </span>
    </Link>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  // Remove locale prefix from pathname for comparison
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center font-semibold">
          {t('brand')}
        </Link>
        <NotificationBell
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClear={clearNotification}
        />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            labelKey={item.labelKey}
            icon={item.icon}
            isActive={pathnameWithoutLocale === item.href}
            t={t}
          />
        ))}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[44px]"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-5 w-5" />
          {t('signOut')}
        </Button>
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
        <Link href="/dashboard" className="flex items-center font-semibold">
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
            <SheetTitle className="text-left">{t('brand')}</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                labelKey={item.labelKey}
                icon={item.icon}
                isActive={pathnameWithoutLocale === item.href}
                onClick={() => setOpen(false)}
                t={t}
              />
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
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
