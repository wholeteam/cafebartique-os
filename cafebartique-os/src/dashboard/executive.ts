import { Context } from "hono";
import { getOrderDetailsForToday } from "../services/orders";
import { calculateSalesMetrics } from "../analytics/sales";

export async function executiveDashboard(
  c: Context<{ Bindings: Env }>
) {
  try {
    const { businessDate, orders } =
      await getOrderDetailsForToday(c.env);

    const sales = calculateSalesMetrics(orders);

    return c.json({
      service: "Cafe Bartique Executive Dashboard",
      status: "Live",
      businessDate,
      sales,
      modules: {
        toast: "Connected",
        labor: "Coming next",
        inventory: "Coming next",
        marketing: "Coming next",
        recommendations: "Coming next",
      },
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Cafe Bartique Executive Dashboard",
        status: "Error",
        message: error.message,
      },
      500
    );
  }
}