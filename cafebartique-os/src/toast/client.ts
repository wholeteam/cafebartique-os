import { getToastAccessToken } from "./auth";
import { getToastConfig } from "./config";

export async function toastGet(env: Env, path: string) {
  const config = getToastConfig(env);
  const token = await getToastAccessToken(env);

  const response = await fetch(`${config.host}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": config.restaurantId,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Toast GET ${path} failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}