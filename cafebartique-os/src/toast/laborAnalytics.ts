import { toastGet, toastPost } from "./client";

type AnalyticsLaborRow = {
  restaurantGuid?: string;
  businessDate?: string | number;

  regularHours?: number;
  overtimeHours?: number;
  totalHours?: number;

  regularCost?: number;
  overtimeCost?: number;
  totalCost?: number;

  netSalesAmount?: number | null;
  grossSalesAmount?: number | null;

  netSalesPerEmployeeHour?: number | null;
  grossSalesPerEmployeeHour?: number | null;

  totalCostPerNetSales?: number | null;
  totalCostPerGrossSales?: number | null;
};

function money(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function round(value: number | null, decimals = 2) {
  if (value === null) {
    return null;
  }

  const factor = Math.pow(10, decimals);

  return (
    Math.round((value + Number.EPSILON) * factor) /
    factor
  );
}

function extractReportGuid(data: unknown): string {
  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  if (data && typeof data === "object") {
    const candidate =
      (data as any).reportRequestGuid ??
      (data as any).guid ??
      (data as any).requestGuid;

    if (
      typeof candidate === "string" &&
      candidate.length > 0
    ) {
      return candidate;
    }
  }

  throw new Error(
    "Toast Analytics Labor did not return a reportRequestGuid."
  );
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getToastLaborAnalyticsForBusinessDate(
  env: Env,
  businessDate: string
) {
  const createResponse = await toastPost(
    env,
    "/era/v1/labor/day",
    {
      startBusinessDate: businessDate,
      endBusinessDate: businessDate,
      restaurantIds: [],
      excludedRestaurantIds: [],
    }
  );

  const reportRequestGuid =
    extractReportGuid(createResponse);

  let reportData: unknown = null;

  for (let attempt = 1; attempt <= 8; attempt++) {
    const result = await toastGet(
      env,
      `/era/v1/labor/${reportRequestGuid}`
    );

    if (Array.isArray(result)) {
      reportData = result;
      break;
    }

    await wait(1000);
  }

  if (!Array.isArray(reportData)) {
    throw new Error(
      "Toast Analytics Labor report was not ready after polling."
    );
  }

  const rows =
    reportData as AnalyticsLaborRow[];

  const row = rows.find(
    (item) =>
      String(item.businessDate) === businessDate
  );

  if (!row) {
    throw new Error(
      `Toast Analytics Labor returned no row for ${businessDate}.`
    );
  }

  return {
    source: "Toast Analytics API",
    businessDate,

    regularHours: round(
      money(row.regularHours)
    ),

    overtimeHours: round(
      money(row.overtimeHours)
    ),

    totalHours: round(
      money(row.totalHours)
    ),

    regularCost: round(
      money(row.regularCost)
    ),

    overtimeCost: round(
      money(row.overtimeCost)
    ),

    totalCost: round(
      money(row.totalCost)
    ),

    netSalesAmount: round(
      money(row.netSalesAmount)
    ),

    grossSalesAmount: round(
      money(row.grossSalesAmount)
    ),

    salesPerLaborHour: round(
      money(row.netSalesPerEmployeeHour)
    ),

    laborPercent: round(
      money(row.totalCostPerNetSales)
    ),

    totalCostPerGrossSales: round(
      money(row.totalCostPerGrossSales)
    ),

    reportRequestGuid,
  };
}
