import { Context } from "hono";
import { getOrderDetailsForToday } from "../services/orders";

export async function toastOrderDetails(
  c: Context<{ Bindings: Env }>
) {
  try {
    const { businessDate, orderIds, orders } =
      await getOrderDetailsForToday(c.env);

    return c.json({
      service: "Toast Order Details",
      connected: true,
      businessDate,
      orderCount: orderIds.length,
      detailedOrderCount: orders.length,
      sampleOrder: orders[0] ?? null,
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