import { buildExecutiveDashboard } from "../dashboard/executive";
import { saveDailySnapshot } from "../storage/toastDaily";

function getYesterdayBusinessDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  return (
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0")
  );
}

export async function runDailyToastSync(env: Env) {
  const businessDate = getYesterdayBusinessDate();

  const dashboard = await buildExecutiveDashboard(
    env,
    businessDate
  );

  await saveDailySnapshot(
    env,
    businessDate,
    dashboard
  );

  return {
    status: "success",
    businessDate,
    syncedAt: new Date().toISOString(),
  };
}
