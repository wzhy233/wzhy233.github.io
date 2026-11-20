import { initLanguage } from './i18n.js';
import { initTheme } from './ui/theme.js';
import { initMotion } from './ui/motion.js';

async function start() {
  initLanguage();
  initTheme();
  document.getElementById('year').textContent = String(new Date().getFullYear());
  if (document.body.dataset.page === 'github') {
    const { initGithub } = await import('./pages/github.js');
    initGithub();
  } else {
    const { initHome } = await import('./pages/home.js');
    initHome();
  }
  initMotion();
}

start().catch(error => {
  const notice = document.getElementById('startup-error');
  if (notice) notice.hidden = false;
  console.error(error);
});
