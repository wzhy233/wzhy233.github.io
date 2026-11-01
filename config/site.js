import accounts from './accounts.json' with { type: 'json' };
import selectedProjects from './projects.json' with { type: 'json' };

export const githubUser = accounts.github;
// Editorial selection; account metadata always comes from the public data collector.
export const projects = selectedProjects;
