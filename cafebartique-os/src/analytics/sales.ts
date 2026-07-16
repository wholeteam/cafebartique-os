type ToastPayment = {
  amount?: number;
  tipAmount?: number;
  refund?: {
    refundAmount?: number;
  } | null;
  refundStatus?: string;
};

type ToastDiscount = {
  discountAmount?: number;
  amount?: number;
};

type ToastSelection = {
  displayName?: string;
  quantity?: number;
  voided?: boolean;
};

type ToastCheck = {
  amount?: number;
  totalAmount?: number;
  taxAmount?: number;
  voided?: boolean;
  openedDate?: string;
  appliedDiscounts?: ToastDiscount[];
  payments?: ToastPayment[];
  selections?: ToastSelection[];
};

type ToastOrder = {
  checks?: ToastCheck[];
};

export function calculateSalesMetrics(orders: ToastOrder[]) {
  let totalCollected = 0;
  let netSales = 0;
  let taxes = 0;
  let tips = 0;
  let discounts = 0;
  let refunds = 0;
  let checkCount = 0;

  const itemCounts = new Map<string, number>();
  const salesByHour = new Map<number, number>();

  for (const order of orders) {
    for (const check of order.checks ?? []) {
      if (check.voided) continue;

      const checkNetSales = check.amount ?? 0;
      const checkTax = check.taxAmount ?? 0;
      const checkTotal = check.totalAmount ?? 0;

      totalCollected += checkTotal;
      netSales += checkNetSales;
      taxes += checkTax;
      checkCount += 1;

      for (const discount of check.appliedDiscounts ?? []) {
        discounts +=
          discount.discountAmount ??
          discount.amount ??
          0;
      }

      for (const payment of check.payments ?? []) {
        tips += payment.tipAmount ?? 0;

        if (payment.refund) {
          refunds += payment.refund.refundAmount ?? 0;
        }
      }

      for (const selection of check.selections ?? []) {
        if (selection.voided) continue;

        const name = selection.displayName?.trim();
        if (!name) continue;

        const quantity = selection.quantity ?? 1;

        itemCounts.set(
          name,
          (itemCounts.get(name) ?? 0) + quantity
        );
      }

      if (check.openedDate) {
        const easternHour = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York",
            hour: "2-digit",
            hour12: false,
          }).format(new Date(check.openedDate))
        );

        salesByHour.set(
          easternHour,
          (salesByHour.get(easternHour) ?? 0) + checkNetSales
        );
      }
    }
  }

  const averageTicket =
    checkCount > 0 ? netSales / checkCount : 0;

  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({
      name,
      quantity,
    }));

  const hourlySales = [...salesByHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, sales]) => ({
      hour,
      sales: Number(sales.toFixed(2)),
    }));

  return {
    totalCollected: Number(totalCollected.toFixed(2)),
    netSales: Number(netSales.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    tips: Number(tips.toFixed(2)),
    discounts: Number(discounts.toFixed(2)),
    refunds: Number(refunds.toFixed(2)),
    checkCount,
    averageTicket: Number(averageTicket.toFixed(2)),
    topItems,
    hourlySales,
  };
}