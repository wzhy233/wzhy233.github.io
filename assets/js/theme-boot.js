try {
  const saved = localStorage.getItem('link-theme');
  document.documentElement.dataset.theme = saved === 'light' || saved === 'dark'
    ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

if (document.documentElement.dataset.page === 'home') {
  history.scrollRestoration = 'manual';
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && /^#(?:about|games|journal|projects|contact|top|main)$/.test(location.hash)) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  window.addEventListener('pageshow', () => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

if (location.protocol === 'file:') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('local-preview').hidden = false;

  });
}
