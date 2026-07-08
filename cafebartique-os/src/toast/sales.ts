import { Context } from "hono";
import { toastGet } from "./client";

export async function toastSales(c: Context<{ Bindings: Env }>) {
  try {
    // This is our first live Toast API call.
    // We may adjust the endpoint depending on your Toast subscription.
   const today = new Date();
const businessDate =
  today.getFullYear().toString() +
  String(today.getMonth() + 1).padStart(2, "0") +
  String(today.getDate()).padStart(2, "0");

const data = await toastGet(
  c.env,
  `/orders/v2/orders?businessDate=${businessDate}`
);

    return c.json({
      service: "Toast Orders",
      connected: true,
      data,
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Toast Orders",
        connected: false,
        message: error.message,
      },
      500
    );
  }
}