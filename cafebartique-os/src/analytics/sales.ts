type ToastOrder = {
  checks?: Array<{
    totalAmount?: number;
    selections?: Array<{
      displayName?: string;
      quantity?: number;
      price?: number;
      voided?: boolean;
    }>;
  }>;
};

export function calculateSalesMetrics(orders: ToastOrder[]) {
  let grossSales = 0;
  let checkCount = 0;
  const itemCounts = new Map<string, number>();

  for (const order of orders) {
    for (const check of order.checks ?? []) {
      grossSales += check.totalAmount ?? 0;
      checkCount += 1;

      for (const selection of check.selections ?? []) {
        if (selection.voided) continue;

        const name = selection.displayName?.trim();
        if (!name) continue;

        const quantity = selection.quantity ?? 1;
        itemCounts.set(name, (itemCounts.get(name) ?? 0) + quantity);
      }
    }
  }

  const averageTicket =
    checkCount > 0 ? Number((grossSales / checkCount).toFixed(2)) : 0;

  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({
      name,
      quantity,
    }));

  return {
    grossSales: Number(grossSales.toFixed(2)),
    checkCount,
    averageTicket,
    topItems,
  };
}