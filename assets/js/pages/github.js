import { githubUser } from '../../../config/site.js';
import { getProfile, getRepositories, getContributions, getActivity } from '../api/github.js';
import { getPublishedGithub } from '../api/published-github.js';
import { profileHtml, calendarHtml, languagesHtml, repositoriesHtml } from '../ui/github-view.js';
import { activityHtml } from '../ui/render.js';
import { filterRepositories } from '../utils/github-stats.js';
import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h } from '../utils/format.js';

const byId = id => document.getElementById(id);

export function initGithub() {
  const state = {};
  let loading = false;
  let readAt = null;
  function content(key, renderer) {
    const item = state[key];
    return item?.error ? `<p class="data-empty load-error">${h(t(item.error))}</p>` : item?.value ? renderer(item.value) : `<p class="data-empty">${t('loading')}</p>`;
  }
  function renderRepos() {
    byId('github-repos').innerHTML = content('repos', repos => repositoriesHtml(filterRepositories(repos, { query: byId('repo-search').value, sort: byId('repo-sort').value, type: byId('repo-type').value })));
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
    const anySuccess = Object.values(state).some(item => item.value);
    const stale = readAt && Date.now() - Date.parse(readAt) > 7200000;
    byId('github-sync').textContent = loading ? t('loading') : anySuccess ? `${t('source')}: GitHub · ${t('updated')} ${new Date(readAt).toLocaleString(getLanguage(), { timeZone: 'Asia/Shanghai' })}${stale ? ` · ${t('stale')}` : ''}` : t('unavailable');
    renderRepos();
  }
  async function load() {
    if (loading) return;
    loading = true;
    byId('refresh-github').disabled = true;
    for (const key of ['profile', 'repos', 'calendar', 'activity']) state[key] = {};
    render();
    let published;
    try { published = await getPublishedGithub(); }
    catch (error) {
      for (const key of ['profile', 'repos', 'calendar', 'activity']) state[key] = { error: error.message };
      loading = false;
      byId('refresh-github').disabled = false;
      render();
      return;
    }
    readAt = published.updatedAt;
    await Promise.allSettled([
      ['profile', () => getProfile(githubUser, published.fetcher)], ['repos', () => getRepositories(githubUser, published.fetcher)],
      ['calendar', () => getContributions(githubUser, published.fetcher)], ['activity', () => getActivity(githubUser, published.fetcher)],
    ].map(async ([key, loader]) => {
      try { state[key] = { value: await loader() }; }
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
