import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h, dateLabel, readTime, when } from '../utils/format.js';

export function projectHtml(fullName, index, repo, error, at) {
  const [owner, name] = fullName.split('/');
  const title = repo?.name ?? name;
  const message = error || (repo ? repo.description || t('noDescription') : t('loading'));
  const metadata = repo ? `
    <span class="language">${h(repo.language || t('unspecified'))}</span>
    <span aria-label="${repo.stars} ${t('stars')}">☆ ${repo.stars}</span>
    <span aria-label="${repo.forks} Forks">⑂ ${repo.forks}</span>
  ` : `<span>${t(error ? 'unavailable' : 'loading')}</span>`;
  const detail = repo ? `
    <dl class="project-facts">
      <div><dt>${t('recentlyUpdated')}</dt><dd>${h(dateLabel(repo.updated))}</dd></div>
      <div><dt>${t('license')}</dt><dd>${h(repo.license || t('unspecified'))}</dd></div>
      <div><dt>${t('issues')}</dt><dd>${repo.issues}</dd></div>
      <div><dt>${t('public')}</dt><dd>${t(repo.archived ? 'archived' : 'public')}</dd></div>
    </dl>
    <nav class="project-links" aria-label="${h(title)} links">
      <a href="${h(repo.url)}" target="_blank" rel="noopener noreferrer">${t('codeLink')} ↗</a>
      <a href="${h(repo.url)}/releases" target="_blank" rel="noopener noreferrer">${t('releases')} ↗</a>
      ${repo.homepage ? `<a href="${h(repo.homepage)}" target="_blank" rel="noopener noreferrer">${t('website')} ↗</a>` : ''}
    </nav>
    <p class="data-caption">${t('source')}: GitHub · ${t('updated')} <time datetime="${h(at)}">${h(readTime(at))}</time></p>
  ` : `
    <p>${h(error || t('loading'))}</p>
    <a href="https://github.com/${h(fullName)}" target="_blank" rel="noopener noreferrer">${t('codeLink')} ↗</a>
    ${error ? `<button type="button" class="text-button" data-reload="project-${index}">${t('retry')}</button>` : ''}
  `;
  return `<details class="project">
    <summary class="work">
      <span class="work-index">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h3>${h(title)}</h3>
        <div class="work-owner">${h(repo?.owner ?? owner)}</div>
        <p class="work-desc${error ? ' load-error' : ''}">${h(message)}</p>
      </div>
      <div class="work-meta">${metadata}</div>
      <span class="work-arrow" aria-hidden="true">+</span>
    </summary>
    <div class="project-detail">${detail}</div>
  </details>`;
}

export function activityHtml(items) {
  if (!items.length) return `<li class="data-empty">${t('emptyActivity')}</li>`;
  return items.map(item => `<li>
    <a href="${h(item.href)}" target="_blank" rel="noopener noreferrer">
      <strong>${h(activityTitle(item))}</strong>
      <span class="activity-detail">${h(item.detail)}</span>
      <time datetime="${h(item.at)}" title="${h(new Date(item.at).toLocaleString(getLanguage(), { timeZone: 'Asia/Shanghai' }))}">${h(when(item.at))}</time>
    </a>
  </li>`).join('');
}

export function activityTitle(item) {
  const keys = { PushEvent: 'push', ReleaseEvent: 'release', ForkEvent: 'fork', WatchEvent: 'star', CreateEvent: 'create', DeleteEvent: 'remove' };
  return t(keys[item.type] ?? 'discussion');
}
