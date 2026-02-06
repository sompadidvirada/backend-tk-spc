import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const reportSellForlineGrap = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: `emty value.` });
  }
  const startDateNomalize = new Date(startDate);
  const endDateNormalize = new Date(endDate);
  startDateNomalize.setUTCHours(0, 0, 0, 0);
  endDateNormalize.setUTCHours(0, 0, 0, 0);
  try {
    // 1. Fetch all sales within the date range, including branch names
    const sales = await prisma.track_bakery_sell.findMany({
      where: {
        sold_at: {
          gte: startDateNomalize,
          lte: endDateNormalize,
        },
      },
      include: {
        branch: true,
      },
      orderBy: {
        sold_at: "asc",
      },
    });

    // 1. Get all unique branch names to set defaults to 0
    const allBranches = await prisma.branch.findMany({
      select: { name: true },
    });

    // 2. Generate every date between Start and End
    const chartMap = new Map();
    let currentDate = new Date(startDateNomalize);
    const lastDate = new Date(endDateNormalize);

    while (currentDate <= lastDate) {
      const dateKey = currentDate.toISOString().split("T")[0];

      // Initialize the day with 0 for all branches
      const dayData: any = { date: dateKey };
      allBranches.forEach((b) => {
        dayData[b.name] = 0;
      });

      chartMap.set(dateKey, dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 3. Merge actual sales into the map
    sales.forEach((record) => {
      const dateKey = record.sold_at.toISOString().split("T")[0];
      const branchName = record.branch.name;
      const totalRevenue = record.quantity * record.sell_price;

      if (chartMap.has(dateKey)) {
        chartMap.get(dateKey)[branchName] += totalRevenue;
      }
    });

    return res.status(200).json(Array.from(chartMap.values()));
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const reportSellForlineGrapBakeryName = async (req: Request, res: Response): Promise<Response> => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ message: `Empty values.` });

  const startDateNomalize = new Date(startDate);
  const endDateNormalize = new Date(endDate);
  startDateNomalize.setUTCHours(0, 0, 0, 0);
  endDateNormalize.setUTCHours(23, 59, 59, 999); 

  try {
    // 1. Fetch sales including bakery_detail to get the Name
    const sales = await prisma.track_bakery_sell.findMany({
      where: {
        sold_at: { gte: startDateNomalize, lte: endDateNormalize },
      },
      include: {
        bakery_detail: true, // Need this for the bakery name
      },
      orderBy: { sold_at: "asc" },
    });

    // 2. Get all bakery names to initialize 0 values
    const allBakeries = await prisma.bakery_detail.findMany({
      select: { name: true },
    });

    const chartMap = new Map();
    let currentDate = new Date(startDateNomalize);
    const lastDate = new Date(endDateNormalize);

    // 3. Initialize every date with 0 for every bakery
    while (currentDate <= lastDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const dayData: any = { date: dateKey };
      
      allBakeries.forEach((bakery) => {
        dayData[bakery.name] = 0;
      });

      chartMap.set(dateKey, dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Merge quantities into the map by Bakery Name
    sales.forEach((record) => {
      const dateKey = record.sold_at.toISOString().split("T")[0];
      const bakeryName = record.bakery_detail.name;
      const quantitySold = record.quantity; // We use Quantity now, not Price

      if (chartMap.has(dateKey)) {
        chartMap.get(dateKey)[bakeryName] += quantitySold;
      }
    });

    return res.status(200).json(Array.from(chartMap.values()));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllBakeryTrackReport = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate)
    return res.status(400).json({ message: "Dates required" });

  // 1. Current Period Dates
  const currentStart = new Date(startDate);
  const currentEnd = new Date(endDate);

  // 2. Previous Month Dates (Method B)
  const prevStart = new Date(currentStart);
  prevStart.setMonth(prevStart.getMonth() - 1);

  const prevEnd = new Date(currentEnd);
  prevEnd.setMonth(prevEnd.getMonth() - 1);

  try {
    // Helper function to aggregate data
    const getAggregatedData = async (s: Date, e: Date) => {
      const [sell, send, exp] = await Promise.all([
        prisma.track_bakery_sell.findMany({
          where: { sold_at: { gte: s, lte: e } },
        }),
        prisma.track_bakery_send.findMany({
          where: { send_at: { gte: s, lte: e } },
        }),
        prisma.track_bakery_exp.findMany({
          where: { exp_at: { gte: s, lte: e } },
        }),
      ]);

      const sellTotal = sell.reduce(
        (acc, curr) => acc + curr.quantity * curr.sell_price,
        0,
      );
      const sendTotal = send.reduce(
        (acc, curr) => acc + curr.quantity * curr.price,
        0,
      );
      const expTotal = exp.reduce(
        (acc, curr) => acc + curr.quantity * curr.price,
        0,
      );

      // Calculate percentage: How much of what we sent was wasted?
      // We use a ternary check to handle the "0 send" case
      const wastePercentage = sendTotal > 0 ? (expTotal / sendTotal) * 100 : 0;

      return {
        sellTotal,
        sendTotal,
        expTotal,
        wastePercentage: Number(wastePercentage.toFixed(2)), // Keeps it to 2 decimal places (e.g., 5.25)
      };
    };
    // Execute both fetches in parallel
    const [current, previous] = await Promise.all([
      getAggregatedData(currentStart, currentEnd),
      getAggregatedData(prevStart, prevEnd),
    ]);

    // 3. Calculate Percentage Changes
    const calcChange = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    return res.status(200).json({
      current,
      previous,
      changes: {
        sell: calcChange(current.sellTotal, previous.sellTotal),
        send: calcChange(current.sendTotal, previous.sendTotal),
        exp: calcChange(current.expTotal, previous.expTotal),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
