import { escapeHtml as h, safeUrl, dateLabel } from '../utils/format.js';
import { t, getLanguage } from '../i18n.js';
import { calendarLayout, languageDistribution, languageColors } from '../utils/github-stats.js';

export function profileHtml(profile) {
  return `${profile.avatar ? `<img class="github-portrait" src="${h(profile.avatar)}" alt="" width="260" height="260" />` : ''}
    <h2>${h(profile.name)}</h2><p class="github-handle">@${h(profile.login)}</p>
    ${profile.bio ? `<p class="github-bio">${h(profile.bio)}</p>` : ''}
    <a class="github-follow" href="https://github.com/${h(profile.login)}" target="_blank" rel="noopener noreferrer">${t('followGithub')} ↗</a>
    <div class="profile-tags"><span>GitHub</span><span>${h(dateLabel(profile.joined))}</span></div>
    <ul class="profile-facts">${profile.company ? `<li>⌂ ${h(profile.company)}</li>` : ''}${profile.location ? `<li>⌖ ${h(profile.location)}</li>` : ''}<li>◷ ${t('joined')} ${h(dateLabel(profile.joined))}</li>${safeUrl(profile.website) ? `<li><a href="${h(profile.website)}" target="_blank" rel="noopener noreferrer">↗ ${h(profile.website)}</a></li>` : ''}</ul>
    <p class="profile-followers"><strong>${profile.followers}</strong> ${t('followers')} · <strong>${profile.following}</strong> ${t('following')}</p>`;
}

export function calendarHtml(data) {
  const { cells, weeks } = calendarLayout(data.days);
  const labels = [];
  const firstDay = cells.findIndex(Boolean);
  const month = new Intl.DateTimeFormat(getLanguage(), { month: 'short', timeZone: 'UTC' });
  cells.forEach((day, index) => {
    if (day && (index === firstDay || day.date.endsWith('-01'))) labels.push(`<span style="grid-column:${Math.floor(index / 7) + 1}">${h(month.format(new Date(`${day.date}T00:00:00Z`)))}</span>`);
  });
  return `<div class="calendar-scroll"><div class="calendar-months" style="--weeks:${weeks}">${labels.join('')}</div>
    <div class="contribution-grid" role="group" aria-label="${h(t('contribution'))}" style="--weeks:${weeks}">${cells.map((day, index) => {
      if (!day) return '<span class="contribution-cell calendar-padding" aria-hidden="true"></span>';
      const label = `${dateLabel(day.date)} · ${day.count} ${t('contributions')}`;
      return `<button type="button" class="contribution-cell" data-level="${day.level}" data-cell="${index}" data-label="${h(label)}" tabindex="${index === cells.findLastIndex(Boolean) ? '0' : '-1'}" title="${h(label)}" aria-label="${h(label)}"></button>`;
    }).join('')}</div></div>
    <div class="calendar-footer"><span id="contribution-detail" role="status">${t('lastYear')}: ${data.total} ${t('contributions')}</span><div class="calendar-legend"><span>${t('less')}</span>${[0, 1, 2, 3, 4].map(level => `<i data-level="${level}"></i>`).join('')}<span>${t('more')}</span></div></div>
    <p class="data-caption">${t('contributionNote')} · <a href="https://github.com/grubersjoe/github-contributions-api" target="_blank" rel="noopener noreferrer">${t('source')} ↗</a></p>`;
}

export function languagesHtml(repos) {
  const languages = languageDistribution(repos);
  if (!languages.length) return `<p class="data-empty">${t('noLanguages')}</p>`;
  let start = 0;
  const segments = languages.map(language => {
    const end = start + language.percent;
    const segment = `${language.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`;
    start = end;
    return segment;
  });
  return `<div class="language-panel"><p class="eyebrow">${t('languages')}</p><div class="language-tags">${languages.map(language => `<span><i style="background:${language.color}"></i>${h(language.name)}</span>`).join('')}</div></div>
    <div class="language-panel language-chart"><div class="language-donut" style="background:conic-gradient(${segments.join(',')})" role="img" aria-label="${h(languages.map(language => `${language.name} ${Math.round(language.percent)}%`).join(', '))}"><span>${languages.length}<small>${t('languages')}</small></span></div><ul>${languages.map(language => `<li><i style="background:${language.color}"></i><span>${h(language.name)}<small>${language.count} ${t('repoCount')}</small></span><strong>${Math.round(language.percent)}%</strong></li>`).join('')}</ul></div>`;
}

export function repositoriesHtml(repos) {
  if (!repos.length) return `<p class="data-empty">${t('emptyRepos')}</p>`;
  return repos.map(repo => `<article class="repository-card"><a href="${h(repo.url)}" target="_blank" rel="noopener noreferrer"><h3>${h(repo.name)} <span aria-hidden="true">↗</span></h3></a><span class="repository-kind">${t(repo.fork ? 'forks' : 'original')}${repo.archived ? ` / ${t('archived')}` : ''}</span><p>${h(repo.description || t('noDescription'))}</p><div class="repository-meta">${repo.language ? `<span><i style="background:${languageColors[repo.language] ?? '#8b9a88'}"></i>${h(repo.language)}</span>` : ''}<span>☆ ${repo.stars}</span>${repo.forks !== null ? `<span>⑂ ${repo.forks}</span>` : ''}<time datetime="${h(repo.updated)}">${h(dateLabel(repo.updated))}</time></div></article>`).join('');
}
