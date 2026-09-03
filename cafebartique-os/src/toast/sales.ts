import { Context } from "hono";
import { toastGet } from "./client";

const ATLANTA_TIME_ZONE = "America/New_York";
const PAGE_SIZE = 100;

function getYesterdayBusinessDate(): string {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ATLANTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const localTodayUtc = new Date(Date.UTC(year, month - 1, day));
  localTodayUtc.setUTCDate(localTodayUtc.getUTCDate() - 1);

  return (
    localTodayUtc.getUTCFullYear().toString() +
    String(localTodayUtc.getUTCMonth() + 1).padStart(2, "0") +
    String(localTodayUtc.getUTCDate()).padStart(2, "0")
  );
}

export async function getToastOrdersForBusinessDate(
  env: Env,
  businessDate: string
) {
  const allOrders: unknown[] = [];
  let page = 1;

  while (true) {
    const orders = await toastGet(
      env,
      `/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${PAGE_SIZE}&page=${page}`
    );

    if (!Array.isArray(orders)) {
      throw new Error(
        "Toast ordersBulk returned an unexpected response."
      );
    }

    allOrders.push(...orders);

    if (orders.length < PAGE_SIZE) {
      break;
    }

    page += 1;

    if (page > 100) {
      throw new Error(
        "Toast ordersBulk pagination exceeded safety limit."
      );
    }
  }

  return {
    businessDate,
    orders: allOrders,
  };
}

export async function toastSales(
  c: Context<{ Bindings: Env }>
) {
  try {
    const businessDate = getYesterdayBusinessDate();

    const result = await getToastOrdersForBusinessDate(
      c.env,
      businessDate
    );

    return c.json({
      service: "Toast Orders",
      connected: true,
      source: "Toast Orders Bulk API",
      businessDate,
      orderCount: result.orders.length,
      data: result.orders,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Toast sales error";

    return c.json(
      {
        service: "Toast Orders",
        connected: false,
        message,
      },
      500
    );
  }
}