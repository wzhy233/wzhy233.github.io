export const languageColors = { JavaScript: '#f1e05a', TypeScript: '#3178c6', Java: '#b07219', Python: '#3572a5', 'C++': '#f34b7d', C: '#8c8c8c', Rust: '#dea584', Shell: '#89e051', HTML: '#e34c26', CSS: '#8753bb', Lua: '#5265ad', Kotlin: '#a97bff' };

export function languageDistribution(repositories) {
  const counts = new Map();
  for (const repo of repositories) {
    if (!repo.fork && repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count, percent: count / total * 100, color: languageColors[name] ?? '#8b9a88' }));
}

export function calendarLayout(days) {
  if (!days.length) return { cells: [], weeks: 0 };
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const cells = [...Array(offset).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return { cells, weeks: cells.length / 7 };
}

export function filterRepositories(repositories, { query = '', type = 'all', sort = 'stars' } = {}) {
  const needle = query.trim().toLowerCase();
  return repositories.filter(repo => (type === 'all' || (type === 'fork' ? repo.fork : !repo.fork)) && `${repo.name} ${repo.description} ${repo.language ?? ''}`.toLowerCase().includes(needle)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'updated' ? Date.parse(b.updated) - Date.parse(a.updated) : b.stars - a.stars || a.name.localeCompare(b.name));
}
