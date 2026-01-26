'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Search,
  FileCheck,
  Target,
  Send,
  Sparkles,
  Check,
  X,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from './notification-types';

const notificationConfig: Record<NotificationType, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  cv_parsed: {
    icon: FileText,
    color: 'text-success',
    bgColor: 'bg-success-muted',
  },
  jobs_discovered: {
    icon: Search,
    color: 'text-info',
    bgColor: 'bg-info-muted',
  },
  documents_ready: {
    icon: FileCheck,
    color: 'text-success',
    bgColor: 'bg-success-muted',
  },
  campaign_status: {
    icon: Target,
    color: 'text-warning',
    bgColor: 'bg-warning-muted',
  },
  application_submitted: {
    icon: Send,
    color: 'text-success',
    bgColor: 'bg-success-muted',
  },
  match_found: {
    icon: Sparkles,
    color: 'text-info',
    bgColor: 'bg-info-muted',
  },
};

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: (id: string) => void;
  onClose: () => void;
}

export function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClose,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-slide-in-up rounded-lg border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/70">
              We&apos;ll let you know when something happens
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const config = notificationConfig[notification.type];
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'group relative flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                    !notification.read && 'bg-muted/30'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                    config.bgColor
                  )}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {notification.actionUrl ? (
                      <Link
                        href={notification.actionUrl}
                        onClick={() => {
                          onMarkAsRead(notification.id);
                          onClose();
                        }}
                        className="block"
                      >
                        <p className="text-sm font-medium leading-tight hover:underline">
                          {notification.title}
                        </p>
                      </Link>
                    ) : (
                      <p className="text-sm font-medium leading-tight">
                        {notification.title}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onMarkAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onClear(notification.id)}
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t px-4 py-2">
          <Link
            href="/dashboard/activity"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
