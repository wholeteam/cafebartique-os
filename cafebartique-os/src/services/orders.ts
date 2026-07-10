import { toastGet } from "../toast/client";

export function getBusinessDate() {
  const today = new Date();

  return (
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0")
  );
}

export async function getOrderIdsForToday(env: Env) {
  const businessDate = getBusinessDate();

  const orderIds = await toastGet(
    env,
    `/orders/v2/orders?businessDate=${businessDate}`
  );

  return {
    businessDate,
    orderIds: Array.isArray(orderIds) ? orderIds : [],
  };
}

export async function getOrderDetailsForToday(env: Env) {
  const businessDate = getBusinessDate();

  const orders = await toastGet(
    env,
    `/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100&page=1`
  );

  const normalizedOrders = Array.isArray(orders) ? orders : [];

  return {
    businessDate,
    orderIds: normalizedOrders
      .map((order: any) => order.guid)
      .filter(Boolean),
    orders: normalizedOrders,
  };
}