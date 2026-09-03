import { Context } from "hono";
import { getToastOrdersForBusinessDate } from "../toast/sales";
import { getToastLaborForBusinessDate } from "../toast/labor";

type AppliedDiscount = {
  discountAmount?: number;
};

type ToastPayment = {
  amount?: number;
  tipAmount?: number;
  refundStatus?: string;
  refund?: {
    refundAmount?: number;
    tipRefundAmount?: number;
  } | null;
};

type ToastSelection = {
  displayName?: string;
  quantity?: number;
  price?: number;
  preDiscountPrice?: number;
  voided?: boolean;
  refundDetails?: {
    refundAmount?: number;
    taxRefundAmount?: number;
  } | null;
  appliedDiscounts?: AppliedDiscount[];
  modifiers?: ToastSelection[];
};

type ToastCheck = {
  amount?: number;
  totalAmount?: number;
  taxAmount?: number;
  paymentStatus?: string;
  voided?: boolean;
  deleted?: boolean;
  selections?: ToastSelection[];
  appliedDiscounts?: AppliedDiscount[];
  payments?: ToastPayment[];
};

type ToastOrder = {
  guid?: string;
  businessDate?: number;
  deleted?: boolean;
  voided?: boolean;
  source?: string;
  deliveryInfo?: unknown;
  estimatedFulfillmentDate?: string | null;
  checks?: ToastCheck[];
};

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getYesterdayBusinessDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayParts = formatter.formatToParts(new Date());

  const year = Number(
    todayParts.find((part) => part.type === "year")?.value
  );
  const month = Number(
    todayParts.find((part) => part.type === "month")?.value
  );
  const day = Number(
    todayParts.find((part) => part.type === "day")?.value
  );

  const yesterdayUtc = new Date(
    Date.UTC(year, month - 1, day - 1)
  );

  return (
    yesterdayUtc.getUTCFullYear().toString() +
    String(yesterdayUtc.getUTCMonth() + 1).padStart(2, "0") +
    String(yesterdayUtc.getUTCDate()).padStart(2, "0")
  );
}

function discountTotal(discounts?: AppliedDiscount[]): number {
  return Array.isArray(discounts)
    ? discounts.reduce(
        (sum, discount) => sum + money(discount.discountAmount),
        0
      )
    : 0;
}

function classifyOrderType(
  order: ToastOrder
): "dineIn" | "takeout" | "delivery" | "other" {
  const source = (order.source ?? "").toLowerCase();

  if (order.deliveryInfo) {
    return "delivery";
  }

  if (
    source.includes("delivery") ||
    source.includes("doordash") ||
    source.includes("ubereats") ||
    source.includes("grubhub")
  ) {
    return "delivery";
  }

  if (
    source.includes("online") ||
    source.includes("pickup") ||
    source.includes("takeout") ||
    source.includes("take-out")
  ) {
    return "takeout";
  }

  if (source.includes("in store") || source.includes("in-store")) {
    return "dineIn";
  }

  return "other";
}

