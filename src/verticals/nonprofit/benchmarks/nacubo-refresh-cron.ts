export class NacuboRefreshStaleWarning extends Error {
  constructor(public readonly retainedVintage: string) {
    super(`NACUBO refresh failed — retaining prior vintage ${retainedVintage} (Q-G1=A).`);
    this.name = "NacuboRefreshStaleWarning";
  }
}

export function refreshNacuboVintage(
  currentVintage: string,
  fetch: () => Promise<string>,
): Promise<{ vintage: string; warning?: NacuboRefreshStaleWarning }> {
  return fetch()
    .then((next) => ({ vintage: next }))
    .catch(() => ({
      vintage: currentVintage,
      warning: new NacuboRefreshStaleWarning(currentVintage),
    }));
}

export async function runNacuboRefreshCron(
  currentVintage: string,
  fetch: () => Promise<string>,
): Promise<{ vintage: string; stale: boolean }> {
  const result = await refreshNacuboVintage(currentVintage, fetch);
  return {
    vintage: result.vintage,
    stale: Boolean(result.warning),
  };
}
