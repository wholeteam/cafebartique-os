import { getToastConfig } from "./config";

const TOKEN_KEY = "toast_access_token";

type CachedToastToken = {
  accessToken: string;
  expiresAt: number;
};

let memoryToken: CachedToastToken | null = null;

function isValidToken(token: CachedToastToken | null): token is CachedToastToken {
  return !!(
    token?.accessToken &&
    token.expiresAt &&
    Date.now() < token.expiresAt - 5 * 60 * 1000
  );
}

export async function getToastAccessToken(env: Env): Promise<string> {
  // 1. Fast in-memory cache
  if (isValidToken(memoryToken)) {
    return memoryToken.accessToken;
  }

  // 2. Persistent Cloudflare KV cache
  const kvToken =
    await env.TOAST_TOKEN_CACHE.get<CachedToastToken>(
      TOKEN_KEY,
      "json"
    );

  if (isValidToken(kvToken)) {
    memoryToken = kvToken;
    return kvToken.accessToken;
  }

  // 3. Only authenticate with Toast if no valid cached token exists
  const config = getToastConfig(env);

  const response = await fetch(
    `${config.host}/authentication/v1/authentication/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        userAccessType: config.accessType,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Toast authentication failed: ${response.status} ${errorText}`
    );
  }

  const data: any = await response.json();

  const accessToken = data?.token?.accessToken;

  if (!accessToken) {
    throw new Error(
      "Toast authentication succeeded but no access token was returned."
    );
  }

  const expiresInSeconds =
    typeof data?.token?.expiresIn === "number"
      ? data.token.expiresIn
      : 86400;

  const cachedToken: CachedToastToken = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };

  memoryToken = cachedToken;

  await env.TOAST_TOKEN_CACHE.put(
    TOKEN_KEY,
    JSON.stringify(cachedToken),
    {
      expirationTtl: Math.max(expiresInSeconds, 60),
    }
  );

  return accessToken;
}