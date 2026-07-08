import { Context } from "hono";
import { toastGet } from "./client";

function getBusinessDate() {
  const today = new Date();

  return (
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0")
  );
}

export async function toastOrderDetails(c: Context<{ Bindings: Env }>) {
  try {
    const businessDate = getBusinessDate();

    const orderIds = await toastGet(
      c.env,
      `/orders/v2/orders?businessDate=${businessDate}`
    );

    return c.json({
      service: "Toast Order Details",
      connected: true,
      businessDate,
      orderCount: Array.isArray(orderIds) ? orderIds.length : 0,
      orderIds,
      nextStep:
        "Next we will use these order IDs to fetch detailed order data and calculate sales metrics.",
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Toast Order Details",
        connected: false,
        message: error.message,
      },
      500
    );
  }
}