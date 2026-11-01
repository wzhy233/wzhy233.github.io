import { safeUrl } from '../utils/format.js';

const validRepo = /^[\w.-]+\/[\w.-]+$/;
const count = value => Number.isSafeInteger(value) && value >= 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export async function request(path, fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(`https://api.github.com/${path}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-cache',
    });
  } catch {
    throw new Error('network');
  }
  if (response.status === 403 || response.status === 429) throw new Error('rateLimit');
  if (response.status === 404) throw new Error('notFound');
  if (!response.ok) throw new Error('network');
  try {
    return await response.json();
  } catch {
    throw new Error('invalidData');
  }
}

export async function getProfile(user, fetcher) {
  const data = await request(`users/${encodeURIComponent(user)}`, fetcher);
  if (!data || !['followers', 'following', 'public_repos'].every(key => count(data[key])) || !validDate(data.created_at)) throw new Error('invalidData');
  return { name: typeof data.name === 'string' ? data.name : data.login, login: data.login,
    avatar: safeUrl(data.avatar_url), bio: typeof data.bio === 'string' ? data.bio : '',
    location: typeof data.location === 'string' ? data.location : null,
    company: typeof data.company === 'string' ? data.company : null,
    website: safeUrl(data.blog), followers: data.followers, following: data.following,
    repos: data.public_repos, joined: data.created_at };
}

export async function getRepository(fullName, fetcher) {
  if (!validRepo.test(fullName)) throw new Error('invalidData');
  const data = await request(`repos/${fullName}`, fetcher);
  if (!data || typeof data.full_name !== 'string' || !validRepo.test(data.full_name) || !count(data.stargazers_count) || !count(data.forks_count) || !count(data.open_issues_count) || !validDate(data.updated_at)) throw new Error('invalidData');
  const [owner, name] = data.full_name.split('/');
  return {
    owner, name, fullName: data.full_name,
    url: `https://github.com/${data.full_name}`,
    description: typeof data.description === 'string' ? data.description : '',
    language: typeof data.language === 'string' ? data.language : null,
    stars: data.stargazers_count, forks: data.forks_count, issues: data.open_issues_count,
    updated: data.updated_at,
    license: typeof data.license?.name === 'string' ? data.license.name : null,
    homepage: safeUrl(data.homepage), archived: data.archived === true,
  };
}

export function toActivity(event) {
  if (!event || typeof event.repo?.name !== 'string' || !validRepo.test(event.repo.name) || !validDate(event.created_at)) return null;
  const repo = event.repo.name;
  const url = `https://github.com/${repo}`;
  const payload = event.payload ?? {};
  const entry = { id: String(event.id ?? ''), type: event.type, repo, at: event.created_at, href: url, detail: repo };
  if (event.type === 'PushEvent') {
    const message = payload.commits?.[0]?.message;
    const size = count(payload.size) && payload.size > 0 ? payload.size : Array.isArray(payload.commits) ? payload.commits.length : null;
    const head = typeof payload.head === 'string' && /^[a-f0-9]{40}$/i.test(payload.head) ? payload.head : null;
    return { ...entry, title: size ? `推送了 ${size} 个提交` : '推送了代码', detail: typeof message === 'string' && message ? `${repo} · ${message.split('\n')[0]}` : head ? `${repo} · ${head.slice(0, 7)}` : repo, href: head ? `${url}/commit/${head}` : url };
  }
  if (event.type === 'ReleaseEvent') {
    const tag = typeof payload.release?.tag_name === 'string' ? payload.release.tag_name : '';
    return { ...entry, title: '发布了版本', detail: tag ? `${repo} · ${tag}` : repo, href: safeUrl(payload.release?.html_url, 'github.com') ?? `${url}/releases` };
  }
  if (event.type === 'CreateEvent' || event.type === 'DeleteEvent') {
    const kind = { repository: '仓库', branch: '分支', tag: '标签' }[payload.ref_type] ?? '引用';
    const ref = typeof payload.ref === 'string' ? payload.ref : '';
    return { ...entry, title: `${event.type === 'CreateEvent' ? '创建' : '删除'}了${kind}`, detail: ref ? `${repo} · ${ref}` : repo };
  }
  if (event.type === 'ForkEvent') return { ...entry, title: 'Fork 了仓库', href: safeUrl(payload.forkee?.html_url, 'github.com') ?? url };
  if (event.type === 'WatchEvent') return { ...entry, title: '标星了仓库' };
  if (event.type === 'PublicEvent') return { ...entry, title: '公开了仓库' };
  if (['IssuesEvent', 'PullRequestEvent', 'IssueCommentEvent', 'PullRequestReviewEvent'].includes(event.type)) {
    const item = payload.pull_request ?? payload.issue;
    const title = typeof item?.title === 'string' ? item.title : '';
    const action = { opened: '打开', closed: '关闭', reopened: '重新打开', edited: '编辑' }[payload.action] ?? '更新';
    const label = event.type === 'IssueCommentEvent' ? '评论了讨论' : event.type === 'PullRequestReviewEvent' ? '审阅了 Pull Request' : `${action}了 ${event.type === 'IssuesEvent' ? 'Issue' : 'Pull Request'}`;
    return { ...entry, title: label, detail: title ? `${repo} · ${title}` : repo, href: safeUrl(payload.comment?.html_url ?? payload.review?.html_url ?? item?.html_url, 'github.com') ?? url };
  }
  return null;
}

