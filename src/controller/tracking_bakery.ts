import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

// TRACKING SELL API FUCNTION

export const insertTracksell = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { bakeryId, branchId, sold_at, quantity, price, sell_price } =
      req.body;
    if (
      !bakeryId ||
      !branchId ||
      !sold_at ||
      !quantity ||
      !price ||
      !sell_price
    ) {
      return res.status(400).json({ message: `emty data.` });
    }
    const normalizedDate = new Date(sold_at);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const ress = await prisma.track_bakery_sell.create({
      data: {
        bakery_detailId: Number(bakeryId),
        branchId: Number(branchId),
        sold_at: normalizedDate,
        quantity: Number(quantity),
        price: Number(price),
        sell_price: Number(sell_price),
      },
    });
    return res.status(200).json({ message: `create success.`, data: ress });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const insertTracksellMany = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { items } = req.body;

    console.log(req.body);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "empty data." });
    }

    const data = items.map((item) => {
      const { bakeryId, branchId, sold_at, quantity, price, sell_price } = item;

      if (
        bakeryId == null ||
        branchId == null ||
        sold_at == null ||
        quantity == null ||
        price == null ||
        sell_price == null
      ) {
        throw new Error("invalid item data");
      }

      const normalizedDate = new Date(sold_at);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      return {
        bakery_detailId: Number(bakeryId),
        branchId: Number(branchId),
        sold_at: normalizedDate,
        quantity: Number(quantity),
        price: Number(price),
        sell_price: Number(sell_price),
      };
    });

    const result = await prisma.track_bakery_sell.createMany({
      data,
      skipDuplicates: true, // optional but recommended
    });

    return res.status(200).json({
      message: "create many success.",
      count: result.count,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getBakerySold = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { branchId, date } = req.body;
    const searchDate = new Date(date);
    searchDate.setUTCHours(0, 0, 0, 0);

    if (!branchId || !date) {
      return res.status(400).json({ message: `emty value.` });
    }
    const ress = await prisma.track_bakery_sell.findMany({
      where: {
        branchId: Number(branchId),
        sold_at: searchDate,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const editTrackSell = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!id || !quantity) {
    return res.status(400).json({ message: `emty value.` });
  }
  const ress = await prisma.track_bakery_sell.update({
    where: {
      id: Number(id),
    },
    data: {
      quantity: Number(quantity),
    },
  });
  try {
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteTrackSell = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    await prisma.track_bakery_sell.delete({
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

export const deleteAllTrackSell = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { date, branchId } = req.body;
  if (!date || !branchId) {
    return res.status(400).json({ message: `emty value.` });
  }
  const normalizedDate = new Date(date);

  const today = new Date();
  const sevendayAgo = new Date();
  sevendayAgo.setDate(today.getDate() - 3);

  if (normalizedDate < sevendayAgo) {
    return res
      .status(405)
      .json({ message: `ບໍ່ສາມາດລົບລາຍການທີຜ່ານໄປແລ້ວ 3 ວັນໄດ້` });
  }

  normalizedDate.setUTCHours(0, 0, 0, 0);
  try {
    await prisma.track_bakery_sell.deleteMany({
      where: {
        sold_at: normalizedDate,
        branchId: Number(branchId),
      },
    });

    return res.status(200).json({ message: `delete all tracking success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const uploadFileTrackSell = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date, items } = req.body;

  // 1. Basic Validation
  if (!branchId || !date || !items || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ message: "Missing required fields or invalid data format" });
  }
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  try {
    const result = await prisma.$transaction(
      items.map(
        (item: {
          bakery_detailId: number;
          quantity: number;
          price: number;
          sell_price: number;
        }) =>
          prisma.track_bakery_sell.upsert({
            where: {
              bakery_detailId_sold_at_branchId: {
                bakery_detailId: Number(item.bakery_detailId),
                sold_at: normalizedDate,
                branchId: Number(branchId),
              },
            },
            update: {
              quantity: Number(item.quantity),
            },
            create: {
              bakery_detailId: Number(item.bakery_detailId),
              quantity: Number(item.quantity),
              sold_at: normalizedDate,
              branchId: Number(branchId),
              price: Number(item.price),
              sell_price: Number(item.sell_price),
            },
          }),
      ),
    );

    return res.status(200).json({
      message: "Successfully synchronized data",
      data: result,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

// TRACKING SEND API FUCNTION

export const inertTracksend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { bakeryId, branchId, send_at, quantity, price, sell_price } = req.body;
  if (
    !bakeryId ||
    !branchId ||
    !send_at ||
    !quantity ||
    !price ||
    !sell_price
  ) {
    return res.status(400).json({ message: `emty data.` });
  }
  const normalizedDate = new Date(send_at);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.track_bakery_send.create({
      data: {
        bakery_detailId: Number(bakeryId),
        send_at: normalizedDate,
        branchId: Number(branchId),
        quantity: Number(quantity),
        price: Number(price),
        sell_price: Number(sell_price),
      },
    });
    return res
      .status(200)
      .json({ message: `create track send success.`, data: ress });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getBakerySend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date } = req.body;

  if (!date || !branchId) {
    return res.status(400).json({ message: `emty value.` });
  }
  const normallizeDate = new Date(date);
  normallizeDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.track_bakery_send.findMany({
      where: {
        send_at: normallizeDate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server erorr` });
  }
};

export const editTrackSend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!id || !quantity) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.track_bakery_send.update({
      where: {
        id: Number(id),
      },
      data: {
        quantity: Number(quantity),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteTrackSend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    await prisma.track_bakery_send.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete tracking send success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteAllTrackSend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date } = req.body;
  if (!branchId || !date) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizeDate = new Date(date);

  const today = new Date();
  const sevendayAgo = new Date();
  sevendayAgo.setDate(today.getDate() - 7);

  if (normalizeDate < sevendayAgo) {
    return res.status(405).json({ message: `ບໍ່ສາມາດລົບຍ້ອນຫຼັງການ 7 ວັນໄດ້` });
  }

  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    await prisma.track_bakery_send.deleteMany({
      where: {
        send_at: normalizeDate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json({ message: `delete all the track succcess!!` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const uploadTrackSend = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date, items } = req.body;

  // 1. Basic Validation
  if (!branchId || !date || !items || !Array.isArray(items)) {
    return res
      .status(400)
      .json({ message: "Missing required fields or invalid data format" });
  }
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  try {
    const result = await prisma.$transaction(
      items.map(
        (item: {
          bakery_detailId: number;
          quantity: number;
          price: number;
          sell_price: number;
        }) =>
          prisma.track_bakery_send.upsert({
            where: {
              bakery_detailId_send_at_branchId: {
                bakery_detailId: Number(item.bakery_detailId),
                send_at: normalizedDate,
                branchId: Number(branchId),
              },
            },
            update: {
              quantity: Number(item.quantity),
            },
            create: {
              bakery_detailId: Number(item.bakery_detailId),
              quantity: Number(item.quantity),
              send_at: normalizedDate,
              branchId: Number(branchId),
              price: Number(item.price),
              sell_price: Number(item.sell_price),
            },
          }),
      ),
    );
    return res
      .status(200)
      .json({ message: "Upload tracking send success.", data: result });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

// TRACKING EXP BAKERY API FUNCTION

export const insertTrackExp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { bakeryId, branchId, exp_at, quantity, price, sell_price } = req.body;
  if (!bakeryId || !branchId || !exp_at || !quantity || !price || !sell_price) {
    return res.status(400).json({ message: `emty data.` });
  }
  const normalizedDate = new Date(exp_at);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.track_bakery_exp.create({
      data: {
        bakery_detailId: Number(bakeryId),
        exp_at: normalizedDate,
        branchId: Number(branchId),
        quantity: Number(quantity),
        price: Number(price),
        sell_price: Number(sell_price),
      },
    });
    return res
      .status(200)
      .json({ message: "insert track exp success.", data: ress });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getTrackingExp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date } = req.body;
  if (!branchId || !date) {
    return res.status(400).json({ message: `emty data.` });
  }
  const normalizeDate = new Date(date);
  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.track_bakery_exp.findMany({
      where: {
        exp_at: normalizeDate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteTrackExp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    await prisma.track_bakery_exp.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `emty value.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const deleteAllTrackExp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, date } = req.body;

  if (!branchId || !date) {
    return res.status(400).json({ message: `emty value.` });
  }

  const nomalizeDate = new Date(date);
  nomalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    const ress = await prisma.track_bakery_exp.deleteMany({
      where: {
        exp_at: nomalizeDate,
        branchId: Number(branchId),
      },
    });
    return res
      .status(200)
      .json({ message: "delete all tracking exp success." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
// BAKERYS TO INSERT

export const getAvailableBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { branchId, supplyerId } = req.body;

    const whereClause: any = {
      available_bakery_branch: {
        some: {
          branchId: Number(branchId),
        },
      },
    };

    // 2. Conditionally add supplyerId if it exists
    if (supplyerId) {
      whereClause.supplyer_bakeryId = Number(supplyerId);
    }

    // 3. Execute the query
    const data = await prisma.bakery_detail.findMany({
      where: whereClause,
      orderBy: {
        bakery_categoryId: "asc",
      },
    });

    return res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "server error" });
  }
};
