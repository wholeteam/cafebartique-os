import { Context } from "hono";
import { toastGet } from "./client";

/**
 * Exports Toast configuration used for Clover migration.
 * Includes discounts/promo codes, tax rates, service charges,
 * and dining options/order behaviors.
 */
export async function toastConfigExport(c: Context<{ Bindings: Env }>) {
  try {
    const [discounts, taxRates, serviceCharges, diningOptions] =
      await Promise.all([
        toastGet(c.env, "/config/v2/discounts"),
        toastGet(c.env, "/config/v2/taxRates"),
        toastGet(c.env, "/config/v2/serviceCharges"),
        toastGet(c.env, "/config/v2/diningOptions"),
      ]);

    return c.json({
      service: "Cafe Bartique Toast Configuration Export",
      status: "success",
      generatedAt: new Date().toISOString(),
      source: "Toast Configuration API V2",
      counts: {
        discounts: Array.isArray(discounts) ? discounts.length : 0,
        taxRates: Array.isArray(taxRates) ? taxRates.length : 0,
        serviceCharges: Array.isArray(serviceCharges) ? serviceCharges.length : 0,
        diningOptions: Array.isArray(diningOptions) ? diningOptions.length : 0,
      },
      data: {
        discounts,
        taxRates,
        serviceCharges,
        diningOptions,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Cafe Bartique Toast Configuration Export",
        status: "error",
        generatedAt: new Date().toISOString(),
        message:
          error?.message ?? "Unable to retrieve Toast configuration data.",
      },
      500
    );
  }
}
