export async function getAccounts(fetcher = globalThis.fetch) {
  let response;
  try {
    response = await fetcher(new URL('../../../data/accounts.json', import.meta.url), { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
  } catch { throw new Error('network'); }
  if (!response.ok) throw new Error('network');
  const payload = await response.json();
  if (!payload.accounts || !Number.isFinite(Date.parse(payload.generatedAt))) throw new Error('invalidData');
  for (const account of Object.values(payload.accounts)) {
    if (!['ok', 'error'].includes(account.status) || !Number.isFinite(Date.parse(account.updatedAt))) throw new Error('invalidData');
  }
  return payload;
}
