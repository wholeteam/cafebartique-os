import { Context } from "hono";
import { getToastAccessToken } from "./auth";

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

  if (missingSecrets.length > 0) {
    return c.json({
      service: "Toast POS",
      status: "Missing configuration",
      connected: false,
      missingSecrets,
      message: "Add the missing Toast environment variables before authentication.",
    });
  }

  try {
    await getToastAccessToken(env);

    return c.json({
      service: "Toast POS",
      status: "Connected",
      connected: true,
      message: "Toast authentication succeeded.",
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Toast POS",
        status: "Authentication failed",
        connected: false,
        message: error.message,
      },
      500
    );
  }
}