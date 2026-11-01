export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function safeUrl(raw, hostname) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && (!hostname || url.hostname === hostname) ? url.href : null;
  } catch {
    return null;
  }
}

import { getLanguage } from '../i18n.js';

export function when(iso, now = Date.now()) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  const relative = new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'auto' });
  if (minutes < 1) return relative.format(0, 'minute');
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return relative.format(-days, 'day');
  return dateLabel(iso);
}

export function dateLabel(iso) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(getLanguage(), { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function readTime(iso) {
  return new Date(iso).toLocaleTimeString(getLanguage(), { timeZone: 'Asia/Shanghai', hour12: false });
}
