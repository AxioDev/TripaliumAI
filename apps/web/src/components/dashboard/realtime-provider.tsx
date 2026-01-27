'use client';

import { ReactNode } from 'react';
import { NotificationProvider } from '@/contexts/notification-context';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
