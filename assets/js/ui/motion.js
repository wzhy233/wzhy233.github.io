export function initMotion() {
  if (!('IntersectionObserver' in window)) return;
  const sections = document.querySelectorAll('main > .section');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.04 });
  sections.forEach(section => {
    section.classList.add('reveal-ready');
    observer.observe(section);
  });
}
