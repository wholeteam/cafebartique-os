import { getToastConfig } from "./config";

export async function getToastAccessToken(env: Env) {
  const config = getToastConfig(env);

  const response = await fetch(`${config.host}/authentication/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      userAccessType: config.accessType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Toast authentication failed: ${response.status} ${errorText}`);
  }

  const data: any = await response.json();
  return data.token.accessToken;
}