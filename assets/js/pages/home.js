import { projects, githubUser } from '../../../config/site.js';
import { getAccounts } from '../api/accounts.js';
import { getProfile, getRepository } from '../api/github.js';
import { getPublishedGithub } from '../api/published-github.js';
import { projectHtml } from '../ui/render.js';
import { t, getLanguage } from '../i18n.js';
import { escapeHtml as h, safeUrl, dateLabel } from '../utils/format.js';

const byId = id => document.getElementById(id);
const stamp = record => `<p class="data-caption${Date.now() - Date.parse(record.updatedAt) > 7200000 ? ' stale' : ''}">${t('updated')} ${h(new Date(record.updatedAt).toLocaleString(getLanguage(), { timeZone: 'Asia/Shanghai' }))}${Date.now() - Date.parse(record.updatedAt) > 7200000 ? ` · ${t('stale')}` : ''}</p>`;
const image = (url, className = '') => safeUrl(url) ? `<img src="${h(safeUrl(url))}" class="${className}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : '';
const metric = (value, label) => `<div><strong>${h(value ?? '—')}</strong><span>${t(label)}</span></div>`;

export function gameCards(accounts) {
  const mc = accounts?.minecraft;
  const steam = accounts?.steam;
  const m = mc?.status === 'ok' ? mc.data : null;
  const s = steam?.status === 'ok' ? steam.data : null;
  const skin = safeUrl(m?.skin, 'textures.minecraft.net');
  return `<article class="game-card minecraft-card">
    <div class="game-art minecraft-art"><span class="game-wordmark">MINECRAFT</span>${skin ? `<div class="skin-head"><img src="${h(skin)}" alt="${h(t('skin'))}" /></div>` : '<span class="game-pixel" aria-hidden="true">▦</span>'}<span class="game-edition">JAVA EDITION</span></div>
    <div class="game-body"><p class="eyebrow">MINECRAFT</p><h3>${h(m?.name ?? 'minecraftmc33')}</h3>
      <p>${t(m ? 'verified' : accounts ? 'unavailable' : 'loading')}</p>
      ${m ? `<code class="uuid">${h(m.uuid)}</code><button class="text-button" type="button" data-copy="${h(m.name)}">${t('copy')} ID ↗</button>` : ''}
      ${mc ? stamp(mc) : ''}
    </div>
  </article>
  <article class="game-card steam-card">
    <div class="game-art cs-art"><span class="game-wordmark">COUNTER-STRIKE 2</span><span class="cs-numeral" aria-hidden="true">2</span><span class="game-edition">STEAM</span></div>
    <div class="game-body"><p class="eyebrow">CS2 / STEAM</p><div class="game-identity">${image(s?.avatar, 'account-avatar')}<h3>${h(s?.name ?? 'Steam')}</h3></div>
      <p>${t(s ? s.privacy === 'public' ? 'public' : 'private' : accounts ? 'unavailable' : 'loading')}</p>
      ${s?.privacy !== 'public' && s ? `<p class="privacy-note">${t('privateDetail')}</p>` : ''}
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
      <button type="button" class="video-cover" data-video="${h(video.id)}" aria-label="${h(t('watch'))}: ${h(video.title)}">${image(video.thumbnail)}<span class="play-icon" aria-hidden="true">▶</span></button>
      <div class="journal-card-body"><p class="eyebrow">YOUTUBE / ${h(dateLabel(video.published))}</p><h3>${h(video.title)}</h3><a class="plain-link" href="${h(safeUrl(video.url) ?? youtube.source)}" target="_blank" rel="noopener noreferrer">${t('watch')} ↗</a></div>
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
  return `<p class="eyebrow">BILIBILI</p>${image(data?.avatar, 'channel-avatar')}<h3>${h(data?.name ?? 'Bilibili')}</h3><p>${h(data?.bio || t(data ? 'recordingText' : account ? 'unavailable' : 'loading'))}</p><div class="channel-stats">${metric(data?.followers, 'followers')}${metric(data?.videos, 'uploads')}${metric(data?.likes, 'likes')}</div><a class="solid-button" href="${h(safeUrl(account?.source) ?? 'https://space.bilibili.com/3537123286190803')}" target="_blank" rel="noopener noreferrer">${t('channel')} ↗</a>${account ? stamp(account) : ''}`;
}

export function initHome() {
  let accounts = null;
  let accountError = null;
  let filter = 'all';
  const repos = projects.map(() => ({ loading: true }));
  let github = null;
  function render() {
    byId('game-accounts').innerHTML = gameCards(accounts);
    byId('journal-entries').innerHTML = journalCards(accounts, filter);
    byId('bili-profile').innerHTML = channelCard(accounts?.bilibili);
    if (accountError) {
      byId('game-accounts').innerHTML = `<p class="load-error">${h(t(accountError))}</p>`;
      byId('journal-entries').innerHTML = `<p class="load-error">${h(t(accountError))}</p>`;
    }
    byId('home-projects').innerHTML = repos.map((item, index) => `<li>${projectHtml(projects[index], index, item.value, item.error ? t(item.error) : null, item.at)}</li>`).join('');
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
    catch (error) { accounts = null; accountError = error.message; }
    finally { button.disabled = false; render(); }
  }
  async function loadProject(index) {
    if (!repos[index] || repos[index].pending) return;
    repos[index] = { loading: true, pending: true };
    try {
      if (!github) github = await getPublishedGithub();
      repos[index] = { value: await getRepository(projects[index], github.fetcher), at: github.updatedAt };
    }
    catch (error) { repos[index] = { error: error.message }; }
    render();
  }
  function clock() { byId('local-clock').textContent = new Date().toLocaleTimeString(getLanguage(), { timeZone: 'Asia/Shanghai', hour12: false }); }
  const dialog = byId('video-dialog');
  dialog.addEventListener('close', () => byId('video-frame').removeAttribute('src'));
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
      if (!video) return;
      byId('video-title').textContent = video.title;
      byId('video-frame').src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`;
      byId('video-external').href = video.url;
      dialog.showModal();
    }
    if (button.hasAttribute('data-close-video')) dialog.close();
    if (/^project-\d+$/.test(button.dataset.reload ?? '')) void loadProject(Number(button.dataset.reload.slice(8)));
  });
  document.addEventListener('languagechange', () => { render(); clock(); });
  render();
  clock();
  setInterval(clock, 1000);
  void loadAccounts();
  getPublishedGithub().then(data => {
    github = data;
    projects.forEach((_, index) => void loadProject(index));
    return getProfile(githubUser, github.fetcher);
  }).then(profile => {
    document.querySelectorAll('[data-github-avatar]').forEach(img => { if (profile.avatar) img.src = profile.avatar; });
  }).catch(error => {
    repos.forEach((_, index) => { if (repos[index].loading) repos[index] = { error: error.message }; });
    render();
  });
}
