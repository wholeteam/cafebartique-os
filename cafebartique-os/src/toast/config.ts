export function getToastConfig(env: Env) {
  return {
    clientId: env.TOAST_CLIENT_ID,
    clientSecret: env.TOAST_CLIENT_SECRET,
    restaurantId: env.TOAST_RESTAURANT_ID,
    host: env.TOAST_HOST,
    accessType: env.TOAST_ACCESS_TYPE,
  };
}