export async function buildExecutiveDashboard(
  env: Env,
  businessDate: string
) {
  const [toastResult, laborResult] = await Promise.all([
    getToastOrdersForBusinessDate(env, businessDate),
    getToastLaborForBusinessDate(env, businessDate),
  ]);

  const orders = (toastResult.orders as ToastOrder[]).filter(
    (order) => !order.deleted && !order.voided
  );

  let grossSales = 0;
  let netSales = 0;
  let taxes = 0;
  let tips = 0;
  let discounts = 0;
  let refunds = 0;
  let checkCount = 0;

  const itemTotals = new Map<
    string,
    {
      name: string;
      quantity: number;
      grossSales: number;
      netSales: number;
    }
  >();

  const modifierTotals = new Map<
    string,
    {
      name: string;
      quantity: number;
    }
  >();

  const orderMix = {
    dineIn: { orders: 0, sales: 0 },
    takeout: { orders: 0, sales: 0 },
    delivery: { orders: 0, sales: 0 },
    other: { orders: 0, sales: 0 },
  };

  for (const order of orders) {
    const checks = Array.isArray(order.checks) ? order.checks : [];
    let orderNetSales = 0;

    for (const check of checks) {
      if (check.deleted || check.voided) {
        continue;
      }

      checkCount += 1;

      const checkNetSales = money(check.amount);
      const taxAmount = money(check.taxAmount);

      const checkTips = Array.isArray(check.payments)
        ? check.payments.reduce(
            (sum, payment) => sum + money(payment.tipAmount),
            0
          )
        : 0;

      const checkLevelDiscounts = discountTotal(
        check.appliedDiscounts
      );

      const selections = Array.isArray(check.selections)
        ? check.selections
        : [];

      let selectionDiscounts = 0;
      let selectionGross = 0;

      for (const selection of selections) {
        if (selection.voided) {
          continue;
        }

        const itemName =
          selection.displayName?.trim() || "Unnamed Item";

        const quantity =
          typeof selection.quantity === "number"
            ? selection.quantity
            : 1;

        const basePrice = money(
          selection.preDiscountPrice ?? selection.price
        );

        const selectionGrossSales = basePrice * quantity;
        const selectionDiscount = discountTotal(
          selection.appliedDiscounts
        );

        selectionGross += selectionGrossSales;
        selectionDiscounts += selectionDiscount;

        const existingItem = itemTotals.get(itemName) ?? {
          name: itemName,
          quantity: 0,
          grossSales: 0,
          netSales: 0,
        };

        existingItem.quantity += quantity;
        existingItem.grossSales += selectionGrossSales;
        existingItem.netSales +=
          selectionGrossSales - selectionDiscount;

        itemTotals.set(itemName, existingItem);

        const modifiers = Array.isArray(selection.modifiers)
          ? selection.modifiers
          : [];

        for (const modifier of modifiers) {
          if (modifier.voided) {
            continue;
          }

          const modifierName =
            modifier.displayName?.trim() || "Unnamed Modifier";

          const modifierQuantity =
            typeof modifier.quantity === "number"
              ? modifier.quantity
              : 1;

          const existingModifier =
            modifierTotals.get(modifierName) ?? {
              name: modifierName,
              quantity: 0,
            };

          existingModifier.quantity += modifierQuantity;

          modifierTotals.set(
            modifierName,
            existingModifier
          );
        }

        if (selection.refundDetails) {
          refunds +=
            money(selection.refundDetails.refundAmount) +
            money(selection.refundDetails.taxRefundAmount);
        }
      }

      const paymentRefunds = Array.isArray(check.payments)
        ? check.payments.reduce((sum, payment) => {
            if (!payment.refund) {
              return sum;
            }

            return (
              sum +
              money(payment.refund.refundAmount) +
              money(payment.refund.tipRefundAmount)
            );
          }, 0)
        : 0;

      refunds += paymentRefunds;

      const totalDiscounts =
        checkLevelDiscounts + selectionDiscounts;

      netSales += checkNetSales;
      taxes += taxAmount;
      tips += checkTips;
      discounts += totalDiscounts;

      const reconstructedGross =
        selectionGross > 0
          ? selectionGross
          : checkNetSales + totalDiscounts;

      grossSales += reconstructedGross;
      orderNetSales += checkNetSales;
    }

    const orderType = classifyOrderType(order);

    orderMix[orderType].orders += 1;
    orderMix[orderType].sales += orderNetSales;
  }

  const topItems = [...itemTotals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15)
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      grossSales: roundCurrency(item.grossSales),
      netSales: roundCurrency(item.netSales),
    }));

  const topModifiers = [...modifierTotals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  const averageTicket =
    checkCount > 0 ? netSales / checkCount : 0;

  const hourlyLaborCost = money(laborResult.laborCost);
  const totalLaborHours = money(laborResult.totalHours);

  const hourlyLaborPercent =
    netSales > 0
      ? (hourlyLaborCost / netSales) * 100
      : 0;

  const salesPerLaborHour =
    totalLaborHours > 0
      ? netSales / totalLaborHours
      : 0;

  return {
    service: "Cafe Bartique Executive Dashboard",
    status: "Connected",
    source: "Toast REST API - ordersBulk + labor timeEntries",
    businessDate,
    generatedAt: new Date().toISOString(),

    sales: {
      grossSales: roundCurrency(grossSales),
      netSales: roundCurrency(netSales),
      taxes: roundCurrency(taxes),
      tips: roundCurrency(tips),
      discounts: roundCurrency(discounts),
      refunds: roundCurrency(refunds),
      orderCount: orders.length,
      checkCount,
      averageTicket: roundCurrency(averageTicket),
    },

    orderMix: {
      dineIn: {
        orders: orderMix.dineIn.orders,
        sales: roundCurrency(orderMix.dineIn.sales),
      },
      takeout: {
        orders: orderMix.takeout.orders,
        sales: roundCurrency(orderMix.takeout.sales),
      },
      delivery: {
        orders: orderMix.delivery.orders,
        sales: roundCurrency(orderMix.delivery.sales),
      },
      other: {
        orders: orderMix.other.orders,
        sales: roundCurrency(orderMix.other.sales),
      },
    },

    topItems,
    topModifiers,

    labor: {
      available: true,
      source: "Toast Labor Time Entries",
      businessDate,
      employeeCount: laborResult.employeeCount,
      timeEntryCount: laborResult.timeEntryCount,
      regularHours: laborResult.regularHours,
      overtimeHours: laborResult.overtimeHours,
      totalHours: laborResult.totalHours,
      hourlyLaborCost: roundCurrency(hourlyLaborCost),
      hourlyLaborPercent: roundCurrency(hourlyLaborPercent),
      salesPerLaborHour: roundCurrency(salesPerLaborHour),
      incompleteEntries: laborResult.incompleteEntries,
      autoClockOuts: laborResult.autoClockOuts,
      note:
        "Hourly labor only. Salaried labor is not included when Toast returns a null hourly wage.",
    },

    inventory: {
      available: false,
      message: "Inventory integration not implemented yet.",
    },
  };
}

export async function executiveDashboard(
  c: Context<{ Bindings: Env }>
) {
  try {
    const requestedBusinessDate =
      c.req.query("businessDate");

    const businessDate =
      requestedBusinessDate &&
      /^\d{8}$/.test(requestedBusinessDate)
        ? requestedBusinessDate
        : getYesterdayBusinessDate();

    const result = await buildExecutiveDashboard(
      c.env,
      businessDate
    );

    return c.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown dashboard error";

    return c.json(
      {
        service: "Cafe Bartique Executive Dashboard",
        status: "Error",
        connected: false,
        message,
      },
      500
    );
  }
}