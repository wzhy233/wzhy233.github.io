try {
  const saved = localStorage.getItem('link-theme');
  document.documentElement.dataset.theme = saved === 'light' || saved === 'dark'
    ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
} catch {
  document.documentElement.dataset.theme = 'light';
}

if (location.protocol === 'file:') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('local-preview').hidden = false;

  });
}
