import { fetchWithTimeout } from './request.js';

export async function getAccounts(fetcher) {
  let response;
  try {
    response = await fetchWithTimeout(fetcher, new URL('../../../data/accounts.json', import.meta.url), { cache: 'no-cache' });
  } catch { throw new Error('network'); }
  if (!response.ok) throw new Error('network');
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('invalidData'); }
  if (!payload?.accounts || typeof payload.accounts !== 'object' || Array.isArray(payload.accounts) || !Number.isFinite(Date.parse(payload.generatedAt))) throw new Error('invalidData');
  const accounts = Object.create(null);
  for (const [key, account] of Object.entries(payload.accounts)) {
    if (!account || !['ok', 'error', 'cached'].includes(account.status) || !Number.isFinite(Date.parse(account.updatedAt))) continue;
    if (account.status !== 'error') {
      if (!account.data || typeof account.data !== 'object') continue;
      if (key === 'youtube' && !Array.isArray(account.data.videos)) continue;
      if (key === 'articles' && !Array.isArray(account.data)) continue;
    }
    accounts[key] = account;
  }
  return { generatedAt: payload.generatedAt, accounts };
}
