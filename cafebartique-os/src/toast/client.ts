import { getToastAccessToken } from "./auth";
import { getToastConfig } from "./config";

async function toastRequest(
  env: Env,
  path: string,
  options: RequestInit = {}
) {
  const config = getToastConfig(env);
  const token = await getToastAccessToken(env);

  const response = await fetch(`${config.host}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": config.restaurantId,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Toast ${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`
    );
  }

  return text ? JSON.parse(text) : null;
}

export async function toastGet(env: Env, path: string) {
  return toastRequest(env, path, {
    method: "GET",
  });
}

export async function toastPost(
  env: Env,
  path: string,
  body: unknown
) {
  return toastRequest(env, path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}