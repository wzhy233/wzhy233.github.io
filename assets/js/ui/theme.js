import { t } from '../i18n.js';

function syncTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#191c19' : '#f6f5f0';
  document.querySelector('.theme').setAttribute('aria-label', t(dark ? 'light' : 'dark'));
}

export function initTheme() {
  syncTheme();
  document.addEventListener('languagechange', syncTheme);
  document.querySelector('.theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('link-theme', next); } catch { /* Storage may be blocked in private browsing. */ }
    syncTheme();
  });
}
