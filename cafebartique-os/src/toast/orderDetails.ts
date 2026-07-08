import { Context } from "hono";
import { getOrderIdsForToday } from "../services/orders";

export async function toastOrderDetails(c: Context<{ Bindings: Env }>) {
  try {
    const { businessDate, orderIds } = await getOrderIdsForToday(c.env);

    return c.json({
      service: "Toast Order Details",
      connected: true,
      businessDate,
      orderCount: orderIds.length,
      orderIds,
      nextStep:
        "Next we will fetch full order details and calculate sales metrics.",
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