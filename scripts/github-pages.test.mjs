import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = existsSync(new URL('../github-pages/index.html', import.meta.url)) ? new URL('../github-pages/', import.meta.url) : new URL('../', import.meta.url);
const api = await import(new URL('assets/js/api/github.js', root));
const { getPublishedGithub } = await import(new URL('assets/js/api/published-github.js', root));
const { getAccounts } = await import(new URL('assets/js/api/accounts.js', root));
const { messages, languages, t, initLanguage } = await import(new URL('assets/js/i18n.js', root));
const { projectHtml, activityHtml } = await import(new URL('assets/js/ui/render.js', root));
const { gameCards, journalCards } = await import(new URL('assets/js/pages/home.js', root));
const { calendarHtml, languagesHtml } = await import(new URL('assets/js/ui/github-view.js', root));
const { languageDistribution, calendarLayout, filterRepositories } = await import(new URL('assets/js/utils/github-stats.js', root));
const { safeUrl, when } = await import(new URL('assets/js/utils/format.js', root));
const htmlPages = ['index.html', 'github/index.html'].map(path => [new URL(path, root), readFileSync(new URL(path, root), 'utf8')]);
const ok = data => async () => ({ ok: true, status: 200, json: async () => data });
const repository = { full_name: 'wzhy233/Example', name: 'Example', description: 'Real source content', language: 'Java', stargazers_count: 4, forks_count: 2, open_issues_count: 1, updated_at: '2026-11-01T00:00:00Z', license: { name: 'MIT' } };
const event = { id: '1', type: 'PushEvent', repo: { name: 'wzhy233/Example' }, created_at: '2026-11-01T00:00:00Z', payload: {} };

