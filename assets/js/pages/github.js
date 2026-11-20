import { githubUser } from '../../../config/site.js';
import { getProfile, getRepositories, getContributions, getActivity } from '../api/github.js';
import { profileHtml, calendarHtml, languagesHtml, repositoriesHtml } from '../ui/github-view.js';
import { activityHtml } from '../ui/render.js';
import { filterRepositories } from '../utils/github-stats.js';
import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h } from '../utils/format.js';

const byId = id => document.getElementById(id);

export function initGithub() {
  const state = {};
  let loading = false;
  let readAt;
  function content(key, renderer) {
    const item = state[key];
    return item?.error ? `<p class="data-empty load-error">${h(t(item.error))}</p>` : item?.value ? renderer(item.value) : `<p class="data-empty">${t('loading')}</p>`;
  }
  function renderRepos() {
    const fallback = state.repos?.error ? `<a class="plain-link" href="https://github.com/${githubUser}?tab=repositories">${t('openGithubRepos')} ↗</a>` : '';
    byId('github-repos').innerHTML = content('repos', repos => repositoriesHtml(filterRepositories(repos, { query: byId('repo-search').value, sort: byId('repo-sort').value, type: byId('repo-type').value }))) + fallback;
  }
  function render() {
    byId('github-profile').innerHTML = content('profile', profileHtml);
    const profile = state.profile?.value;
    byId('stat-repos').textContent = profile?.repos ?? '—';
    byId('stat-followers').textContent = profile?.followers ?? '—';
    byId('stat-years').textContent = profile ? Math.max(0, Math.floor((Date.now() - Date.parse(profile.joined)) / (365.2425 * 86400000))) : '—';
    byId('stat-stars').textContent = state.repos?.value ? state.repos.value.reduce((sum, repo) => sum + repo.stars, 0) : '—';
    byId('contribution-calendar').innerHTML = content('calendar', calendarHtml);
    byId('contribution-total').textContent = state.calendar?.value ? `${state.calendar.value.total} ${t('contributions')}` : '';
    byId('language-stats').innerHTML = content('repos', languagesHtml);
    byId('github-activity').innerHTML = state.activity?.error ? `<li class="data-empty load-error">${h(t(state.activity.error))}</li>` : state.activity?.value ? activityHtml(state.activity.value) : `<li class="data-empty">${t('loading')}</li>`;
    byId('github-sync').textContent = loading ? t('loading') : readAt ? `${t('updated')} ${readAt.toLocaleString(getLanguage(), { timeZone: 'Asia/Shanghai' })}` : t('unavailable');
    renderRepos();
  }
  async function load() {
    if (loading) return;
    loading = true;
    readAt = null;
    byId('refresh-github').disabled = true;
    for (const key of ['profile', 'repos', 'calendar', 'activity']) state[key] = {};
    render();
    await Promise.all([
      ['profile', getProfile], ['repos', getRepositories],
      ['calendar', getContributions], ['activity', getActivity],
    ].map(async ([key, loader]) => {
      try {
        state[key] = { value: await loader(githubUser) };
        if (key !== 'calendar') readAt = new Date();
      }
      catch (error) { state[key] = { error: error.message }; }
      render();
    }));
    loading = false;
    byId('refresh-github').disabled = false;
    render();
  }
  byId('refresh-github').addEventListener('click', () => void load());
  byId('repo-search').addEventListener('input', renderRepos);
  byId('repo-sort').addEventListener('change', renderRepos);
  byId('repo-type').addEventListener('change', renderRepos);
  document.addEventListener('languagechange', render);
  byId('contribution-calendar').addEventListener('click', event => {
    const cell = event.target.closest('[data-cell]');
    if (cell) byId('contribution-detail').textContent = cell.dataset.label;
  });
  byId('contribution-calendar').addEventListener('keydown', event => {
    const cell = event.target.closest('[data-cell]');
    if (!cell) return;
    const cells = [...document.querySelectorAll('[data-cell]')];
    const at = cells.indexOf(cell);
    const delta = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[event.key];
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? cells.length - 1 : delta ? Math.max(0, Math.min(cells.length - 1, at + delta)) : null;
    if (next === null) return;
    event.preventDefault();
    cell.tabIndex = -1;
    cells[next].tabIndex = 0;
    cells[next].focus();
    byId('contribution-detail').textContent = cells[next].dataset.label;
  });
  void load();
}
