type DailySnapshot = {
  businessDate: string;
  generatedAt: string;
  payload: unknown;
};

function snapshotKey(businessDate: string) {
  return `toast:daily:${businessDate}`;
}

export async function saveDailySnapshot(
  env: Env,
  businessDate: string,
  payload: unknown
) {
  const snapshot: DailySnapshot = {
    businessDate,
    generatedAt: new Date().toISOString(),
    payload,
  };

  await env.ANALYTICS_CACHE.put(
    snapshotKey(businessDate),
    JSON.stringify(snapshot)
  );

  await env.ANALYTICS_CACHE.put(
    "toast:daily:latest",
    JSON.stringify(snapshot)
  );
}

export async function getDailySnapshot(
  env: Env,
  businessDate: string
): Promise<DailySnapshot | null> {
  return env.ANALYTICS_CACHE.get<DailySnapshot>(
    snapshotKey(businessDate),
    "json"
  );
}

export async function getLatestDailySnapshot(
  env: Env
): Promise<DailySnapshot | null> {
  return env.ANALYTICS_CACHE.get<DailySnapshot>(
    "toast:daily:latest",
    "json"
  );
}