import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";
import {
  startOfDay,
  format,
  subDays,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
const timeZone = "Asia/Vientiane";

// for staff

export const insertBakeryOrder = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { order_set, order_at, bakery_detailId, branchId } = req.body;
  if (!order_set || !order_at || !bakery_detailId || !branchId) {
    return res.status(400).json({ message: `emty value.` });
  }
  const normalizedate = new Date(order_at);
  normalizedate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.order_bakery.create({
      data: {
        order_set: Number(order_set),
        order_at: normalizedate,
        bakery_detailId: Number(bakery_detailId),
        branchId: Number(branchId),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const insertManyBakeryOrders = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { orders } = req.body;

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ message: "No data provided." });
  }

  try {
    // Process the data to ensure types and dates are correct
    const dataToInsert = orders.map((item: any) => {
      const normalizedDate = new Date(item.order_at);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      return {
        order_set: Number(item.order_set),
        order_at: normalizedDate,
        bakery_detailId: Number(item.bakery_detailId),
        branchId: Number(item.branchId),
      };
    });

    // Use createMany for high performance
    const result = await prisma.order_bakery.createMany({
      data: dataToInsert,
      skipDuplicates: true, // Optional: prevents error if same record exists
    });

    return res.status(200).json({
      message: "Success",
      count: result.count,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error during batch insert." });
  }
};

export const getBakeryHistory_L1_L2_L3 = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, order_at, supplyerId } = req.body;

  if (!branchId || !order_at || !supplyerId) {
    return res
      .status(400)
      .json({ message: "branchId and order_at are required." });
  }
  const localDate = startOfDay(toZonedTime(order_at, timeZone));
  const dayName = format(localDate, "EEEE");
  if (dayName !== "Wednesday" && dayName !== "Saturday") {
    return res
      .status(400)
      .json({ message: "Only Wednesday or Saturday allowed." });
  }

  try {
    const checkSupplyer = await prisma.supplyer_bakery.findUnique({
      where: {
        id: Number(supplyerId),
      },
    });
    const weekRanges: { start: Date; end: Date }[] = [];
    const createRange = (s: number, e: number) => ({
      start: startOfDay(subDays(localDate, s)),
      end: endOfDay(subDays(localDate, e)),
    });

    if (checkSupplyer?.order_range === 3) {
      if (dayName === "Wednesday") {
        weekRanges.push(
          createRange(4, 1),
          createRange(7, 5),
          createRange(11, 8),
        );
      } else {
        weekRanges.push(
          createRange(3, 1),
          createRange(7, 4),
          createRange(10, 8),
        );
      }
    } else if (checkSupplyer?.order_range === 7) {
      weekRanges.push(
        createRange(7, 1),
        createRange(14, 8),
        createRange(22, 15),
      );
    }

    const activeItems = await prisma.available_bakery_branch.findMany({
      where: {
        branchId: Number(branchId),
        bakery_detail: {
          supplyer_bakeryId: Number(supplyerId),
        },
      },
      select: { bakery_detailId: true },
    });

    const bakeryIds = activeItems.map((item) => item.bakery_detailId);

    // Standardized fetcher
    const fetchStats = async (model: any, dateField: string) => {
      return Promise.all(
        weekRanges.map((range) =>
          model.groupBy({
            by: ["bakery_detailId"],
            where: {
              branchId: Number(branchId),
              bakery_detailId: { in: bakeryIds },
              [dateField]: { gte: range.start, lte: range.end },
            },
            _sum: { quantity: true },
          }),
        ),
      );
    };

    const [sends, sells, exps] = await Promise.all([
      fetchStats(prisma.track_bakery_send, "send_at"),
      fetchStats(prisma.track_bakery_sell, "sold_at"),
      fetchStats(prisma.track_bakery_exp, "exp_at"),
    ]);

    const finalResults = bakeryIds.map((id) => {
      const itemData: any = { bakery_detailId: id, branchId: Number(branchId) };
      for (let i = 0; i < 3; i++) {
        // FIXED: Added optional chaining to prevent 'undefined' error
        itemData[`L${i + 1}_Send`] =
          sends[i]?.find((s: any) => s.bakery_detailId === id)?._sum
            ?.quantity || 0;
        itemData[`L${i + 1}_Sell`] =
          sells[i]?.find((s: any) => s.bakery_detailId === id)?._sum
            ?.quantity || 0;
        itemData[`L${i + 1}_Exp`] =
          exps[i]?.find((s: any) => s.bakery_detailId === id)?._sum?.quantity ||
          0;
      }
      return itemData;
    });
    return res.status(200).json(finalResults);
  } catch (err) {
    console.error("Bakery History Error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getBakeryOrder = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, order_at } = req.body;
  if (!branchId || !order_at) {
    return res.status(400).json({ message: `emty value.` });
  }
  if (!branchId || !order_at) {
    return res
      .status(400)
      .json({ message: "branchId and order_at are required." });
  }
  const normalizedate = new Date(order_at);
  normalizedate.setUTCHours(0, 0, 0, 0);
  const localDate = toZonedTime(new Date(order_at), timeZone);
  const dayName = format(localDate, "EEEE");

  // Determine days to subtract: 4 if Wednesday, else 3
  const daysToSubtract = dayName === "Wednesday" ? 4 : 3;
  const previousDate = subDays(normalizedate, daysToSubtract);

  try {
    const [currentOrders, previousOrders] = await Promise.all([
      prisma.order_bakery.findMany({
        where: {
          order_at: normalizedate,
          branchId: Number(branchId),
        },
        include: {
          bakery_detail: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.order_bakery.findMany({
        where: {
          order_at: previousDate,
          branchId: Number(branchId),
        },
      }),
    ]);
    return res.status(200).json({
      current: currentOrders,
      previous: previousOrders,
      metadata: {
        currentDate: normalizedate,
        previousDate: previousDate,
        dayName: dayName,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateBakeryOrder = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { order_set } = req.body;
  if (!id || !order_set) {
    return res.status(400).json({ message: `emty value` });
  }

  try {
    const ress = await prisma.order_bakery.update({
      where: {
        id: Number(id),
      },
      data: {
        order_set: Number(order_set),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const deleteOrderBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.order_bakery.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateConfirmSttAdmin = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { admin_confirm_stt } = req.body;

  if (!id || admin_confirm_stt === undefined) {
    return res.status(400).json({ message: `emty value.` });
  }
  const io = req.app.get("io");
  try {
    const ress = await prisma.confirm_order_bakery.update({
      where: {
        id: Number(id),
      },
      data: {
        admin_confirm_stt: admin_confirm_stt,
      },
    });
    io.emit("admin_confirm_stt", ress);
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const trackingOrderBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { track_date } = req.body;

  if (!track_date) {
    return res.status(400).json({ message: "empty value." });
  }

  const normalizeDate = new Date(track_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    const branches = await prisma.branch.findMany({
      include: {
        order_bakery: {
          where: {
            order_at: normalizeDate,
          },
        },
        confirm_order_bakery: {
          where: {
            confirm_date: normalizeDate,
          },
        },
      },
    });

    const response = branches.map((branch) => {
      const totalItemsOrdered = branch.order_bakery.reduce(
        (sum, item) => sum + item.order_set,
        0,
      );

      const changedItemsCount = branch.order_bakery.reduce((count, item) => {
        if (item.order_want !== 0 && item.order_want !== item.order_set) {
          return count + 1;
        }
        return count;
      }, 0);

      const confirm = branch.confirm_order_bakery[0];

      return {
        branchId: branch.id,
        branchName: branch.name,
        changedItemsCount,
        totalItemsOrdered,
        baristar_confirm_stt: confirm?.baristar_confirm_stt ?? false,
        admin_confirm_stt: confirm?.admin_confirm_stt ?? false,
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
};

export const getBakeryOrderToPrint = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { order_at, supplyerId } = req.body;

  if (!order_at || !supplyerId) {
    return res.status(400).json({ message: "Please provide order_at date." });
  }

  const normalizeDate = new Date(order_at);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    // 1. Fetch all orders for that date including branch and bakery details
    const orders = await prisma.order_bakery.findMany({
      where: {
        order_at: normalizeDate,
        bakery_detail: {
          supplyer_bakeryId: Number(supplyerId)
        }
      },
      include: {
        branch: { select: { id: true, name: true } },
        bakery_detail: {
          select: {
            id: true,
            name: true,
            bakeryCategory: { select: { name: true } },
          },
        },
      },
      orderBy: [{ branch: { id: "asc" } }, { bakery_detail: { bakery_categoryId: "asc" } }],
    });

    // 2. Identify all unique branches and bakery details present in the orders
    const branches = Array.from(
      new Map(orders.map((o) => [o.branch.id, o.branch])).values(),
    );
    const bakeryItems = Array.from(
      new Map(
        orders.map((o) => [o.bakery_detail.id, o.bakery_detail]),
      ).values(),
    );

    // 3. Build the Matrix (Pivot Table)
    const tableData = bakeryItems.map((bakery) => {
      const row: any = {
        bakeryName: bakery.name,
        bakeryId: bakery.id,
        categotyName: bakery.bakeryCategory.name,
        total: 0,
      };

      // Fill in order_set for each branch
      branches.forEach((branch) => {
        const order = orders.find(
          (o) => o.bakery_detailId === bakery.id && o.branchId === branch.id,
        );
        const value = order ? order.order_set : 0;
        row[`branch_${branch.id}`] = value;
        row.total += value;
      });

      return row;
    });

    // 4. Return both the structured data and the headers (branches) for the frontend
    return res.status(200).json({
      date: normalizeDate,
      branches, // Use this for table headers
      tableData, // Use this for table rows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

// for baristar

export const updateOrderWant = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { order_want } = req.body;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.order_bakery.update({
      where: {
        id: Number(id),
      },
      data: {
        order_want: Number(order_want),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `serve error.` });
  }
};

export const updateConfirmBaristar = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { confirm_date, barista_confirm_stt, branchId } = req.body;
  if (!confirm_date || barista_confirm_stt === undefined || !branchId) {
    return res.status(400).json({ message: `emty value.` });
  }
  const normalizedate = new Date(confirm_date);
  normalizedate.setUTCHours(0, 0, 0, 0);
  const io = req.app.get("io");
  try {
    const ress = await prisma.confirm_order_bakery.upsert({
      where: {
        branchId_confirm_date: {
          confirm_date: normalizedate,
          branchId: Number(branchId),
        },
      },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
      update: {
        baristar_confirm_stt: barista_confirm_stt,
      },
      create: {
        confirm_date: normalizedate,
        admin_confirm_stt: false,
        branchId: Number(branchId),
        baristar_confirm_stt: barista_confirm_stt,
      },
    });
    io.emit("baristar_confirm_stt", {
      data: ress,
      date: confirm_date,
      branchName: ress.branch.name,
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const checkConfirmStt = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { confirm_date, branchId } = req.body;
  if (!confirm_date || !branchId) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizedate = new Date(confirm_date);
  normalizedate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.confirm_order_bakery.findFirst({
      where: {
        confirm_date: normalizedate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json();
  }
};

export const getSendAndExp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date } = req.body;

  if (!branchId || !date) {
    return res.status(400).json({ message: "Empty value" });
  }

  try {
    const requestDate = new Date(date);
    const firstDay = startOfMonth(requestDate);
    const lastDay = endOfMonth(requestDate);

    // 1. Fetch data in parallel
    const [sendData, expData] = await Promise.all([
      prisma.track_bakery_send.findMany({
        where: {
          branchId: Number(branchId),
          send_at: { gte: firstDay, lte: lastDay },
        },
        select: { quantity: true, price: true },
      }),
      prisma.track_bakery_exp.findMany({
        where: {
          branchId: Number(branchId),
          exp_at: { gte: firstDay, lte: lastDay },
        },
        select: { quantity: true, price: true },
      }),
    ]);

    // 2. Calculate Totals
    const totalSendAmount = sendData.reduce(
      (acc, curr) => acc + curr.quantity * curr.price,
      0,
    );
    const totalExpAmount = expData.reduce(
      (acc, curr) => acc + curr.quantity * curr.price,
      0,
    );

    const totalSendQty = sendData.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalExpQty = expData.reduce((acc, curr) => acc + curr.quantity, 0);

    // 3. Calculate Percentage
    // Handle division by zero if totalSendAmount is 0
    const expPercent =
      totalSendAmount > 0 ? (totalExpAmount / totalSendAmount) * 100 : 0;

    return res.status(200).json({
      success: true,
      branchId,
      period: format(requestDate, "MMMM yyyy"),
      data: {
        send: {
          quantity: totalSendQty,
          amount: totalSendAmount,
        },
        expired: {
          quantity: totalExpQty,
          amount: totalExpAmount,
        },
        // We fix the decimals to 2 places for a clean UI
        loss_rate_percent: Number(expPercent.toFixed(2)),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
