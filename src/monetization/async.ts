/** Runs a store/ad SDK call; any unexpected error becomes `fallback` instead of crashing the game. */
export async function safe<T>(fn: () => Promise<T>, fallback: T, tag = 'monetization'): Promise<T> {
  try { return await fn(); } catch (e) { console.warn(`[${tag}]`, e); return fallback; }
}

/** Resolves with `fallback` if `p` takes longer than `ms`, so the game never waits forever. */
export function withTimeout<T, F>(p: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(fallback); });
  });
}
