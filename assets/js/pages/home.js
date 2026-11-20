import { githubUser, relatedProject } from '../../../config/site.js';
import { getAccounts } from '../api/accounts.js';
import { getProfile, getRepositories, getRepository } from '../api/github.js';
import { projectHtml } from '../ui/render.js';
import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h, safeUrl, dateLabel } from '../utils/format.js';
import { filterRepositories } from '../utils/github-stats.js';
import { initVideoDialog } from '../ui/video.js';

const byId = id => document.getElementById(id);
function stamp(record) {
  const cached = record.status === 'cached';
  const stale = Date.now() - Date.parse(record.updatedAt) > 7200000;
  return `<p class="data-caption${cached || stale ? ' stale' : ''}">${t(cached ? 'cachedGame' : 'updated')} ${h(new Date(record.updatedAt).toLocaleString(getLanguage(), { timeZone: 'Asia/Shanghai' }))}${stale && !cached ? ` · ${t('stale')}` : ''}</p>`;
}
const image = (url, className = '') => safeUrl(url) ? `<img src="${h(safeUrl(url))}" class="${className}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : '';
const metric = (value, label) => `<div><strong>${h(value ?? '—')}</strong><span>${t(label)}</span></div>`;

export function gameCards(accounts, failed = false) {
  const mc = accounts?.minecraft;
  const steam = accounts?.steam;
  const m = mc?.data;
  const s = steam?.data;
  const unavailable = accounts || failed ? 'unavailable' : 'loading';
  const skin = safeUrl(m?.skin, 'textures.minecraft.net');
  return `<article class="game-card minecraft-card">
    <div class="game-art minecraft-art"><span class="game-wordmark">MINECRAFT</span>${skin ? `<div class="skin-head"><img src="${h(skin)}" alt="${h(t('skin'))}" /></div>` : '<span class="game-pixel" aria-hidden="true">▦</span>'}<span class="game-edition">JAVA EDITION</span></div>
    <div class="game-body"><p class="eyebrow">MINECRAFT</p><h3>${h(m?.name ?? 'minecraftmc33')}</h3>
      <p>${t(m ? 'verified' : unavailable)}</p>
      ${m ? `<code class="uuid">${h(m.uuid)}</code>` : ''}<button class="text-button" type="button" data-copy="${h(m?.name ?? 'minecraftmc33')}">${t('copy')} ID ↗</button>
      ${mc ? stamp(mc) : ''}
    </div>
  </article>
  <article class="game-card steam-card">
    <div class="game-art cs-art"><span class="game-wordmark">COUNTER-STRIKE 2</span><span class="cs-numeral" aria-hidden="true">2</span><span class="game-edition">STEAM</span></div>
    <div class="game-body"><p class="eyebrow">CS2 / STEAM</p><div class="game-identity">${image(s?.avatar, 'account-avatar')}<h3>${h(s?.name ?? 'Steam')}</h3></div>
      ${steam?.status === 'ok' && s ? `<p>${t(s.privacy === 'public' ? 'public' : 'private')}</p>` : s ? '' : `<p>${t(unavailable)}</p>`}
      ${steam?.status === 'ok' && s && s.privacy !== 'public' ? `<p class="privacy-note">${t('privateDetail')}</p>` : ''}
      <a class="plain-link" href="https://steamcommunity.com/profiles/76561199375918969/" target="_blank" rel="noopener noreferrer">${t('openProfile')} ↗</a>
      ${steam ? stamp(steam) : ''}
    </div>
  </article>`;
}

export function journalCards(accounts, filter) {
  const youtube = accounts?.youtube;
  const writing = accounts?.articles;
  let html = '';
  if (filter !== 'writing' && youtube?.status === 'ok') {
    html += youtube.data.videos.map(video => `<article class="journal-card video-card">
      <button type="button" class="video-cover" data-video="${h(video.id)}" aria-haspopup="dialog" aria-label="${h(t('watch'))}: ${h(video.title)}">${image(video.thumbnail)}<span class="play-icon" aria-hidden="true">▶</span></button>
      <div class="journal-card-body"><p class="eyebrow">YouTube · ${h(dateLabel(video.published))}</p><h3>${h(video.title)}</h3><button type="button" class="text-button" data-video="${h(video.id)}" aria-haspopup="dialog">${t('watch')}</button></div>
    </article>`).join('');
  }
  if (filter !== 'videos' && writing?.status === 'ok') {
    html += writing.data.map(article => `<article class="journal-card writing-card"><div class="writing-cover" aria-hidden="true"><span>文</span><small>BILIBILI / COLUMN</small></div><div class="journal-card-body"><p class="eyebrow">BILIBILI / ${t('writing')}</p><h3>${h(article.title)}</h3><a class="plain-link" href="${h(safeUrl(article.url) ?? writing.source)}" target="_blank" rel="noopener noreferrer">${t('read')} ↗</a></div></article>`).join('');
  }
  if (html) return html;
  return `<p class="data-empty">${t(accounts ? 'emptyJournal' : 'loading')}</p>`;
}

function channelCard(account) {
  const data = account?.status === 'ok' ? account.data : null;
  return `<p class="eyebrow">Bilibili</p>${image(data?.avatar, 'channel-avatar')}<h3>${h(data?.name ?? 'Bilibili')}</h3>${data?.bio ? `<p>${h(data.bio)}</p>` : ''}${data ? `<div class="channel-stats">${metric(data.followers, 'followers')}${metric(data.videos, 'uploads')}${metric(data.likes, 'likes')}</div>` : `<p>${t(account ? 'unavailable' : 'loading')}</p>`}<a class="solid-button" href="${h(safeUrl(account?.source) ?? 'https://space.bilibili.com/3537123286190803')}" target="_blank" rel="noopener noreferrer">${t('channel')} ↗</a>${account ? stamp(account) : ''}`;
}

export function initHome() {
  let accounts = null;
  let accountError = null;
  let filter = 'all';
  let projects = [];
  let projectsLoading;
  let projectError;
  function renderProjects() {
    const rows = projects.map(repo => `<li>${projectHtml(repo)}</li>`).join('');
    let status = '';
    if (projectsLoading) status = `<li class="data-empty">${t('loading')}</li>`;
    else if (projectError) status = `<li class="data-empty load-error">${h(t(projectError))} <button type="button" class="text-button" data-retry-projects>${t('retry')}</button></li>`;
    else if (!rows) status = `<li class="data-empty">${t('emptyPublicProjects')}</li>`;
    byId('home-projects').innerHTML = rows + status;
  }
  function render() {
    byId('game-accounts').innerHTML = gameCards(accounts, Boolean(accountError));
    byId('journal-entries').innerHTML = journalCards(accounts, filter);
    byId('bili-profile').innerHTML = channelCard(accounts?.bilibili);
    const status = byId('account-sync');
    if (status) {
      status.hidden = !accountError;
      status.textContent = accountError ? t(accountError) : '';
    }
    if (accountError && !accounts) {
      byId('journal-entries').innerHTML = `<a class="plain-link" href="https://www.youtube.com/@wzhy233">${t('watchExternal')} ↗</a>`;
    }
    const links = [
      ['Bilibili', 'clips', 'https://space.bilibili.com/3537123286190803'],
      ['YouTube', 'clips', 'https://www.youtube.com/@wzhy233'],
      ['X', 'thoughts', 'https://x.com/wzhy233'],
      ['GitHub', 'code', 'https://github.com/wzhy233'],
      ['Steam', 'gaming', 'https://steamcommunity.com/profiles/76561199375918969/'],
      ['Pastebin', 'paste', 'https://host.91net.top/pastebin'],
    ];
    byId('social-directory').innerHTML = links.map(([name, caption, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><strong>${name}</strong><span>${t(caption)}</span><span aria-hidden="true">↗</span></a>`).join('');
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  async function loadAccounts() {
    const button = document.querySelector('[data-refresh-accounts]');
    if (button.disabled) return;
    button.disabled = true;
    accountError = null;
    try { accounts = (await getAccounts()).accounts; }
    catch (error) { accountError = error.message; }
    finally { button.disabled = false; render(); }
  }
  async function loadProjects() {
    projectsLoading = true;
    projectError = null;
    projects = [];
    renderProjects();
    const [owned, related] = await Promise.allSettled([getRepositories(githubUser), getRepository(relatedProject)]);
    if (owned.status === 'fulfilled') {
      const personalRepos = owned.value.filter(repo => !repo.archived && ![githubUser, `${githubUser}.github.io`].includes(repo.name.toLowerCase()));
      projects = filterRepositories(personalRepos, { type: 'original', sort: 'updated' }).slice(0, 4);
    } else {
      projectError = owned.reason.message;
    }
    if (related.status === 'fulfilled' && !projects.some(repo => repo.fullName === related.value.fullName)) projects.push(related.value);
    projectsLoading = false;
    renderProjects();
  }
  function clock() { byId('local-clock').textContent = new Date().toLocaleTimeString(getLanguage(), { timeZone: 'Asia/Shanghai', hour12: false }); }
  const openVideo = initVideoDialog();
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.filter) { filter = button.dataset.filter; render(); }
    if (button.hasAttribute('data-refresh-accounts')) void loadAccounts();
    if (button.dataset.copy) {
      const toast = byId('toast');
      try { await navigator.clipboard.writeText(button.dataset.copy); toast.textContent = t('copied'); }
      catch { toast.textContent = `${t('copyFailed')}: ${button.dataset.copy}`; }
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 3000);
    }
    if (button.dataset.video && /^[\w-]{11}$/.test(button.dataset.video)) {
      const video = accounts?.youtube?.data?.videos.find(item => item.id === button.dataset.video);
      if (video) openVideo(video);
    }
    if (button.hasAttribute('data-retry-projects')) void loadProjects();
  });
  document.addEventListener('languagechange', () => { render(); renderProjects(); clock(); });
  render();
  clock();
  setInterval(clock, 1000);
  void loadAccounts();
  void loadProjects();
  getProfile(githubUser).then(profile => {
    document.querySelectorAll('[data-github-avatar]').forEach(img => { if (profile.avatar) img.src = profile.avatar; });
  }).catch(() => { /* Keep the local avatar if GitHub is unavailable. */ });
}
