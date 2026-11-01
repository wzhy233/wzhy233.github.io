export async function getPublishedGithub(fetcher = globalThis.fetch) {
  const response = await fetcher(new URL('../../../data/github.json', import.meta.url), { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('network');
  const payload = await response.json();
  if (!payload.responses || !Number.isFinite(Date.parse(payload.generatedAt))) throw new Error('invalidData');
  return {
    updatedAt: payload.generatedAt,
    // Reuse the same validation and normalization as the live public API.
    fetcher: async url => {
      const record = payload.responses[String(url)];
      return { ok: record?.status === 'ok', status: record?.status === 'ok' ? 200 : 503, json: async () => record?.data };
    },
  };
}
