import { toastSales } from "./toast/sales";
import { toastStatus } from "./toast/status";
import { toastMenuExport } from "./toast/menu";
import { fromHono } from "chanfana";
import { executiveDashboard } from "./dashboard/executive";
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

app.get("/dashboard", (c) =>
  c.json({
    message: "Cafe Bartique dashboard endpoint ready",
    sales: "Toast connection coming next",
    labor: "Toast labor endpoint coming next",
    inventory: "Inventory endpoint coming next",
  })
);

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
app.get("/toast/menu-export", toastMenuExport);
app.get("/dashboard/executive", executiveDashboard);
export default app;
