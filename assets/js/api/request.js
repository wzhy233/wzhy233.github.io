export async function fetchWithTimeout(fetcher, url, options, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const requested = { ...options, signal: controller.signal };
    return await (fetcher ? fetcher(url, requested) : globalThis.fetch(url, requested));
  } finally {
    clearTimeout(timer);
  }
}
