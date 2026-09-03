import { toastSales } from "./toast/sales";
import { toastStatus } from "./toast/status";
import { toastLabor } from "./toast/labor";
import { getToastLaborAnalyticsForBusinessDate } from "./toast/laborAnalytics";
import { fromHono } from "chanfana";
import { executiveDashboard } from "./dashboard/executive";
import { runDailyToastSync } from "./jobs/dailyToastSync";
import { getLatestDailySnapshot } from "./storage/toastDaily";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

fromHono(app, {
  docs_url: "/",
});

app.get("/health", (c) =>
  c.json({
    status: "healthy",
    app: "Cafe Bartique OS",
    version: "1.0.0",
  })
);

app.get("/dashboard", executiveDashboard);

app.get("/marketing", (c) =>
  c.json({
    message: "Marketing intelligence endpoint ready",
    recommendation:
      "Once Toast is connected, this will suggest what to promote based on sales trends.",
  })
);

app.get("/inventory", (c) =>
  c.json({
    message: "Inventory endpoint ready",
    recommendation:
      "Once Toast or inventory data is connected, this will show low-stock and COGS alerts.",
  })
);

app.get("/toast/status", toastStatus);
app.get("/toast/sales", toastSales);
app.get("/toast/labor", toastLabor);

app.get("/toast/labor-analytics", async (c) => {
  try {
    const requestedBusinessDate =
      c.req.query("businessDate");

    if (
      !requestedBusinessDate ||
      !/^\d{8}$/.test(requestedBusinessDate)
    ) {
      return c.json(
        {
          service: "Toast Labor Analytics",
          connected: false,
          message:
            "A valid businessDate query parameter is required in YYYYMMDD format.",
        },
        400
      );
    }

    const result =
      await getToastLaborAnalyticsForBusinessDate(
        c.env,
        requestedBusinessDate
      );

    return c.json({
      service: "Toast Labor Analytics",
      connected: true,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Toast labor analytics error";

    return c.json(
      {
        service: "Toast Labor Analytics",
        connected: false,
        message,
      },
      500
    );
  }
});

app.get("/dashboard/executive", executiveDashboard);

app.post("/internal/sync/toast", async (c) => {
  try {
    const result = await runDailyToastSync(c.env);

    return c.json({
      service: "Cafe Bartique Daily Toast Sync",
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown daily Toast sync error";

    return c.json(
      {
        service: "Cafe Bartique Daily Toast Sync",
        status: "error",
        message,
      },
      500
    );
  }
});

app.get("/internal/sync/toast/latest", async (c) => {
  try {
    const snapshot = await getLatestDailySnapshot(c.env);

    if (!snapshot) {
      return c.json(
        {
          service: "Cafe Bartique Daily Toast Sync",
          status: "empty",
          message: "No stored Toast snapshot found.",
        },
        404
      );
    }

    return c.json({
      service: "Cafe Bartique Daily Toast Sync",
      status: "success",
      snapshot,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown snapshot read error";

    return c.json(
      {
        service: "Cafe Bartique Daily Toast Sync",
        status: "error",
        message,
      },
      500
    );
  }
});

export default {
  fetch: app.fetch,

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ) {
    await runDailyToastSync(env);
  },
};