import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h, dateLabel, when } from '../utils/format.js';

export function projectHtml(repo) {
  return `<details class="project">
    <summary class="work">
      <div>
        <h3>${h(repo.name)}</h3>
        <div class="work-owner">${h(repo.owner)}</div>
        ${repo.description ? `<p class="work-desc">${h(repo.description)}</p>` : ''}
      </div>
      <div class="work-meta">
        ${repo.language ? `<span class="language">${h(repo.language)}</span>` : ''}
        <span aria-label="${repo.stars} ${t('stars')}">☆ ${repo.stars}</span>
        ${repo.forks !== null ? `<span aria-label="${repo.forks} Forks">⑂ ${repo.forks}</span>` : ''}
      </div>
      <span class="work-arrow" aria-hidden="true">+</span>
    </summary>
    <div class="project-detail">
      <dl class="project-facts">
        <div><dt>${t('recentlyUpdated')}</dt><dd>${h(dateLabel(repo.updated))}</dd></div>
        ${repo.license ? `<div><dt>${t('license')}</dt><dd>${h(repo.license)}</dd></div>` : ''}
        ${repo.issues !== null ? `<div><dt>${t('issues')}</dt><dd>${repo.issues}</dd></div>` : ''}
        ${repo.archived ? `<div><dt>${t('repoType')}</dt><dd>${t('archived')}</dd></div>` : ''}
      </dl>
      <nav class="project-links" aria-label="${h(repo.name)}">
        <a href="${h(repo.url)}" target="_blank" rel="noopener noreferrer">${t('codeLink')} ↗</a>
        <a href="${h(repo.url)}/releases" target="_blank" rel="noopener noreferrer">${t('releases')} ↗</a>
        ${repo.homepage ? `<a href="${h(repo.homepage)}" target="_blank" rel="noopener noreferrer">${t('website')} ↗</a>` : ''}
      </nav>
    </div>
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
