import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export function parseDate(isoString: string): Date {
  const parsed = parseISO(isoString);
  return isValid(parsed) ? parsed : new Date();
}

export function formatRelativeTime(isoString: string): string {
  try {
    return formatDistanceToNow(parseDate(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

export function formatAbsoluteTime(isoString: string, formatStr = 'MMM d, yyyy · HH:mm'): string {
  try {
    return format(parseDate(isoString), formatStr);
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString: string): string {
  try {
    return format(parseDate(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    return format(parseDate(isoString), 'HH:mm');
  } catch {
    return isoString;
  }
}

export function getCurrentISO(): string {
  return new Date().toISOString();
}
