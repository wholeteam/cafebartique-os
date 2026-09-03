import { Context } from "hono";
import { toastGet } from "./client";

/**
 * Returns Toast's fully resolved Menus API V2 payload for the configured
 * restaurant. This snapshot preserves menu -> group -> item -> modifier
 * relationships so it can be transformed into a Clover migration workbook.
 */
export async function toastMenuExport(c: Context<{ Bindings: Env }>) {
  try {
    const menu = await toastGet(c.env, "/menus/v2/menus");

    return c.json({
      service: "Cafe Bartique Toast Menu Export",
      status: "success",
      generatedAt: new Date().toISOString(),
      source: "Toast Menus API V2",
      restaurantGuid: menu?.restaurantGuid ?? null,
      lastUpdated: menu?.lastUpdated ?? null,
      restaurantTimeZone: menu?.restaurantTimeZone ?? null,
      menuCount: Array.isArray(menu?.menus) ? menu.menus.length : 0,
      data: menu,
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Cafe Bartique Toast Menu Export",
        status: "error",
        generatedAt: new Date().toISOString(),
        message: error?.message ?? "Unable to retrieve Toast menu data.",
      },
      500
    );
  }
}