test('both pages, relative assets, nested CSS and all module imports resolve', () => {
  const checked = new Set();
  function inspect(url) {
    assert.ok(url.href.startsWith(root.href), url.href);
    assert.ok(existsSync(url), url.href);
    if (checked.has(url.href)) return;
    checked.add(url.href);
    if (!/\.(js|css)$/.test(url.pathname)) return;
    const source = readFileSync(url, 'utf8');
    const pattern = url.pathname.endsWith('.css') ? /@import\s+['"]([^'"]+)['"]/g : /(?:from\s+|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;
    for (const [, path] of source.matchAll(pattern)) inspect(new URL(path, url));
  }
  for (const [url, html] of htmlPages) {
    for (const [, path] of html.matchAll(/(?:src|href)="(\.{1,2}\/[^"#?]+)"/g)) {
      const asset = new URL(path, url);
      inspect(asset.pathname.endsWith('/') ? new URL('index.html', asset) : asset);
    }
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.ok(checked.size > 20);
});

test('three complete dictionaries cover every static and literal dynamic translation key', () => {
  for (const [key, values] of Object.entries(messages)) {
    assert.equal(values.length, 3, key);
    for (const value of values) assert.ok(typeof value === 'string' && value.length, key);
    assert.doesNotMatch(values[2], /[\u3400-\u9fff]/, key);
  }
  for (const [, html] of htmlPages) for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(messages[key], key);
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) inspect(path);
      else if (entry.name.endsWith('.js')) for (const [, key] of readFileSync(path, 'utf8').matchAll(/\bt\('([^']+)'\)/g)) assert.ok(messages[key], `${entry.name}: ${key}`);
    }
  }
  inspect(new URL('assets/js/', root));
  assert.equal(t('private', 'en'), 'Private profile');
  assert.equal(t('home', 'zh-TW'), '首頁');
});

test('language changes update text, attributes, URL and cross-page links without fetching data', () => {
  const saved = new Map(['document', 'localStorage', 'location', 'navigator', 'history'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let change;
  let events = 0;
  const text = { dataset: { i18n: 'games' }, textContent: '' };
  const input = { dataset: { i18n: 'searchRepos', i18nAttr: 'placeholder aria-label' }, setAttribute(key, value) { this[key] = value; } };
  const link = { href: 'https://example.test/github/' };
  const selector = { value: '', addEventListener(_, callback) { change = callback; } };
  const document = { documentElement: {}, body: { dataset: { page: 'home' } }, querySelector: () => selector, querySelectorAll: query => query === '[data-internal]' ? [link] : [text, input], dispatchEvent() { events++; } };
  try {
    for (const [key, value] of Object.entries({ document, localStorage: { getItem: () => null, setItem() {} }, location: { href: 'https://example.test/?lang=zh-CN' }, navigator: { language: 'zh-CN' }, history: { replaceState() {} } })) Object.defineProperty(globalThis, key, { value, configurable: true });
    initLanguage();
    change({ target: { value: 'en' } });
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(text.textContent, 'Games');
    assert.equal(input['aria-label'], 'Search projects or descriptions');
    assert.match(link.href, /lang=en/);
    assert.equal(events, 1);
    change({ target: { value: 'zh-CN' } });
  } finally {
    for (const [key, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
});

test('profile, repositories and activity validate API responses and never invent counts', async () => {
  assert.equal((await api.getRepository('wzhy233/Example', ok(repository))).stars, 4);
  await assert.rejects(api.getProfile('wzhy233', ok({ followers: '13' })), /invalidData/);
  await assert.rejects(api.getRepository('bad/path/extra', ok(repository)), /invalidData/);
  await assert.rejects(api.getRepository('wzhy233/Example', ok({ ...repository, stargazers_count: -1 })), /invalidData/);
  assert.equal(api.toActivity(event).title, '推送了代码');
  assert.equal(api.toActivity({ ...event, payload: { size: 4 } }).title, '推送了 4 个提交');
  assert.deepEqual(await api.getActivity('wzhy233', ok([])), []);
  assert.equal(api.toActivity({ ...event, created_at: 'bad' }), null);
  await assert.rejects(api.request('users/a', async () => ({ ok: false, status: 403 })), /rateLimit/);
  await assert.rejects(api.request('users/a', async () => { throw new Error('offline'); }), /network/);
});

test('owned repository pagination includes every page before computing star totals', async () => {
  const requested = [];
  const repos = await api.getRepositories('wzhy233', async url => {
    requested.push(url);
    return { ok: true, json: async () => url.endsWith('page=1') ? Array.from({ length: 100 }, (_, index) => ({ ...repository, name: `repo${index}`, full_name: `wzhy233/repo${index}` })) : [repository] };
  });
  assert.equal(repos.length, 101);
  assert.equal(requested.length, 2);
  assert.equal(repos.reduce((sum, repo) => sum + repo.stars, 0), 404);
});

test('language chart counts original repositories by primary language, excluding forks', () => {
  const distribution = languageDistribution([{ language: 'Java', fork: false }, { language: 'Java', fork: false }, { language: 'C++', fork: false }, { language: 'Python', fork: true }, { language: null }]);
  assert.equal(distribution.length, 2);
  assert.equal(distribution[0].count, 2);
  assert.ok(Math.abs(distribution.reduce((sum, item) => sum + item.percent, 0) - 100) < .0001);
  assert.deepEqual(languageDistribution([]), []);
});

test('contribution calendar uses real daily counts, pads weeks and rejects malformed data', async () => {
  const days = [{ date: '2026-10-31', count: 2, level: 1 }, { date: '2026-11-01', count: 4, level: 2 }];
  const data = await api.getContributions('wzhy233', ok({ contributions: days }));
  assert.equal(data.total, 6);
  const layout = calendarLayout(days);
  assert.equal(layout.cells.length % 7, 0);
  assert.equal(layout.cells.filter(Boolean).length, 2);
  assert.match(calendarHtml(data), /data-level="2"/);
  assert.equal((calendarHtml(data).match(/tabindex="0"/g) || []).length, 1);
  assert.equal((calendarHtml(data).match(/style="grid-column:/g) || []).length, 2);
  const sameWeek = { days: [{ date: '2026-11-02', count: 1, level: 1 }, { date: '2026-11-03', count: 0, level: 0 }] };
  assert.equal((calendarHtml(sameWeek).match(/style="grid-column:/g) || []).length, 1);
  await assert.rejects(api.getContributions('wzhy233', ok({ contributions: [days[0], days[0]] })), /invalidData/);
  await assert.rejects(api.getContributions('wzhy233', ok({ contributions: [{ ...days[0], count: -1 }] })), /invalidData/);
  await assert.rejects(api.getContributions('wzhy233', ok({ contributions: [null] })), /invalidData/);
  await assert.rejects(api.getContributions('wzhy233', ok({ contributions: [days[0], { ...days[1], date: '2026-11-03' }] })), /invalidData/);
});

test('search, sorting and fork filtering use the loaded repository data', () => {
  const repos = [{ name: 'Alpha', description: 'music', language: 'Java', fork: false, stars: 2, updated: '2026-10-01' }, { name: 'Beta', description: 'tool', language: 'C++', fork: true, stars: 10, updated: '2026-11-01' }];
  assert.equal(filterRepositories(repos)[0].name, 'Beta');
  assert.equal(filterRepositories(repos, { type: 'original' }).length, 1);
  assert.equal(filterRepositories(repos, { query: 'JAVA' })[0].name, 'Alpha');
  assert.equal(filterRepositories(repos, { query: 'missing' }).length, 0);
});

test('Steam privacy suppresses presence and hours rather than inventing offline status', () => {
  const output = gameCards({ steam: { status: 'ok', updatedAt: new Date().toISOString(), data: { name: 'mevrik', privacy: 'friendsonly', state: 'offline', games: [{ hours: 300 }] } } });
  assert.match(output, /资料未公开/);
  assert.doesNotMatch(output, /offline|300|离线/);
});

test('journal displays only returned uploads and curated public articles', () => {
  const accounts = { youtube: { status: 'ok', data: { videos: [{ id: 'abcdefghijk', title: 'Real video', thumbnail: 'https://example.com/a.jpg', url: 'https://youtube.com/watch?v=abcdefghijk', published: '2026-01-01' }] } }, articles: { status: 'ok', data: [{ title: 'Real article', url: 'https://example.com/article' }] } };
  assert.match(journalCards(accounts, 'all'), /Real video/);
  assert.doesNotMatch(journalCards(accounts, 'writing'), /Real video/);
  assert.doesNotMatch(journalCards(accounts, 'videos'), /Real article/);
  assert.doesNotMatch(journalCards({ youtube: { status: 'error' } }, 'all'), /data-video=/);
});

test('published account feed validates timestamps and isolates unavailable source records', async () => {
  const payload = { generatedAt: '2026-11-01T00:00:00Z', accounts: { steam: { status: 'error', updatedAt: '2026-11-01T00:00:00Z', data: null } } };
  assert.equal((await getAccounts(ok(payload))).accounts.steam.status, 'error');
  await assert.rejects(getAccounts(ok({ accounts: {} })), /invalidData/);
});

test('published GitHub transport reuses API validators and keeps source timestamp', async () => {
  const data = { generatedAt: '2026-11-01T00:00:00Z', responses: { 'https://api.github.com/repos/wzhy233/Example': { status: 'ok', data: repository } } };
  const published = await getPublishedGithub(ok(data));
  assert.equal(published.updatedAt, data.generatedAt);
  assert.equal((await api.getRepository('wzhy233/Example', published.fetcher)).stars, 4);
  await assert.rejects(api.getProfile('wzhy233', published.fetcher), /network/);
});

test('untrusted source content is escaped, while invalid external URLs are rejected', async () => {
  const repo = await api.getRepository('wzhy233/Example', ok({ ...repository, description: '<img src=x onerror=alert(1)>', homepage: 'javascript:alert(1)' }));
  assert.equal(repo.homepage, null);
  const output = projectHtml('wzhy233/Example', 0, repo, null, '2026-11-01T00:00:00Z');
  assert.match(output, /&lt;img/);
  assert.doesNotMatch(output, /<img src=x/);
  assert.equal(safeUrl('https://github.com.evil.test/a', 'github.com'), null);
  assert.equal(safeUrl('https://user:pw@github.com/a'), null);
  assert.equal(when('invalid'), '');
  assert.match(activityHtml([]), /公开活动/);
});

test('file preview and blocked storage produce a readable local-mode notice', () => {
  const note = { hidden: true };
  const document = { documentElement: { dataset: {} }, getElementById: () => note, addEventListener: (_, callback) => callback() };
  vm.runInNewContext(readFileSync(new URL('assets/js/theme-boot.js', root), 'utf8'), { document, location: { protocol: 'file:' }, localStorage: { getItem() { throw new Error('blocked'); } } });
  assert.equal(note.hidden, false);
  assert.equal(document.documentElement.dataset.theme, 'light');
});
