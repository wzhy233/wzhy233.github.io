import { initLanguage } from './i18n.js';
import { initTheme } from './ui/theme.js';
import { initMotion } from './ui/motion.js';

initLanguage();
initTheme();
initMotion();
document.getElementById('year').textContent = String(new Date().getFullYear());
if (document.body.dataset.page === 'github') {
  const { initGithub } = await import('./pages/github.js');
  initGithub();
} else {
  const { initHome } = await import('./pages/home.js');
  initHome();
}