export async function getActivity(user, fetcher) {
  const data = await request(`users/${encodeURIComponent(user)}/events/public?per_page=30`, fetcher);
  if (!Array.isArray(data)) throw new Error('invalidData');
  return data.map(toActivity).filter(Boolean).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
}

export async function getRepositories(user, fetcher) {
  const repos = [];
  let page = 1;
  while (true) {
    const data = await request(`users/${encodeURIComponent(user)}/repos?type=owner&per_page=100&page=${page}`, fetcher);
    if (!Array.isArray(data)) throw new Error('invalidData');
    for (const repo of data) {
      if (typeof repo.full_name !== 'string' || !validRepo.test(repo.full_name) || !count(repo.stargazers_count) || !validDate(repo.updated_at)) throw new Error('invalidData');
      repos.push({ name: repo.full_name.split('/')[1], fullName: repo.full_name, url: `https://github.com/${repo.full_name}`,
        description: typeof repo.description === 'string' ? repo.description : '',
        language: typeof repo.language === 'string' ? repo.language : null,
        stars: repo.stargazers_count, forks: count(repo.forks_count) ? repo.forks_count : null,
        fork: repo.fork === true, archived: repo.archived === true, updated: repo.updated_at });
    }
    if (data.length < 100) return repos;
    page++;
    if (page > 100) throw new Error('invalidData');
  }
}

export async function getContributions(user, fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, { signal: AbortSignal.timeout(15000) });
  } catch { throw new Error('network'); }
  if (!response.ok) throw new Error(response.status === 429 ? 'rateLimit' : 'network');
  let data;
  try { data = await response.json(); }
  catch { throw new Error('invalidData'); }
  if (!Array.isArray(data.contributions) || !data.contributions.length || data.contributions.length > 371) throw new Error('invalidData');
  const dates = new Set();
  const days = data.contributions.map(day => {
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !validDate(day.date) || new Date(`${day.date}T00:00:00Z`).toISOString().slice(0, 10) !== day.date || !count(day.count) || !count(day.level) || day.level > 4 || dates.has(day.date)) throw new Error('invalidData');
    dates.add(day.date);
    return { date: day.date, count: day.count, level: day.level };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (days.some((day, index) => index && Date.parse(day.date) - Date.parse(days[index - 1].date) !== 86400000)) throw new Error('invalidData');
  return { days, total: count(data.total?.lastYear) ? data.total.lastYear : days.reduce((sum, day) => sum + day.count, 0) };
}
