import { Context } from "hono";

export async function toastStatus(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  const requiredSecrets = [
    "TOAST_CLIENT_ID",
    "TOAST_CLIENT_SECRET",
    "TOAST_RESTAURANT_ID",
    "TOAST_HOST",
    "TOAST_ACCESS_TYPE",
  ];

  const missingSecrets = requiredSecrets.filter((key) => !env[key as keyof Env]);

  return c.json({
    service: "Toast POS",
    status: missingSecrets.length === 0 ? "Ready for authentication" : "Missing configuration",
    connected: false,
    missingSecrets,
    message:
      missingSecrets.length === 0
        ? "Toast credentials are configured. Next step is live authentication."
        : "Add the missing Toast environment variables before authentication.",
  });
}