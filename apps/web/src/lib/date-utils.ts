import { formatDistanceToNow, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export function getDateLocale(locale: string) {
  return locale === 'fr' ? fr : enUS;
}

export function formatRelativeTime(
  date: Date | string,
  locale: string
): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: getDateLocale(locale),
  });
}

export function formatDate(
  date: Date | string,
  formatStr: string,
  locale: string
): string {
  return format(new Date(date), formatStr, {
    locale: getDateLocale(locale),
  });
}
