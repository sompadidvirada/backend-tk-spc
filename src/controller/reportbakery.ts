import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const getBakeryFullReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { startDate, endDate, branchId } = req.body;

  if (!startDate || !endDate || !branchId) {
    console.log(req.body);
    return res.status(400).json({ message: `Empty values provided.` });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  // 1. Create a base condition just for the branch
  const baseCondition: any = {};
  if (branchId !== "all") {
    baseCondition.branchId = Number(branchId);
  }

  try {
    // 2. Fetch each table using its own specific date field
    const [sales, shipments, expired] = await Promise.all([
      prisma.track_bakery_sell.findMany({
        where: { ...baseCondition, sold_at: { gte: start, lte: end } },
        include: { bakery_detail: { include: { bakeryCategory: true } } },
      }),
      prisma.track_bakery_send.findMany({
        where: { ...baseCondition, send_at: { gte: start, lte: end } },
        include: { bakery_detail: { include: { bakeryCategory: true } } },
      }),
      prisma.track_bakery_exp.findMany({
        where: { ...baseCondition, exp_at: { gte: start, lte: end } },
        include: { bakery_detail: { include: { bakeryCategory: true } } },
      }),
    ]);

    // 3. Aggregate data using a Map
    const reportMap = new Map<number, any>();

    const getRecord = (item: any) => {
      if (!reportMap.has(item.bakery_detailId)) {
        reportMap.set(item.bakery_detailId, {
          id: item.bakery_detailId,
          name: item.bakery_detail.name,
          image: item.bakery_detail.image,
          price: item.bakery_detail.price,
          sell_price: item.bakery_detail.sell_price,
          category: item.bakery_detail.bakeryCategory.name,
          sell: { qty: 0, total_cost: 0, total_revenue: 0 },
          send: { qty: 0, total_cost: 0, total_revenue: 0 },
          exp: { qty: 0, total_cost: 0, total_revenue: 0 },
        });
      }
      return reportMap.get(item.bakery_detailId);
    };

    sales.forEach((s) => {
      const rec = getRecord(s);
      rec.sell.qty += s.quantity;
      rec.sell.total_cost += s.quantity * s.price;
      rec.sell.total_revenue += s.quantity * s.sell_price;
    });

    shipments.forEach((s) => {
      const rec = getRecord(s);
      rec.send.qty += s.quantity;
      rec.send.total_cost += s.quantity * s.price;
      rec.send.total_revenue += s.quantity * s.sell_price;
    });

    expired.forEach((e) => {
      const rec = getRecord(e);
      rec.exp.qty += e.quantity;
      rec.exp.total_cost += e.quantity * e.price;
      rec.exp.total_revenue += e.quantity * e.sell_price;
    });
    const finalReport = Array.from(reportMap.values()).map((item) => {
      const calcPercent =
        item.send.total_cost > 0
          ? (item.exp.total_cost / item.send.total_cost) * 100
          : 0;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        image: item.image,
        price: item.price,
        sell_price: item.sell_price,
        percentExp: Number(calcPercent.toFixed(2)), // e.g., 5.25
        sell: item.sell,
        send: item.send,
        exp: item.exp,
      };
    });

    return res.status(200).json(finalReport);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server error` });
  }
};

