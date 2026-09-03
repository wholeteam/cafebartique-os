import { Context } from "hono";
import { toastGet } from "./client";

type ToastTimeEntry = {
  guid?: string;
  deleted?: boolean;
  businessDate?: string | number;
  regularHours?: number;
  overtimeHours?: number;
  hourlyWage?: number;
  autoClockedOut?: boolean;
  inDate?: string;
  outDate?: string | null;
  employeeReference?: {
    guid?: string;
  };
  jobReference?: {
    guid?: string;
  };
};

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : 0;
}

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getYesterdayBusinessDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayParts = formatter.formatToParts(new Date());

  const year = Number(
    todayParts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    todayParts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    todayParts.find((part) => part.type === "day")?.value
  );

  const yesterdayUtc = new Date(
    Date.UTC(year, month - 1, day - 1)
  );

  return (
    yesterdayUtc.getUTCFullYear().toString() +
    String(yesterdayUtc.getUTCMonth() + 1).padStart(2, "0") +
    String(yesterdayUtc.getUTCDate()).padStart(2, "0")
  );
}

export async function getToastLaborForBusinessDate(
  env: Env,
  businessDate: string
) {
  const rawData = await toastGet(
    env,
    `/labor/v1/timeEntries?businessDate=${businessDate}&includeArchived=false&includeMissedBreaks=true`
  );

  if (!Array.isArray(rawData)) {
    throw new Error(
      "Toast Labor timeEntries returned an unexpected response."
    );
  }

  const timeEntries = (rawData as ToastTimeEntry[]).filter(
    (entry) => !entry.deleted
  );

  let regularHours = 0;
  let overtimeHours = 0;
  let regularLaborCost = 0;
  let overtimeLaborCost = 0;
  let incompleteEntries = 0;
  let autoClockOuts = 0;

  const employeeIds = new Set<string>();

  for (const entry of timeEntries) {
    const regular = money(entry.regularHours);
    const overtime = money(entry.overtimeHours);
    const wage = money(entry.hourlyWage);

    regularHours += regular;
    overtimeHours += overtime;

    regularLaborCost += regular * wage;
    overtimeLaborCost += overtime * wage * 1.5;

    if (!entry.outDate) {
      incompleteEntries += 1;
    }

    if (entry.autoClockedOut) {
      autoClockOuts += 1;
    }

    if (entry.employeeReference?.guid) {
      employeeIds.add(entry.employeeReference.guid);
    }
  }

  const totalHours = regularHours + overtimeHours;
  const laborCost = regularLaborCost + overtimeLaborCost;

  return {
    businessDate,
    timeEntryCount: timeEntries.length,
    employeeCount: employeeIds.size,
    regularHours: round(regularHours),
    overtimeHours: round(overtimeHours),
    totalHours: round(totalHours),
    regularLaborCost: round(regularLaborCost),
    overtimeLaborCost: round(overtimeLaborCost),
    laborCost: round(laborCost),
    incompleteEntries,
    autoClockOuts,
    timeEntries,
  };
}

export async function toastLabor(
  c: Context<{ Bindings: Env }>
) {
  try {
    const requestedBusinessDate =
      c.req.query("businessDate");

    const businessDate =
      requestedBusinessDate &&
      /^\d{8}$/.test(requestedBusinessDate)
        ? requestedBusinessDate
        : getYesterdayBusinessDate();

    const result = await getToastLaborForBusinessDate(
      c.env,
      businessDate
    );

    return c.json({
      service: "Toast Labor",
      connected: true,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Toast labor error";

    return c.json(
      {
        service: "Toast Labor",
        connected: false,
        message,
      },
      500
    );
  }
}